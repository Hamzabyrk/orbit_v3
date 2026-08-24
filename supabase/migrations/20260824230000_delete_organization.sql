-- ALLOW-DESTRUCTIVE: Bu migration kurum silme fonksiyonunu tanımlıyor; içindeki
-- `delete from` ifadeleri fonksiyon gövdesindedir ve migration çalıştığında
-- HİÇBİR VERİ SİLMEZ. Silme yalnızca fonksiyon çağrıldığında olur ve çağrı
-- yolu `service_role` ile sınırlıdır.
--
-- Issue #61 — Kurum silme.
--
-- Neden gerekiyor: test ve deneme kurumları birikiyor ve elle SQL ile silmek
-- hem sıra hatasına açık hem de denetim kaydı bırakmıyor. Faz E2'de test
-- kurumu kaldırılacak; o iş de bu yoldan yapılacak.
--
-- Bağımlılıklar ve silme sırası (2026-08-24 itibarıyla ölçüldü):
--
--   audit_events.organization_id            RESTRICT, not null
--   branches.organization_id                RESTRICT, not null
--   organization_memberships.organization_id RESTRICT, not null
--   platform_audit_events.organization_id   SET NULL, nullable
--
-- İlk üçü kurumdan önce silinmek zorunda. Dördüncüsü kendiliğinden NULL'a
-- düşer — bu yüzden platform denetim kaydının metadata'sı kurumun adını ve
-- kodunu TAŞIMAK ZORUNDA; aksi halde silinen kurumun hangisi olduğu kayıttan
-- anlaşılamaz.

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
  member_ids uuid[];
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

  select coalesce(array_agg(m.user_id), '{}')
  into member_ids
  from public.organization_memberships as m
  where m.organization_id = target_organization_id;

  -- Denetim kaydı silmeden ÖNCE yazılıyor. Sonraya bırakılsaydı ve araya bir
  -- hata girseydi, veriler gitmiş ama kimin sildiği kayıtsız kalmış olurdu.
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
      'member_count', coalesce(array_length(member_ids, 1), 0)
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

  -- Kurum kodu geri döndürülmüyor: `organization_code_seq` ileri sarmış
  -- durumda ve geri almak, aynı kodun iki kez kullanılmasına yol açabilir.
  -- Kod boşlukları zararsızdır; kodun tek şartı benzersizlik.
  return jsonb_build_object(
    'organization_name', organization_name,
    'organization_code', organization_code,
    'member_user_ids', to_jsonb(member_ids),
    'deleted_memberships', deleted_memberships,
    'deleted_branches', deleted_branches,
    'deleted_audit_events', deleted_audit_events
  );
end;
$$;

comment on function public.internal_delete_organization(uuid, uuid) is
  'Kurumu ve ona bağlı tüm kayıtları siler. Auth kullanıcılarını SİLMEZ; onları çağıran Edge Function siler. Yalnızca service_role çağırabilir.';

-- İstemciden çağrılamaz. Bu fonksiyon bir kurumun tamamını yok eder;
-- `authenticated` rolüne açık olması, giriş yapmış herhangi birinin herhangi
-- bir kurumu silebilmesi demek olurdu.
--
-- Supabase her fonksiyona `anon` ve `authenticated` için ayrı bir default
-- EXECUTE grant'ı verir; `from public` revoke'u bunları kaldırmaz. Issue #18'de
-- tam olarak bu kaçırılmıştı.
revoke all on function public.internal_delete_organization(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.internal_delete_organization(uuid, uuid)
  to service_role;
