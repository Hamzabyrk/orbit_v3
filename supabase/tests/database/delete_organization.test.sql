-- Issue #63 — Kurum silmenin sınırlarının doğrulanması.
--
-- En kritik test, platform operatörünün korunduğunu kanıtlayandır. Bu testin
-- var olma sebebi gerçek bir olaydır: 2026-08-24'te test kurumu panelden
-- silindi, kurumun tek üyesi aynı zamanda platform operatörüydü ve auth hesabı
-- tamamen yok oldu — operatörlüğü de `on delete cascade` ile birlikte gitti.
-- Kurucu ekibin ikisi de aynı kurumun üyesi olsaydı platformun tamamı
-- erişilemez hale gelirdi.

begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('c1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'sadece-uye@example.test', '', now(), now()),
  ('c2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'hem-uye-hem-operator@example.test', '', now(), now()),
  ('c3000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'askidaki-operator@example.test', '', now(), now());

insert into public.platform_operators (user_id, role, status)
values
  ('c2000000-0000-0000-0000-000000000002', 'owner', 'active'),
  ('c3000000-0000-0000-0000-000000000003', 'operator', 'suspended');

insert into public.organizations (id, name, slug, code)
values ('d1000000-0000-0000-0000-000000000001', 'Silinecek Kurum', 'silinecek', 4242);

insert into public.branches (organization_id, name, is_default)
values ('d1000000-0000-0000-0000-000000000001', 'Merkez', true);

insert into public.organization_memberships
  (organization_id, user_id, role, status, person_code)
values
  ('d1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001', 'admin', 'active', 1000),
  ('d1000000-0000-0000-0000-000000000001',
   'c2000000-0000-0000-0000-000000000002', 'teacher', 'active', 1001),
  ('d1000000-0000-0000-0000-000000000001',
   'c3000000-0000-0000-0000-000000000003', 'teacher', 'active', 1002);

insert into public.audit_events
  (organization_id, actor_user_id, action, entity_type, entity_id)
values (
  'd1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000001',
  'test.event', 'test', 'd1000000-0000-0000-0000-000000000001'
);

-- Silme ---------------------------------------------------------------------

create temporary table delete_result as
select public.internal_delete_organization(
  'd1000000-0000-0000-0000-000000000001',
  'c2000000-0000-0000-0000-000000000002'
) as payload;

select is(
  (select count(*) from public.organizations
     where id = 'd1000000-0000-0000-0000-000000000001'),
  0::bigint,
  'the organization row is gone'
);

select is(
  (select count(*) from public.branches
     where organization_id = 'd1000000-0000-0000-0000-000000000001'),
  0::bigint,
  'branches are gone'
);

select is(
  (select count(*) from public.organization_memberships
     where organization_id = 'd1000000-0000-0000-0000-000000000001'),
  0::bigint,
  'memberships are gone'
);

select is(
  (select count(*) from public.audit_events
     where organization_id = 'd1000000-0000-0000-0000-000000000001'),
  0::bigint,
  'the institution audit trail is gone'
);

-- 🔴 En kritik iddialar: operatör hesapları korunuyor mu -------------------

select is(
  (select jsonb_array_length(payload -> 'member_user_ids') from delete_result),
  1,
  'only the non-operator member is returned for auth deletion'
);

select is(
  (select payload -> 'member_user_ids' ->> 0 from delete_result),
  'c1000000-0000-0000-0000-000000000001',
  'the returned member is the one without platform access'
);

select is(
  (select jsonb_array_length(payload -> 'protected_user_ids') from delete_result),
  2,
  'both operators are reported as protected'
);

-- Askıya alınmış operatör da korunur: askı geri alınabilir bir durumdur,
-- hesap silme ise değildir.
select ok(
  (select payload -> 'protected_user_ids' from delete_result)
    @> '["c3000000-0000-0000-0000-000000000003"]'::jsonb,
  'a suspended operator is protected too'
);

select is(
  (select count(*) from public.platform_operators),
  2::bigint,
  'platform operator records survive the organization deletion'
);

-- Denetim -------------------------------------------------------------------

-- Kurum adı ve kodu metadata'ya kopyalanmalı; `organization_id` kurum silinince
-- NULL'a düştüğü için kaydın hangi kuruma ait olduğu başka türlü anlaşılamaz.
select is(
  (select metadata ->> 'organization_name'
     from public.platform_audit_events
     where action = 'platform.organization_deleted'
     order by id desc limit 1),
  'Silinecek Kurum',
  'the audit record keeps the organization name after deletion'
);

select * from finish();

rollback;
