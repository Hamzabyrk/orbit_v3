-- v1.4-02 — Sınıf kontenjanı ve genel denetim yazıcısı (#266).
--
-- Bu dosyanın ikinci yarısı aslında **genelleştirmenin** testi: aynı fonksiyon
-- üç tabloya birden hizmet ediyor ve her tabloda farklı bir sütun kümesini
-- izliyor. Öğrenci tarafının davranışının değişmediğini ise
-- `student_number_and_audit.test.sql`'in 23 iddiası ölçmeye devam ediyor —
-- o dosya fonksiyonun **adını** değil davranışını sınadığı için genelleştirme
-- onu kırmadan geçebildi.

begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('e1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'kurum-yoneticisi@example.test', '', now(), now()),
  ('e2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogretmen@example.test', '', now(), now()),
  ('e3000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogrenci@example.test', '', now(), now());

insert into public.organizations (id, name, slug, code)
values ('ee000000-0000-0000-0000-0000000000ee', 'Kurum E', 'kurum-e-v142', 7301);

insert into public.branches (id, organization_id, name, is_default)
values ('e1100000-0000-0000-0000-0000000011e1', 'ee000000-0000-0000-0000-0000000000ee', 'E Merkez', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('33000000-0000-0000-0000-000000000001', 'ee000000-0000-0000-0000-0000000000ee', null,
   'e1000000-0000-0000-0000-000000000001', 'admin', 'active', 1000),
  ('33000000-0000-0000-0000-000000000002', 'ee000000-0000-0000-0000-0000000000ee',
   'e1100000-0000-0000-0000-0000000011e1', 'e2000000-0000-0000-0000-000000000002',
   'teacher', 'active', 1001),
  ('33000000-0000-0000-0000-000000000003', 'ee000000-0000-0000-0000-0000000000ee',
   'e1100000-0000-0000-0000-0000000011e1', 'e3000000-0000-0000-0000-000000000003',
   'student', 'active', 1002);

insert into public.students (id, organization_id, branch_id, full_name)
values ('5e000000-0000-0000-0000-00000000e001', 'ee000000-0000-0000-0000-0000000000ee',
        'e1100000-0000-0000-0000-0000000011e1', 'Kayıt Olacak Öğrenci');

-- Kontenjan kısıtı ------------------------------------------------------------

select throws_ok(
  $sql$insert into public.classes (organization_id, branch_id, name, capacity)
    values ('ee000000-0000-0000-0000-0000000000ee', 'e1100000-0000-0000-0000-0000000011e1',
            'Sıfır Kontenjan', 0)$sql$,
  '23514',
  null,
  'a capacity of zero is refused — that is what archiving is for'
);

select throws_ok(
  $sql$insert into public.classes (organization_id, branch_id, name, capacity)
    values ('ee000000-0000-0000-0000-0000000000ee', 'e1100000-0000-0000-0000-0000000011e1',
            'Dört Haneli Kontenjan', 1001)$sql$,
  '23514',
  null,
  'a four-digit capacity is refused as a data entry error'
);

select lives_ok(
  $sql$insert into public.classes (id, organization_id, branch_id, name, program, capacity)
    values ('c1000000-0000-0000-0000-0000000000c1', 'ee000000-0000-0000-0000-0000000000ee',
            'e1100000-0000-0000-0000-0000000011e1', '12-A Sayısal', 'YKS', 24)$sql$,
  'a class with a capacity is accepted'
);

select lives_ok(
  $sql$insert into public.classes (id, organization_id, branch_id, name)
    values ('c2000000-0000-0000-0000-0000000000c2', 'ee000000-0000-0000-0000-0000000000ee',
            'e1100000-0000-0000-0000-0000000011e1', 'Kontenjansız Sınıf')$sql$,
  'the capacity stays optional'
);

-- Sınıfın denetim izi ---------------------------------------------------------

select is(
  (select count(*) from public.audit_events
   where entity_id = 'c1000000-0000-0000-0000-0000000000c1' and action = 'class.created'),
  1::bigint,
  'creating a class writes exactly one audit event'
);

select is(
  (select metadata ->> 'name' from public.audit_events
   where entity_id = 'c1000000-0000-0000-0000-0000000000c1' and action = 'class.created'),
  '12-A Sayısal',
  'the creation event carries the class name'
);

select is(
  (select (metadata ->> 'capacity')::int from public.audit_events
   where entity_id = 'c1000000-0000-0000-0000-0000000000c1' and action = 'class.created'),
  24,
  'the creation event carries the capacity as a number, not a string'
);

select is(
  (select entity_type from public.audit_events
   where entity_id = 'c1000000-0000-0000-0000-0000000000c1' and action = 'class.created'),
  'class',
  'the entity type comes from the trigger argument'
);

update public.classes
set name = '12-A Sayısal (Sabah)', capacity = 26
where id = 'c1000000-0000-0000-0000-0000000000c1';

select is(
  (select metadata -> 'changed' from public.audit_events
   where entity_id = 'c1000000-0000-0000-0000-0000000000c1' and action = 'class.updated'),
  '["name", "capacity"]'::jsonb,
  'the update event names the changed fields in the declared order'
);

select is(
  (select metadata ->> 'name' from public.audit_events
   where entity_id = 'c1000000-0000-0000-0000-0000000000c1' and action = 'class.updated'),
  '12-A Sayısal (Sabah)',
  'the update event carries the new value, not the old one'
);

update public.classes
set program = null
where id = 'c1000000-0000-0000-0000-0000000000c1';

select is(
  (select count(*) from public.audit_events
   where entity_id = 'c1000000-0000-0000-0000-0000000000c1' and action = 'class.updated'),
  2::bigint,
  'clearing a watched field is a change like any other'
);

update public.classes
set updated_at = now()
where id = 'c1000000-0000-0000-0000-0000000000c1';

select is(
  (select count(*) from public.audit_events
   where entity_id = 'c1000000-0000-0000-0000-0000000000c1' and action = 'class.updated'),
  2::bigint,
  'touching an unwatched column writes nothing — the watched list is a scope declaration'
);

update public.classes
set archived_at = now()
where id = 'c1000000-0000-0000-0000-0000000000c1';

select is(
  (select count(*) from public.audit_events
   where entity_id = 'c1000000-0000-0000-0000-0000000000c1' and action = 'class.archived'),
  1::bigint,
  'archiving a class writes an archive event, not a generic update'
);

update public.classes
set archived_at = null
where id = 'c1000000-0000-0000-0000-0000000000c1';

select is(
  (select count(*) from public.audit_events
   where entity_id = 'c1000000-0000-0000-0000-0000000000c1' and action = 'class.restored'),
  1::bigint,
  'restoring writes its own event'
);

-- Sınıfa kayıt: şubesiz tablo -------------------------------------------------
--
-- `class_enrollments` `branch_id` taşımıyor. Genel fonksiyonun o sütunu
-- olmayan tabloda da çalışması bu iddiayla ölçülüyor.

insert into public.class_enrollments (id, organization_id, class_id, student_id)
values ('c1e00000-0000-0000-0000-00000000ce01', 'ee000000-0000-0000-0000-0000000000ee',
        'c1000000-0000-0000-0000-0000000000c1', '5e000000-0000-0000-0000-00000000e001');

select is(
  (select count(*) from public.audit_events
   where entity_id = 'c1e00000-0000-0000-0000-00000000ce01' and action = 'class_enrollment.created'),
  1::bigint,
  'enrolling a student writes one audit event'
);

select is(
  (select branch_id from public.audit_events
   where entity_id = 'c1e00000-0000-0000-0000-00000000ce01' and action = 'class_enrollment.created'),
  null::uuid,
  'a table without a branch column records a null branch, not an error'
);

select is(
  (select metadata ->> 'student_id' from public.audit_events
   where entity_id = 'c1e00000-0000-0000-0000-00000000ce01' and action = 'class_enrollment.created'),
  '5e000000-0000-0000-0000-00000000e001',
  'the enrollment event carries both ends of the link'
);

select throws_ok(
  $sql$insert into public.class_enrollments (organization_id, class_id, student_id)
    values ('ee000000-0000-0000-0000-0000000000ee', 'c1000000-0000-0000-0000-0000000000c1',
            '5e000000-0000-0000-0000-00000000e001')$sql$,
  '23505',
  null,
  'the same student cannot be enrolled in the same class twice'
);

update public.class_enrollments
set archived_at = now()
where id = 'c1e00000-0000-0000-0000-00000000ce01';

select is(
  (select count(*) from public.audit_events
   where entity_id = 'c1e00000-0000-0000-0000-00000000ce01' and action = 'class_enrollment.archived'),
  1::bigint,
  'removing a student from a class is archived, and leaves a trace'
);

-- Rol sınırları ---------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'e2000000-0000-0000-0000-000000000002', true);

select throws_ok(
  $sql$insert into public.classes (organization_id, branch_id, name)
    values ('ee000000-0000-0000-0000-0000000000ee', 'e1100000-0000-0000-0000-0000000011e1',
            'Öğretmenin Açtığı Sınıf')$sql$,
  '42501',
  null,
  'a teacher cannot create a class'
);

select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $sql$update public.classes set capacity = 30
    where id = 'c2000000-0000-0000-0000-0000000000c2'$sql$,
  'an admin can write the capacity'
);

select throws_ok(
  $sql$select public.audit_row_change()$sql$,
  '42501',
  null,
  'the shared ledger writer is not callable by authenticated'
);

select * from finish();
rollback;
