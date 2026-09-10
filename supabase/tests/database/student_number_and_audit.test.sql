-- v1.4-01 — Öğrenci numarası ve CRUD'un denetim izi (#264).
--
-- İki ayrı iddia kümesi, tek dosyada çünkü ikisi de aynı tabloya ve aynı
-- fikstüre dayanıyor: numara **kurumun defterindeki sıradır** ve her mutasyon
-- **iz bırakır**.
--
-- Denetim iddiaları `reset role` ile okunuyor: `audit_events` RLS taşıyor ve
-- testin ölçmek istediği şey "kaç satır yazıldı", "yönetici kaç satır
-- görüyor" değil.

begin;

create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('c1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'yonetici@example.test', '', now(), now()),
  ('c2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogretmen@example.test', '', now(), now()),
  ('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'diger-yonetici@example.test', '', now(), now());

insert into public.organizations (id, name, slug, code)
values
  ('cc000000-0000-0000-0000-0000000000cc', 'Kurum C', 'kurum-c-v141', 7201),
  ('dd000000-0000-0000-0000-0000000000dd', 'Kurum D', 'kurum-d-v141', 7202);

insert into public.branches (id, organization_id, name, is_default)
values
  ('c1100000-0000-0000-0000-0000000011c1', 'cc000000-0000-0000-0000-0000000000cc', 'C Merkez', true),
  ('c2200000-0000-0000-0000-0000000022c2', 'cc000000-0000-0000-0000-0000000000cc', 'C İkinci Şube', false),
  ('d1100000-0000-0000-0000-0000000011d1', 'dd000000-0000-0000-0000-0000000000dd', 'D Merkez', true);

insert into public.organization_memberships
  (organization_id, branch_id, user_id, role, status, person_code)
values
  ('cc000000-0000-0000-0000-0000000000cc', null,
   'c1000000-0000-0000-0000-000000000001', 'admin', 'active', 1000),
  ('cc000000-0000-0000-0000-0000000000cc', 'c1100000-0000-0000-0000-0000000011c1',
   'c2000000-0000-0000-0000-000000000002', 'teacher', 'active', 1001),
  ('dd000000-0000-0000-0000-0000000000dd', 'd1100000-0000-0000-0000-0000000011d1',
   'd1000000-0000-0000-0000-000000000001', 'admin', 'active', 1000);

-- Numara kısıtı — şema düzeyi, rolden bağımsız -------------------------------

select throws_ok(
  $sql$insert into public.students (organization_id, branch_id, full_name, student_number)
    values ('cc000000-0000-0000-0000-0000000000cc', 'c1100000-0000-0000-0000-0000000011c1',
            'Boş Numaralı', '   ')$sql$,
  '23514',
  null,
  'a whitespace-only student number is refused'
);

select throws_ok(
  $sql$insert into public.students (organization_id, branch_id, full_name, student_number)
    values ('cc000000-0000-0000-0000-0000000000cc', 'c1100000-0000-0000-0000-0000000011c1',
            'Boşluklu Numara', ' 101 ')$sql$,
  '23514',
  null,
  'an untrimmed student number is refused rather than silently trimmed'
);

select throws_ok(
  $sql$insert into public.students (organization_id, branch_id, full_name, student_number)
    values ('cc000000-0000-0000-0000-0000000000cc', 'c1100000-0000-0000-0000-0000000011c1',
            'Uzun Numara', repeat('9', 33))$sql$,
  '23514',
  null,
  'a student number longer than 32 characters is refused'
);

select lives_ok(
  $sql$insert into public.students (id, organization_id, branch_id, full_name, student_number)
    values ('5c000000-0000-0000-0000-00000000c001', 'cc000000-0000-0000-0000-0000000000cc',
            'c1100000-0000-0000-0000-0000000011c1', 'Numaralı Öğrenci', '101')$sql$,
  'a valid student number is accepted'
);

select lives_ok(
  $sql$insert into public.students (id, organization_id, branch_id, full_name)
    values ('5c000000-0000-0000-0000-00000000c002', 'cc000000-0000-0000-0000-0000000000cc',
            'c1100000-0000-0000-0000-0000000011c1', 'Numarasız Öğrenci')$sql$,
  'the student number stays optional'
);

select lives_ok(
  $sql$insert into public.students (id, organization_id, branch_id, full_name)
    values ('5c000000-0000-0000-0000-00000000c003', 'cc000000-0000-0000-0000-0000000000cc',
            'c2200000-0000-0000-0000-0000000022c2', 'İkinci Numarasız')$sql$,
  'two students without a number do not collide'
);

select throws_ok(
  $sql$insert into public.students (organization_id, branch_id, full_name, student_number)
    values ('cc000000-0000-0000-0000-0000000000cc', 'c2200000-0000-0000-0000-0000000022c2',
            'Aynı Numara', '101')$sql$,
  '23505',
  null,
  'the same number twice in one organization is refused — across branches too'
);

select lives_ok(
  $sql$insert into public.students (id, organization_id, branch_id, full_name, student_number)
    values ('5d000000-0000-0000-0000-00000000d001', 'dd000000-0000-0000-0000-0000000000dd',
            'd1100000-0000-0000-0000-0000000011d1', 'Başka Kurumun 101''i', '101')$sql$,
  'the same number in another organization is fine — the ledger belongs to the school'
);

-- Arşivlenen kayıt numarayı serbest bırakmaz ----------------------------------

update public.students
set archived_at = now()
where id = '5c000000-0000-0000-0000-00000000c001';

select throws_ok(
  $sql$insert into public.students (organization_id, branch_id, full_name, student_number)
    values ('cc000000-0000-0000-0000-0000000000cc', 'c1100000-0000-0000-0000-0000000011c1',
            'Ayrılanın Numarası', '101')$sql$,
  '23505',
  null,
  'an archived record keeps its number — it is not handed to the next student'
);

-- Denetim izi -----------------------------------------------------------------

select is(
  (select count(*) from public.audit_events
   where entity_id = '5c000000-0000-0000-0000-00000000c001' and action = 'student.created'),
  1::bigint,
  'creating a student writes exactly one audit event'
);

select is(
  (select metadata ->> 'student_number' from public.audit_events
   where entity_id = '5c000000-0000-0000-0000-00000000c001' and action = 'student.created'),
  '101',
  'the creation event carries the student number'
);

select is(
  (select count(*) from public.audit_events
   where entity_id = '5c000000-0000-0000-0000-00000000c001' and action = 'student.archived'),
  1::bigint,
  'archiving writes an archive event, not a generic update'
);

update public.students
set archived_at = null
where id = '5c000000-0000-0000-0000-00000000c001';

select is(
  (select count(*) from public.audit_events
   where entity_id = '5c000000-0000-0000-0000-00000000c001' and action = 'student.restored'),
  1::bigint,
  'restoring writes its own event'
);

update public.students
set full_name = 'Adı Düzeltilen', student_number = '102'
where id = '5c000000-0000-0000-0000-00000000c001';

select is(
  (select count(*) from public.audit_events
   where entity_id = '5c000000-0000-0000-0000-00000000c001' and action = 'student.updated'),
  1::bigint,
  'editing writes one update event'
);

select is(
  (select metadata -> 'changed' from public.audit_events
   where entity_id = '5c000000-0000-0000-0000-00000000c001' and action = 'student.updated'),
  '["full_name", "student_number"]'::jsonb,
  'the update event names the changed fields'
);

select is(
  (select metadata ? 'old_full_name' from public.audit_events
   where entity_id = '5c000000-0000-0000-0000-00000000c001' and action = 'student.updated'),
  false,
  'the audit ledger is not a backup — old values are not stored'
);

-- Değişmeyen güncelleme iz bırakmaz -------------------------------------------

update public.students
set full_name = 'Adı Düzeltilen'
where id = '5c000000-0000-0000-0000-00000000c001';

select is(
  (select count(*) from public.audit_events
   where entity_id = '5c000000-0000-0000-0000-00000000c001' and action = 'student.updated'),
  1::bigint,
  'an update that changes nothing writes nothing'
);

-- Bağlama tetikleyiciyi ateşlemez; kendi kaydını yazar ------------------------
--
-- v1.4-00'ın fonksiyonları `auth_user_id`'yi yazıyor. Tetikleyici o sütunu
-- izlemiyor; izleseydi tek işlem için defterde iki satır görünürdü.

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('32000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-0000000000cc',
   'c1100000-0000-0000-0000-0000000011c1', 'c2000000-0000-0000-0000-000000000002',
   'teacher', 'active', 1002)
on conflict do nothing;

update public.students
set auth_user_id = 'c2000000-0000-0000-0000-000000000002'
where id = '5c000000-0000-0000-0000-00000000c002';

select is(
  (select count(*) from public.audit_events
   where entity_id = '5c000000-0000-0000-0000-00000000c002' and action = 'student.updated'),
  0::bigint,
  'an auth_user_id change does not produce a second, duplicate audit row'
);

-- Rol sınırları — numarayı kim yazabilir --------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'c2000000-0000-0000-0000-000000000002', true);

select throws_ok(
  $sql$insert into public.students (organization_id, branch_id, full_name, student_number)
    values ('cc000000-0000-0000-0000-0000000000cc', 'c1100000-0000-0000-0000-0000000011c1',
            'Öğretmenin Eklediği', '900')$sql$,
  '42501',
  null,
  'a teacher still cannot create a student'
);

select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $sql$insert into public.students (organization_id, branch_id, full_name, student_number)
    values ('cc000000-0000-0000-0000-0000000000cc', 'c1100000-0000-0000-0000-0000000011c1',
            'Yöneticinin Eklediği', '200')$sql$,
  'an admin can write the student number on insert'
);

select lives_ok(
  $sql$update public.students set student_number = '201'
    where full_name = 'Yöneticinin Eklediği'$sql$,
  'an admin can correct the student number afterwards'
);

select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);

select is(
  (select count(*) from public.students where organization_id = 'cc000000-0000-0000-0000-0000000000cc'),
  0::bigint,
  'an admin of another organization sees none of these students'
);

select throws_ok(
  $sql$select public.audit_student_change()$sql$,
  '42501',
  null,
  'the audit trigger function is not callable by authenticated'
);

select * from finish();
rollback;
