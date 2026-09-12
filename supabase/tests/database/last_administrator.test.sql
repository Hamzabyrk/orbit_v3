-- v1.4-08 — Son yönetici kurumu terk edemez (#282).
--
-- Bu dilim v1.4-07'nin kapısını gevşetiyor, dolayısıyla testin ilk işi
-- **gevşemenin fazla gevşemediğini** göstermek. Dört iddia kümesi:
--
--   1. Terfi çalışıyor ve hiçbir zaman reddedilmiyor (sayımı artırır).
--   2. Son yönetici ne kendini indirebiliyor ne çıkarılabiliyor (`ORB06`).
--   3. İkinci yönetici varken **kendini indirmek meşru** — devir tam olarak
--      budur ve v1.4-07'nin önerdiği "kendini hedef alamaz" yasağı bunu
--      yanlışlıkla engellerdi.
--   4. Defter devri ayırt edebiliyor (`self` bayrağı).

begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('b1000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'devir-yonetici@example.test', '', now(), now()),
  ('b2000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'devir-ogretmen@example.test', '', now(), now()),
  ('b3000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'devir-ogrenci@example.test', '', now(), now());

insert into public.organizations (id, name, slug, code)
values ('bd000000-0000-0000-0000-0000000000bd', 'Kurum Devir', 'kurum-devir-v1408', 7901);

insert into public.branches (id, organization_id, name, is_default)
values ('bd100000-0000-0000-0000-0000000011bd', 'bd000000-0000-0000-0000-0000000000bd', 'Devir Merkez', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('3a000000-0000-0000-0000-000000000001', 'bd000000-0000-0000-0000-0000000000bd', null,
   'b1000000-0000-0000-0000-0000000000b1', 'admin', 'active', 1600),
  ('3a000000-0000-0000-0000-000000000002', 'bd000000-0000-0000-0000-0000000000bd',
   'bd100000-0000-0000-0000-0000000011bd', 'b2000000-0000-0000-0000-0000000000b2',
   'teacher', 'active', 1601),
  ('3a000000-0000-0000-0000-000000000003', 'bd000000-0000-0000-0000-0000000000bd',
   'bd100000-0000-0000-0000-0000000011bd', 'b3000000-0000-0000-0000-0000000000b3',
   'student', 'active', 1602);

-- =========================================================================
-- Tek yönetici varken: ne kendini indirebilir ne çıkarılabilir
-- =========================================================================

select is(
  (select count(*) from public.organization_memberships
   where organization_id = 'bd000000-0000-0000-0000-0000000000bd'
     and role = 'admin' and status = 'active'),
  1::bigint,
  'the organization starts with exactly one active administrator'
);

select throws_ok(
  $sql$select public.internal_change_member_role(
    'b1000000-0000-0000-0000-0000000000b1',
    '3a000000-0000-0000-0000-000000000001',
    'teacher'
  )$sql$,
  'ORB06',
  null,
  'the last administrator cannot demote themselves — the org would have zero'
);

select throws_ok(
  $sql$select public.internal_remove_member(
    'b1000000-0000-0000-0000-0000000000b1',
    '3a000000-0000-0000-0000-000000000001'
  )$sql$,
  'ORB06',
  null,
  'and cannot remove themselves either'
);

select is(
  (select role::text from public.organization_memberships
   where id = '3a000000-0000-0000-0000-000000000001'),
  'admin',
  'neither refusal changed anything'
);

select is(
  (select status::text from public.organization_memberships
   where id = '3a000000-0000-0000-0000-000000000001'),
  'active',
  'the last administrator is still active'
);

-- =========================================================================
-- Terfi — hiçbir zaman reddedilmiyor
-- =========================================================================

select lives_ok(
  $sql$select public.internal_change_member_role(
    'b1000000-0000-0000-0000-0000000000b1',
    '3a000000-0000-0000-0000-000000000002',
    'admin'
  )$sql$,
  'an administrator can promote a teacher to administrator'
);

select is(
  (select count(*) from public.organization_memberships
   where organization_id = 'bd000000-0000-0000-0000-0000000000bd'
     and role = 'admin' and status = 'active'),
  2::bigint,
  'the organization now has two active administrators'
);

select is(
  (select metadata ->> 'to' from public.audit_events
   where entity_id = '3a000000-0000-0000-0000-000000000002'
     and action = 'membership.role_changed'
   order by id desc limit 1),
  'admin',
  'the promotion is in the ledger'
);

select is(
  (select metadata ->> 'self' from public.audit_events
   where entity_id = '3a000000-0000-0000-0000-000000000002'
     and action = 'membership.role_changed'
   order by id desc limit 1),
  'false',
  'and the ledger says it was NOT a self-change'
);

-- =========================================================================
-- İkinci yönetici varken kendini indirmek MEŞRU — devir budur
-- =========================================================================
--
-- v1.4-07'nin notu "çağıran kendini hedef alamaz" kontrolünü istiyordu.
-- Bu iddia o kontrolün neden yanlış olacağını gösteriyor: aşağıdaki işlem
-- yasaklanmış olurdu ve devir imkânsız hale gelirdi.

select lives_ok(
  $sql$select public.internal_change_member_role(
    'b1000000-0000-0000-0000-0000000000b1',
    '3a000000-0000-0000-0000-000000000001',
    'teacher'
  )$sql$,
  'with a second administrator present, an administrator CAN demote themselves — this is the transfer'
);

select is(
  (select role::text from public.organization_memberships
   where id = '3a000000-0000-0000-0000-000000000001'),
  'teacher',
  'the former administrator is now a teacher'
);

select is(
  (select count(*) from public.organization_memberships
   where organization_id = 'bd000000-0000-0000-0000-0000000000bd'
     and role = 'admin' and status = 'active'),
  1::bigint,
  'and the organization is back to exactly one administrator — never zero'
);

select is(
  (select metadata ->> 'self' from public.audit_events
   where entity_id = '3a000000-0000-0000-0000-000000000001'
     and action = 'membership.role_changed'
   order by id desc limit 1),
  'true',
  'the ledger marks it as a self-change — a transfer is readable afterwards'
);

-- Devrini tamamlayan kişi artık yönetici değil: yetkisi de gitti.
select throws_ok(
  $sql$select public.internal_change_member_role(
    'b1000000-0000-0000-0000-0000000000b1',
    '3a000000-0000-0000-0000-000000000003',
    'parent'
  )$sql$,
  '42501',
  null,
  'after handing over, the former administrator can no longer change roles'
);

-- Ve yeni yönetici tek yönetici olduğu için aynı korumaya tabi.
select throws_ok(
  $sql$select public.internal_change_member_role(
    'b2000000-0000-0000-0000-0000000000b2',
    '3a000000-0000-0000-0000-000000000002',
    'teacher'
  )$sql$,
  'ORB06',
  null,
  'the new sole administrator inherits the same protection'
);

-- =========================================================================
-- Çıkarma tarafı — aynı sayım, ikinci yönetici varken serbest
-- =========================================================================

select lives_ok(
  $sql$select public.internal_change_member_role(
    'b2000000-0000-0000-0000-0000000000b2',
    '3a000000-0000-0000-0000-000000000001',
    'admin'
  )$sql$,
  'the teacher can be promoted back to administrator'
);

select lives_ok(
  $sql$select public.internal_remove_member(
    'b2000000-0000-0000-0000-0000000000b2',
    '3a000000-0000-0000-0000-000000000001'
  )$sql$,
  'with two administrators, one of them can be removed from the organization'
);

select is(
  (select count(*) from public.organization_memberships
   where organization_id = 'bd000000-0000-0000-0000-0000000000bd'
     and role = 'admin' and status = 'active'),
  1::bigint,
  'one active administrator remains — the count is what protects, not a ban'
);

-- Çıkarılan yönetici `suspended` olduğu için artık sayılmıyor; kalan tek
-- yönetici yine korunuyor.
select throws_ok(
  $sql$select public.internal_remove_member(
    'b2000000-0000-0000-0000-0000000000b2',
    '3a000000-0000-0000-0000-000000000002'
  )$sql$,
  'ORB06',
  null,
  'a suspended administrator does not count — the remaining one is still protected'
);

-- =========================================================================
-- Yönetici çıkarılırken bağ koparma dalları hiç çalışmaz
-- =========================================================================

select is(
  (select metadata ->> 'unlinked_student_id' from public.audit_events
   where entity_id = '3a000000-0000-0000-0000-000000000001'
     and action = 'membership.removed'),
  null::text,
  'removing an administrator unlinks no student record — they have none'
);

select is(
  (select metadata ->> 'role' from public.audit_events
   where entity_id = '3a000000-0000-0000-0000-000000000001'
     and action = 'membership.removed'),
  'admin',
  'and the ledger records that an administrator was removed'
);

-- =========================================================================
-- Yetki sınırı değişmedi
-- =========================================================================

select throws_ok(
  $sql$select public.internal_change_member_role(
    'b3000000-0000-0000-0000-0000000000b3',
    '3a000000-0000-0000-0000-000000000002',
    'teacher'
  )$sql$,
  '42501',
  null,
  'a student still cannot change anyone''s role'
);

select * from finish();
rollback;
