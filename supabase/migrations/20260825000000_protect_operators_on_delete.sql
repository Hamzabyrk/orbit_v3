-- ALLOW-DESTRUCTIVE: Fonksiyon gövdesindeki `delete from` ifadeleri migration
-- çalıştığında hiçbir veri silmez; silme yalnızca fonksiyon çağrıldığında olur.
--
-- Issue #63 — Kurum silme, platform operatörünün hesabını yok ediyordu.
--
-- ⚠️ **Gerçekleşmiş olay (2026-08-24).** Test kurumu `orbitdershane` panelden
-- silindi. Kurumun tek üyesi aynı zamanda **platform operatörüydü**. Silme
-- akışı üye auth kullanıcılarını sildiği ve `platform_operators.user_id`
-- `auth.users`'a `on delete cascade` ile bağlı olduğu için:
--
--   1. Kişinin auth hesabı tamamen silindi — hiçbir yere giriş yapamaz oldu.
--   2. Platform operatörlüğü de sessizce yok oldu.
--
-- Kurucu ekip iki kişiden oluşuyor; ikisi de aynı kurumun üyesi olsaydı bu
-- işlem platformun TAMAMINI erişilemez kılardı. Kimlik mimarisinin "operatör
-- ayrı bir eksendir" ilkesi tam olarak bunu önlemek içindi ama silme akışı o
-- ilkeyi es geçiyordu.
--
-- **Asıl hata cascade değil.** `platform_operators.user_id` → `auth.users`
-- `on delete cascade` bağı doğrudur: auth kullanıcısı silinirse operatör kaydı
-- da gitmelidir, aksi halde var olmayan bir kullanıcıya işaret eden sarkan bir
-- satır kalır.
--
-- Hata şuydu: tek bir kuruma **kapsamlanmış** bir işlem (kurumu sil), **küresel**
-- bir eylem yaptı (kişinin kimliğini sil). Kurum silme yalnızca kuruma ait
-- şeyleri kaldırmalıdır; kişinin kimliği kuruma ait değildir.
--
-- Düzeltme bu ilkeyi ifade ediyor: **kimlik, ancak hiçbir şey onu talep
-- etmiyorsa silinir.** Bugün "talep" iki yerden gelebilir — başka bir kurumdaki
-- üyelik ve platform operatörlüğü. İleride yeni bir eksen eklenirse kontrol
-- noktası hazır durumda olacak; "operatörleri koru" biçiminde yazsaydık her
-- yeni eksende aynı hatayı tekrar keşfetmek zorunda kalırdık.

create or replace function public.internal_delete_organization(
  target_organization_id uuid,
  actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_name text;
  organization_code integer;
  deletable_ids uuid[];
  protected_ids uuid[];
  deleted_memberships integer;
  deleted_branches integer;
  deleted_audit_events integer;
begin
  select o.name, o.code
  into organization_name, organization_code
  from public.organizations as o
  where o.id = target_organization_id
  for update;

  if not found then
    raise exception 'organization does not exist' using errcode = '23503';
  end if;

  -- Üyeler ikiye ayrılıyor: kimliği silinebilecekler ve korunacaklar.
  --
  -- Ölçüt "operatör mü" değil, **başka bir şey bu kimliği talep ediyor mu**:
  --
  --   * Başka bir kurumdaki aktif üyelik. Bugünkü kimlik modelinde bir hesap
  --     tek kuruma ait olduğu için bu koşul normalde tetiklenmez; yine de
  --     kontrol ediliyor, çünkü modelin değişmesi bu fonksiyonun sessizce
  --     yanlışa dönmesine yol açmamalı.
  --   * Platform operatörlüğü. Kurumdan bağımsız bir eksendir; kurumun
  --     silinmesi o ekseni yok etmemelidir.
  --
  -- Operatörlükte `status` filtresi YOK: askıya alınmış bir operatörün hesabı
  -- da silinmemeli, çünkü askı geri alınabilir bir durumdur, hesap silme ise
  -- değildir.
  select
    coalesce(array_agg(m.user_id) filter (where not claimed), '{}'),
    coalesce(array_agg(m.user_id) filter (where claimed), '{}')
  into deletable_ids, protected_ids
  from (
    select
      m.user_id,
      (
        exists (
          select 1
          from public.organization_memberships as other
          where other.user_id = m.user_id
            and other.organization_id <> target_organization_id
        )
        or exists (
          select 1
          from public.platform_operators as op
          where op.user_id = m.user_id
        )
      ) as claimed
    from public.organization_memberships as m
    where m.organization_id = target_organization_id
  ) as m;

  -- Denetim kaydı silmeden ÖNCE yazılıyor; sonraya bırakılsaydı ve araya bir
  -- hata girseydi veriler gitmiş ama kimin sildiği kayıtsız kalmış olurdu.
  -- Kurum adı ve kodu metadata'ya kopyalanıyor çünkü `organization_id` kurum
  -- silinince NULL'a düşüyor.
  insert into public.platform_audit_events (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    organization_id,
    metadata
  )
  values (
    actor_user_id,
    'platform.organization_deleted',
    'organization',
    target_organization_id,
    target_organization_id,
    jsonb_build_object(
      'organization_name', organization_name,
      'organization_code', organization_code,
      'member_count',
        coalesce(array_length(deletable_ids, 1), 0)
        + coalesce(array_length(protected_ids, 1), 0),
      'protected_identity_count', coalesce(array_length(protected_ids, 1), 0)
    )
  );

  delete from public.audit_events as a
  where a.organization_id = target_organization_id;
  get diagnostics deleted_audit_events = row_count;

  delete from public.organization_memberships as m
  where m.organization_id = target_organization_id;
  get diagnostics deleted_memberships = row_count;

  delete from public.branches as b
  where b.organization_id = target_organization_id;
  get diagnostics deleted_branches = row_count;

  delete from public.organizations as o
  where o.id = target_organization_id;

  return jsonb_build_object(
    'organization_name', organization_name,
    'organization_code', organization_code,
    'member_user_ids', to_jsonb(deletable_ids),
    'protected_user_ids', to_jsonb(protected_ids),
    'deleted_memberships', deleted_memberships,
    'deleted_branches', deleted_branches,
    'deleted_audit_events', deleted_audit_events
  );
end;
$$;

comment on function public.internal_delete_organization(uuid, uuid) is
  'Kurumu ve bağlı kayıtlarını siler. `member_user_ids` yalnızca kimliği başka hiçbir yerden talep edilmeyen üyeleri içerir; platform operatörlüğü veya başka bir kurumda üyeliği olanlar `protected_user_ids` altında döner ve auth hesapları korunur.';

revoke all on function public.internal_delete_organization(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.internal_delete_organization(uuid, uuid)
  to service_role;
