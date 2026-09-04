-- v1.2-08 — Ödevlerin sınırları.
--
-- Yazma kalıbı v1.2-04'ün (yoklama) aynısı: yetki role değil **atamaya** bağlı.
-- Bu dosya onu iki yönlü ölçüyor — atanmış öğretmen verebiliyor, atanmamış
-- öğretmen veremiyor — ve ödevi kimin verdiğinin istemci tarafından
-- uydurulamadığını.

begin;

create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('91000000-0000-0000-0000-000000000091', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'kurum-yoneticisi@example.test', '', now(), now()),
  ('92000000-0000-0000-0000-000000000092', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'atanmis-ogretmen@example.test', '', now(), now()),
  ('93000000-0000-0000-0000-000000000093', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'atanmamis-ogretmen@example.test', '', now(), now()),
  ('94000000-0000-0000-0000-000000000094', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogrenci@example.test', '', now(), now()),
  ('95000000-0000-0000-0000-000000000095', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'veli@example.test', '', now(), now()),
  ('08000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'platform-operatoru@example.test', '', now(), now());

insert into public.platform_operators (user_id, role, status)
values ('08000000-0000-0000-0000-000000000008', 'owner', 'active');

insert into public.organizations (id, name, slug, code)
values
  ('4a000000-0000-0000-0000-00000000004a', 'Kurum A', 'kurum-a-v1208', 7701),
  ('4b000000-0000-0000-0000-00000000004b', 'Kurum B', 'kurum-b-v1208', 7702);

insert into public.branches (id, organization_id, name, is_default)
values
  ('4aa00000-0000-0000-0000-0000000004aa', '4a000000-0000-0000-0000-00000000004a', 'A Merkez', true),
  ('4bb00000-0000-0000-0000-0000000004bb', '4b000000-0000-0000-0000-00000000004b', 'B Merkez', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('91100000-0000-0000-0000-0000000011a9', '4a000000-0000-0000-0000-00000000004a', null,
   '91000000-0000-0000-0000-000000000091', 'admin', 'active', 1000),
  ('92200000-0000-0000-0000-0000000022a9', '4a000000-0000-0000-0000-00000000004a', '4aa00000-0000-0000-0000-0000000004aa',
   '92000000-0000-0000-0000-000000000092', 'teacher', 'active', 1001),
  ('93300000-0000-0000-0000-0000000033a9', '4a000000-0000-0000-0000-00000000004a', '4aa00000-0000-0000-0000-0000000004aa',
   '93000000-0000-0000-0000-000000000093', 'teacher', 'active', 1002),
  ('94400000-0000-0000-0000-0000000044a9', '4a000000-0000-0000-0000-00000000004a', '4aa00000-0000-0000-0000-0000000004aa',
   '94000000-0000-0000-0000-000000000094', 'student', 'active', 1003),
  ('95500000-0000-0000-0000-0000000055a9', '4a000000-0000-0000-0000-00000000004a', '4aa00000-0000-0000-0000-0000000004aa',
   '95000000-0000-0000-0000-000000000095', 'parent', 'active', 1004);

insert into public.subjects (id, organization_id, name)
values ('8a000000-0000-0000-0000-00000000008a', '4a000000-0000-0000-0000-00000000004a', 'Matematik');

insert into public.classes (id, organization_id, branch_id, name, program)
values
  ('d1000000-0000-0000-0000-0000000000e1', '4a000000-0000-0000-0000-00000000004a',
   '4aa00000-0000-0000-0000-0000000004aa', 'YKS 12-A', 'YKS'),
  ('d2000000-0000-0000-0000-0000000000e2', '4a000000-0000-0000-0000-00000000004a',
   '4aa00000-0000-0000-0000-0000000004aa', 'YKS 12-B', 'YKS'),
  ('d3000000-0000-0000-0000-0000000000e3', '4b000000-0000-0000-0000-00000000004b',
   '4bb00000-0000-0000-0000-0000000004bb', 'LGS 8-A', 'LGS');

-- Yalnızca 12-A'ya atanmış. 12-B ve diğer kurum kapsamı dışında.
insert into public.class_teachers (organization_id, class_id, membership_id, subject_id)
values ('4a000000-0000-0000-0000-00000000004a', 'd1000000-0000-0000-0000-0000000000e1',
        '92200000-0000-0000-0000-0000000022a9', '8a000000-0000-0000-0000-00000000008a');

insert into public.students (id, organization_id, branch_id, auth_user_id, full_name)
values ('a5000000-0000-0000-0000-0000000000f1', '4a000000-0000-0000-0000-00000000004a',
        '4aa00000-0000-0000-0000-0000000004aa', '94000000-0000-0000-0000-000000000094', 'Birinci Öğrenci');

insert into public.guardians (id, organization_id, auth_user_id, full_name)
values ('a6000000-0000-0000-0000-0000000000f2', '4a000000-0000-0000-0000-00000000004a',
        '95000000-0000-0000-0000-000000000095', 'Birinci Veli');

insert into public.student_guardians (organization_id, student_id, guardian_id)
values ('4a000000-0000-0000-0000-00000000004a', 'a5000000-0000-0000-0000-0000000000f1',
        'a6000000-0000-0000-0000-0000000000f2');

insert into public.class_enrollments (organization_id, class_id, student_id)
values ('4a000000-0000-0000-0000-00000000004a', 'd1000000-0000-0000-0000-0000000000e1',
        'a5000000-0000-0000-0000-0000000000f1');

insert into public.homework_assignments
  (id, organization_id, class_id, subject_id, title, assigned_on, due_date)
values
  ('b1000000-0000-0000-0000-0000000000f1', '4a000000-0000-0000-0000-00000000004a',
   'd1000000-0000-0000-0000-0000000000e1', '8a000000-0000-0000-0000-00000000008a',
   'Türev Deneme Seti', current_date - 2, current_date + 3),
  ('b2000000-0000-0000-0000-0000000000f2', '4a000000-0000-0000-0000-00000000004a',
   'd2000000-0000-0000-0000-0000000000e2', null,
   'Genel Tekrar', current_date - 1, current_date + 5);

-- Veri düzeyi ------------------------------------------------------------------

select throws_ok(
  $sql$insert into public.homework_assignments
      (organization_id, class_id, title, due_date)
    values ('4a000000-0000-0000-0000-00000000004a', 'd3000000-0000-0000-0000-0000000000e3',
            'Sızdırılan Ödev', current_date + 1)$sql$,
  '23503',
  null,
  'homework cannot be assigned to another organization class'
);

select throws_ok(
  $sql$insert into public.homework_assignments
      (organization_id, class_id, title, assigned_on, due_date)
    values ('4a000000-0000-0000-0000-00000000004a', 'd1000000-0000-0000-0000-0000000000e1',
            'Geçmişe Teslim', current_date, current_date - 1)$sql$,
  '23514',
  null,
  'homework cannot be due before it was assigned'
);

-- Aynı gün teslim edilebilir: "bugün akşama kadar" gerçek bir ödev.
select lives_ok(
  $sql$insert into public.homework_assignments
      (organization_id, class_id, title, assigned_on, due_date)
    values ('4a000000-0000-0000-0000-00000000004a', 'd1000000-0000-0000-0000-0000000000e1',
            'Bugün Akşama Kadar', current_date, current_date)$sql$,
  'homework due on the day it is assigned is allowed'
);

select throws_ok(
  $sql$insert into public.homework_assignments
      (organization_id, class_id, title, due_date)
    values ('4a000000-0000-0000-0000-00000000004a', 'd1000000-0000-0000-0000-0000000000e1',
            '   ', current_date + 1)$sql$,
  '23514',
  null,
  'a blank title is not a homework assignment'
);

create function pg_temp.silmeyi_dene(org uuid, actor uuid)
returns text
language plpgsql
as $fn$
declare
  gerekce text;
begin
  perform public.internal_delete_organization(org, actor);
  return null;
exception when sqlstate 'ORB01' then
  get stacked diagnostics gerekce = pg_exception_detail;
  return gerekce;
end;
$fn$;

select ok(
  pg_temp.silmeyi_dene(
    '4a000000-0000-0000-0000-00000000004a',
    '08000000-0000-0000-0000-000000000008'
  )::jsonb @> '[{"table": "homework_assignments", "rows": 3}]'::jsonb,
  'the deletion guard counts homework without being told about it'
);

-- Atanmış öğretmen ----------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '92000000-0000-0000-0000-000000000092', true);

select lives_ok(
  $sql$insert into public.homework_assignments
      (organization_id, class_id, title, due_date)
    values ('4a000000-0000-0000-0000-00000000004a', 'd1000000-0000-0000-0000-0000000000e1',
            'Öğretmenin Verdiği Ödev', current_date + 7)$sql$,
  'an assigned teacher can give homework to their own class'
);

select is(
  (select assigned_by_membership_id from public.homework_assignments
     where title = 'Öğretmenin Verdiği Ödev'),
  '92200000-0000-0000-0000-0000000022a9'::uuid,
  'the assigner is filled from the caller identity, not from what the client sent'
);

select throws_ok(
  $sql$update public.homework_assignments
      set assigned_by_membership_id = '91100000-0000-0000-0000-0000000011a9'
      where title = 'Öğretmenin Verdiği Ödev'$sql$,
  '42501',
  null,
  'nobody can claim someone else gave the homework'
);

select throws_ok(
  $sql$insert into public.homework_assignments
      (organization_id, class_id, title, due_date)
    values ('4a000000-0000-0000-0000-00000000004a', 'd2000000-0000-0000-0000-0000000000e2',
            'Başka Sınıfa Ödev', current_date + 7)$sql$,
  '42501',
  null,
  'a teacher cannot give homework to a class they are not assigned to'
);

select is(
  (select count(*) from public.homework_assignments),
  3::bigint,
  'a teacher sees only the homework of the class they teach'
);

-- Atanmamış öğretmen ------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '93000000-0000-0000-0000-000000000093', true);

select is(
  (select count(*) from public.homework_assignments),
  0::bigint,
  'a teacher with no class assignment sees no homework at all'
);

select throws_ok(
  $sql$insert into public.homework_assignments
      (organization_id, class_id, title, due_date)
    values ('4a000000-0000-0000-0000-00000000004a', 'd1000000-0000-0000-0000-0000000000e1',
            'Atanmamış Öğretmenin Ödevi', current_date + 7)$sql$,
  '42501',
  null,
  'an unassigned teacher cannot give homework — the right comes from the assignment, not the role'
);

-- Kurum yöneticisi ----------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000091', true);

select is(
  (select count(*) from public.homework_assignments),
  4::bigint,
  'an admin sees every homework assignment in their organization'
);

select lives_ok(
  $sql$insert into public.homework_assignments
      (organization_id, class_id, title, due_date)
    values ('4a000000-0000-0000-0000-00000000004a', 'd2000000-0000-0000-0000-0000000000e2',
            'Yöneticinin Verdiği Ödev', current_date + 7)$sql$,
  'an admin can give homework to any class in their organization'
);

select throws_ok(
  $sql$delete from public.homework_assignments$sql$,
  '42501',
  null,
  'nobody deletes homework through the API'
);

-- Öğrenci ve veli -------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '94000000-0000-0000-0000-000000000094', true);

select is(
  (select count(*) from public.homework_assignments),
  3::bigint,
  'a student sees the homework of the class they attend'
);

select is(
  (select count(*) from public.homework_assignments
     where class_id = 'd2000000-0000-0000-0000-0000000000e2'),
  0::bigint,
  'and none of another class homework'
);

select set_config('request.jwt.claim.sub', '95000000-0000-0000-0000-000000000095', true);

select is(
  (select count(*) from public.homework_assignments),
  3::bigint,
  'a guardian sees the homework of their child class'
);

-- Kilit ve anon ----------------------------------------------------------------------------

reset role;
update public.profiles set must_change_password = true
where id = '91000000-0000-0000-0000-000000000091';

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000091', true);

select is(
  (select count(*) from public.homework_assignments),
  0::bigint,
  'an admin who must change their password reads no homework'
);

reset role;
set local role anon;

select throws_ok(
  $sql$select * from public.homework_assignments$sql$,
  '42501',
  null,
  'anon cannot read homework'
);

select * from finish();
rollback;
