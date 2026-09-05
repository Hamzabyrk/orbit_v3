-- v1.2-16 · Kilit, üyelikle aynı işlemde yazılır
--
-- Kapsam turunun 8 ve 17 numaralı bulguları.
--
-- `create-member` üyeliği oluşturduktan SONRA `profiles`'a ayrı bir UPDATE ile
-- kilidi koyuyordu. O UPDATE başarısız olduğunda fonksiyon **201 Created**
-- döndürüyor, `password_lock_set: false` bildiriyor ve devam ediyordu. Sonuç:
-- üye var, geçici şifresi çalışıyor, **değiştirmesi gerekmiyor ve şifre hiç
-- bitmiyor.** Kâğıt fişten okunan bir şifre kalıcı kimlik bilgisine dönüşüyordu.
--
-- Yanıt bunu dürüstçe bildiriyordu ve `CredentialsPanel` yöneticiye
-- gösteriyordu — ama **bildirmek bir onarım değildir.** Yöneticinin
-- yapabileceği tek şey şifreyi yeniden sıfırlamaktı, o da aynı biçimde
-- başarısız olabilirdi.
--
-- Çözüm kilidi aynı işleme almak. `internal_create_membership` zaten
-- `public.profiles`'a yazıyordu; kilit oraya taşındı. Artık **üyelik varsa
-- kilit de vardır** — arada başarısız olabilecek bir adım yok.
--
-- ---------------------------------------------------------------------------
-- Neden yalnızca bu fonksiyon
-- ---------------------------------------------------------------------------
--
-- Aynı kalıp dört Edge Function'ın dördünde de var, ama üçünde bu çözüm
-- **mümkün değil**:
--
--   * `reset-admin-password` ve `reset-member-password` şifreyi GoTrue'nun
--     admin API'siyle değiştiriyor. `on_auth_password_changed` o güncellemede
--     çalışıp bayrağı düşürdüğü için kilit şifre değişiminden SONRA yazılmak
--     ZORUNDA — sıra bir tercih değil, kısıt. GoTrue çağrısı bizim SQL
--     işlemimize de giremiyor.
--   * `bootstrap-organization` teknik olarak aynı yolu izleyebilirdi ama
--     `internal_bootstrap_organization` bugün `profiles`'a hiç dokunmuyor;
--     kilidi oraya taşımak 96 satırlık bir RPC'yi yeniden yazmayı gerektirirdi
--     ve o akış yalnızca platform operatörüne açık, düşük hacimli ve hata
--     ekranda anında görünüyor.
--
-- Üçü için karşılık `_shared/passwordLock.ts`: yazma sınırlı sayıda yeniden
-- deneniyor ve sonuç yine dürüstçe bildiriliyor. Tam atomiklik yerine
-- **geçici hatanın kalıcı açığa dönüşmemesi** hedefleniyor.
--
-- ---------------------------------------------------------------------------
-- İmza değişiyor: drop + create
-- ---------------------------------------------------------------------------
--
-- `create or replace` parametre ekleyemez; farklı imza bir AŞIRI YÜKLEME
-- yaratır ve PostgREST hangi sürümü çağıracağına ada bakarak karar veremezdi.
-- Bu yüzden eski imza düşürülüp yenisi kuruluyor. `drop function` veri kaybı
-- üretmez — yıkıcı migration kontrolünün engellediği ifadeler arasında
-- bulunmamasının sebebi de bu.

drop function if exists public.internal_create_membership(
  uuid, uuid, uuid, uuid, integer, public.app_role, text, text
);

create or replace function public.internal_create_membership(
  caller_user_id uuid,
  member_user_id uuid,
  organization_id uuid,
  branch_id uuid,
  person_code integer,
  member_role public.app_role,
  member_full_name text,
  login_number text,
  -- Geçici şifrenin bitişi. Ömür sabiti `_shared/temporaryPassword.ts`'te
  -- yaşıyor ve tek kaynak orası (K-06); buraya değer olarak geçiyor.
  -- `default null` bilinçli: bu parametreyi geçmeyen eski bir çağrı da
  -- çözülür ve `must_change_password` yine set edilir — yani sözleşme
  -- genişlerken kilit hiçbir anda kaybolmaz.
  password_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_membership_id uuid;
begin
  -- İki RPC ayrı HTTP çağrılarıdır; ikinci çağrı tek başına yapılabileceği için
  -- çağıran yönetici, kurum ve şube burada yeniden doğrulanır.
  if not exists (
    select 1
    from public.organization_memberships as administrator
    where administrator.user_id = caller_user_id
      and administrator.organization_id = internal_create_membership.organization_id
      and administrator.role = 'admin'
      and administrator.status = 'active'
  ) then
    raise exception 'caller is not an active organization administrator'
      using errcode = '42501';
  end if;

  if internal_create_membership.branch_id is not null
     and not exists (
       select 1
       from public.branches as branch
       where branch.id = internal_create_membership.branch_id
         and branch.organization_id = internal_create_membership.organization_id
     ) then
    raise exception 'branch does not belong to organization'
      using errcode = '42501';
  end if;

  -- Mevcut kullanıcıyı bağlamak, görünen adını sessizce değiştirebilir ve
  -- başka bir kurumun kimliğini bu kuruma taşıyabilir. Meşru akışta auth
  -- kullanıcısı yenidir ve hiçbir üyeliği yoktur.
  if exists (
    select 1
    from public.organization_memberships as existing_membership
    where existing_membership.user_id = internal_create_membership.member_user_id
  ) then
    raise exception 'member user already has a membership'
      using errcode = '42501';
  end if;

  -- Yönetici oluşturma kararı bu RPC'nin kapsamı değildir; yalnızca üye rolleri
  -- Edge Function şemasında değil, güvenlik sınırı olan SQL'de de engellenir.
  if member_role = 'admin' then
    raise exception 'admin membership cannot be created here'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from auth.users where id = internal_create_membership.member_user_id
  ) then
    raise exception 'member user does not exist' using errcode = '23503';
  end if;

  -- **Kilit burada set ediliyor, ayrı bir çağrıda değil.** Öncesinde
  -- `create-member` üyeliği yazdıktan SONRA `profiles`'a ikinci bir UPDATE
  -- atıyordu; o UPDATE başarısız olursa üye oluşuyor, geçici şifresi
  -- çalışıyor ve **hiç değiştirilmesi gerekmiyordu** — kâğıt fişteki şifre
  -- kalıcı bir kimlik bilgisine dönüşüyordu. Yanıt bunu bildiriyordu ama
  -- bildirmek bir onarım değil.
  --
  -- Aynı işlemde yazılınca o pencere kapanıyor: üyelik varsa kilit de vardır.
  --
  -- Sıra güvenli: bu RPC `admin.createUser` DÖNDÜKTEN sonra çağrılıyor ve
  -- `on_auth_password_changed` yalnızca `auth.users` üzerinde bir şifre
  -- GÜNCELLEMESİNDE çalışıyor. Dolayısıyla kilidi düşürebilecek bir tetikleyici
  -- bundan sonra çalışmıyor.
  insert into public.profiles (
    id, display_name, must_change_password, password_expires_at
  )
  values (
    member_user_id,
    trim(member_full_name),
    true,
    internal_create_membership.password_expires_at
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    must_change_password = true,
    password_expires_at = excluded.password_expires_at;

  insert into public.organization_memberships (
    organization_id, branch_id, user_id, role, status, person_code
  )
  values (
    organization_id, branch_id, member_user_id, member_role, 'active', person_code
  )
  returning id into new_membership_id;

  insert into public.audit_events (
    organization_id, branch_id, actor_user_id, action, entity_type, entity_id, metadata
  )
  values (
    organization_id,
    branch_id,
    caller_user_id,
    'membership.created',
    'organization_membership',
    new_membership_id,
    jsonb_build_object('login_number', login_number, 'role', member_role::text)
  );

  return new_membership_id;
end;
$$;

-- Düşürülen fonksiyonla birlikte yetkileri de gitti; yeniden kuruluyor.
revoke all on function public.internal_create_membership(
  uuid, uuid, uuid, uuid, integer, public.app_role, text, text, timestamptz
) from public, anon, authenticated;

grant execute on function public.internal_create_membership(
  uuid, uuid, uuid, uuid, integer, public.app_role, text, text, timestamptz
) to service_role;
