-- v1.4-17 · Hesap değiştirmek bir oturum açmaktır
--
-- İlk PR bağı kurdu: iki hesap, iki taraflı kanıtla aynı `people` satırına
-- bağlanıyor. Bu PR bağın **karşılığını** getiriyor — düğmeye basınca ikinci
-- hesabın oturumu açılıyor, şifre sorulmadan (2026-08-25 kararı).
--
-- =========================================================================
-- Bu, deponun en hassas yüzeyi
-- =========================================================================
--
-- Buradan dönen şey bir liste ya da bir sayı değil: **başka bir hesabın
-- oturumunu açma izni**. Yanlış bir `true`, veli hesabının yönetici paneline
-- girmesi demektir.
--
-- Bu yüzden kural Edge Function'da değil **burada** duruyor. Ev kuralı
-- (v1.4-07): `service_role` RLS'i baypas ediyor, dolayısıyla o sınır hiçbir
-- politikadan geçmiyor ve **test edilebilir bir yerde** olmak zorunda —
-- orası pgTAP'in görebildiği SQL. Edge Function ince bir kabuk olarak kalıyor.
--
-- Ölçüldü (2026-09-14, yerel yığında): `admin.generateLink` sentetik
-- `@orbit.invalid` adresleriyle **çalışıyor** ve `hashed_token` döndürüyor;
-- `auth/v1/verify` onu tam bir oturuma (access + refresh) çeviriyor. Tasarımın
-- bu yarısı varsayım değil, ölçüm.
--
-- ⚠️ Aynı ölçüm bir şey daha gösterdi: `generateLink` yanıtı **6 haneli bir
-- `email_otp`** de taşıyor. Bu yüzden Edge Function jetonu istemciye
-- geçirmiyor; `verify`'ı kendisi yapıp yalnız oturumu döndürüyor. Tarayıcıya
-- ulaşmayan bir sır tekrar oynatılamaz.

create or replace function public.internal_begin_account_switch(
  caller_user_id uuid,
  target_user_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  hedef_eposta text;
  hedef_kurum record;
begin
  if caller_user_id is null or target_user_id is null then
    raise exception 'caller and target are required' using errcode = '42501';
  end if;

  -- Kendine geçiş: istek anlamsız ve bir hata belirtisi. Sessizce başarı
  -- dönmek, çağıranın yanlış hesabı gönderdiğini gizlerdi.
  if caller_user_id = target_user_id then
    raise exception 'cannot switch to the same account' using errcode = '42501';
  end if;

  -- Çağıranın kilidi: geçici şifresini değiştirmemiş bir hesap zaten hiçbir
  -- şey okuyamıyor (politikaların tamamı `current_user_must_change_password`
  -- ile kapalı). Oturum açabilmesi o kuralın etrafından dolaşmak olurdu.
  if exists (
    select 1 from public.profiles as cagiran
    where cagiran.id = caller_user_id and cagiran.must_change_password
  ) then
    raise exception 'caller must change password first' using errcode = '42501';
  end if;

  -- **Asıl kapı.** İki hesap aynı kişi kaydına bağlı olmak zorunda. `person_id`
  -- NULL ise eşleşme olmaz: `NULL = NULL` bir satır döndürmez (v1.4-17'nin ilk
  -- PR'ında mutasyonla ölçüldü) — yani bugün üretimdeki herkes için burası
  -- kapalı ve öyle kalmalı.
  if not exists (
    select 1
    from public.profiles as cagiran
    join public.profiles as hedef
      on hedef.person_id = cagiran.person_id
    where cagiran.id = caller_user_id
      and hedef.id = target_user_id
  ) then
    raise exception 'accounts are not linked' using errcode = '42501';
  end if;

  -- Hedefin aktif üyeliği yoksa açılacak bir panel de yok.
  select uyelik.organization_id, uyelik.branch_id
    into hedef_kurum
    from public.organization_memberships as uyelik
   where uyelik.user_id = target_user_id
     and uyelik.status = 'active'
   limit 1;

  if not found then
    raise exception 'target account has no active membership'
      using errcode = '42501';
  end if;

  select kullanici.email into hedef_eposta
    from auth.users as kullanici
   where kullanici.id = target_user_id;

  if hedef_eposta is null then
    raise exception 'target account has no login address'
      using errcode = '23503';
  end if;

  -- İz hedefin kurumuna yazılıyor: "bu hesaba kim, ne zaman girdi" sorusu o
  -- kurumun yöneticisinin sorusudur. Fail parametreyle geliyor çünkü
  -- `service_role` bağlamında `auth.uid()` boştur (v1.4-07'de ölçüldü).
  insert into public.audit_events (
    organization_id, branch_id, actor_user_id,
    action, entity_type, entity_id, metadata
  )
  values (
    hedef_kurum.organization_id,
    hedef_kurum.branch_id,
    caller_user_id,
    'person.account_switched',
    'profile',
    target_user_id,
    jsonb_build_object('from_user_id', caller_user_id)
  );

  return hedef_eposta;
end;
$$;

comment on function public.internal_begin_account_switch(uuid, uuid) is
  'Hesaplar arası geçişin GÜVENLİK KARARI. Çağıran ile hedef AYNI kişi kaydına bağlı değilse reddeder (42501); kendine geçiş, kilitli çağıran ve üyeliksiz hedef de reddedilir. Başarılıysa hedefin giriş adresini döner — Edge Function onunla tek kullanımlık bir oturum üretir. Kural burada, kabukta değil: `service_role` RLS''i baypas ettiği için bu sınır hiçbir politikadan geçmez ve pgTAP''in görebildiği yerde durmak zorundadır. Denetim kaydını kendisi yazar.';

-- Yalnız `service_role`. `authenticated` bunu çağırabilseydi, kapı kendi
-- koruduğu şeyin önünde durmazdı.
revoke all on function public.internal_begin_account_switch(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.internal_begin_account_switch(uuid, uuid)
  to service_role;
