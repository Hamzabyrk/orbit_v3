-- v1.2-02 — Sınıf, ders ve öğretmen atamalarının sınırları.
--
-- Bu dosyanın en önemli testi, **rolü `admin` olan bir kişinin ders
-- verebildiğini** kanıtlayandır. "Ders vermek bir atama, rol değildir" kararı
-- (2026-08-25) küçük dershanenin hem yöneten hem ders veren sahibinden çıktı;
-- atama tablosu role kısıtlansaydı o kişi sisteme sığmazdı ve kimse fark
-- etmeden ikinci bir hesap açmak zorunda kalırdı.
--
-- İkinci önemli test, öğretmenin öğrenciyi **yalnızca kendi sınıfından**
-- görmesidir. v1.2-01'de öğretmen hiçbir öğrenciyi göremiyordu; kapı burada
-- açıldı ve açılırken fazla açılmadığı ölçülmeli.

begin;

create extension if not exists pgtap with schema extensions;
select plan(31);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('c1000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'kurum-yoneticisi@example.test', '', now(), now()),
  ('c2000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogretmen@example.test', '', now(), now()),
  ('c3000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'rehber-ogretmen@example.test', '', now(), now()),
  ('c4000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ders-veren-yonetici@example.test', '', now(), now()),
  ('c5000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogrenci@example.test', '', now(), now()),
  ('c6000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'veli@example.test', '', now(), now()),
  ('d1000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'diger-kurum-yoneticisi@example.test', '', now(), now()),
  ('0e000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'platform-operatoru@example.test', '', now(), now());

insert into public.platform_operators (user_id, role, status)
values ('0e000000-0000-0000-0000-00000000000e', 'owner', 'active');

insert into public.organizations (id, name, slug, code)
values
  ('ca000000-0000-0000-0000-0000000000ca', 'Kurum A', 'kurum-a-v1202', 7101),
  ('cb000000-0000-0000-0000-0000000000cb', 'Kurum B', 'kurum-b-v1202', 7102);

insert into public.branches (id, organization_id, name, is_default)
values
  ('caa00000-0000-0000-0000-000000000aa1', 'ca000000-0000-0000-0000-0000000000ca', 'A Merkez', true),
  ('cbb00000-0000-0000-0000-000000000bb1', 'cb000000-0000-0000-0000-0000000000cb', 'B Merkez', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('11100000-0000-0000-0000-000000000111', 'ca000000-0000-0000-0000-0000000000ca', null,
   'c1000000-0000-0000-0000-0000000000c1', 'admin', 'active', 1000),
  ('22200000-0000-0000-0000-000000000222', 'ca000000-0000-0000-0000-0000000000ca', 'caa00000-0000-0000-0000-000000000aa1',
   'c2000000-0000-0000-0000-0000000000c2', 'teacher', 'active', 1001),
  ('33300000-0000-0000-0000-000000000333', 'ca000000-0000-0000-0000-0000000000ca', 'caa00000-0000-0000-0000-000000000aa1',
   'c3000000-0000-0000-0000-0000000000c3', 'teacher', 'active', 1002),
  -- Rolü `admin`, ama aşağıda ders ataması da alıyor. Kararın sınandığı satır.
  ('44400000-0000-0000-0000-000000000444', 'ca000000-0000-0000-0000-0000000000ca', null,
   'c4000000-0000-0000-0000-0000000000c4', 'admin', 'active', 1003),
  ('55500000-0000-0000-0000-000000000555', 'ca000000-0000-0000-0000-0000000000ca', 'caa00000-0000-0000-0000-000000000aa1',
   'c5000000-0000-0000-0000-0000000000c5', 'student', 'active', 1004),
  ('66600000-0000-0000-0000-000000000666', 'ca000000-0000-0000-0000-0000000000ca', 'caa00000-0000-0000-0000-000000000aa1',
   'c6000000-0000-0000-0000-0000000000c6', 'parent', 'active', 1005),
  ('77700000-0000-0000-0000-000000000777', 'cb000000-0000-0000-0000-0000000000cb', 'cbb00000-0000-0000-0000-000000000bb1',
   'd1000000-0000-0000-0000-0000000000d1', 'admin', 'active', 1000);

insert into public.subjects (id, organization_id, name)
values
  ('5a000000-0000-0000-0000-00000000005a', 'ca000000-0000-0000-0000-0000000000ca', 'Matematik'),
  ('5b000000-0000-0000-0000-00000000005b', 'ca000000-0000-0000-0000-0000000000ca', 'Fizik'),
  ('5c000000-0000-0000-0000-00000000005c', 'cb000000-0000-0000-0000-0000000000cb', 'Matematik');

insert into public.classes (id, organization_id, branch_id, name, program, mentor_membership_id)
values
  ('c1a00000-0000-0000-0000-00000000c1a0', 'ca000000-0000-0000-0000-0000000000ca',
   'caa00000-0000-0000-0000-000000000aa1', 'YKS 12-A', 'YKS', null),
  ('c1b00000-0000-0000-0000-00000000c1b0', 'ca000000-0000-0000-0000-0000000000ca',
   'caa00000-0000-0000-0000-000000000aa1', 'YKS 12-B', 'YKS', '33300000-0000-0000-0000-000000000333'),
  ('c1c00000-0000-0000-0000-00000000c1c0', 'cb000000-0000-0000-0000-0000000000cb',
   'cbb00000-0000-0000-0000-000000000bb1', 'LGS 8-A', 'LGS', null);

insert into public.students (id, organization_id, branch_id, auth_user_id, full_name)
values
  ('50000000-0000-0000-0000-000000000051', 'ca000000-0000-0000-0000-0000000000ca',
   'caa00000-0000-0000-0000-000000000aa1', 'c5000000-0000-0000-0000-0000000000c5', '12-A Öğrencisi'),
  ('50000000-0000-0000-0000-000000000052', 'ca000000-0000-0000-0000-0000000000ca',
   'caa00000-0000-0000-0000-000000000aa1', null, '12-B Öğrencisi');

insert into public.class_enrollments (organization_id, class_id, student_id)
values
  ('ca000000-0000-0000-0000-0000000000ca', 'c1a00000-0000-0000-0000-00000000c1a0',
   '50000000-0000-0000-0000-000000000051'),
  ('ca000000-0000-0000-0000-0000000000ca', 'c1b00000-0000-0000-0000-00000000c1b0',
   '50000000-0000-0000-0000-000000000052');

insert into public.class_teachers (organization_id, class_id, membership_id, subject_id)
values
  ('ca000000-0000-0000-0000-0000000000ca', 'c1a00000-0000-0000-0000-00000000c1a0',
   '22200000-0000-0000-0000-000000000222', '5a000000-0000-0000-0000-00000000005a'),
  -- Rolü admin olan kişiye ders ataması.
  ('ca000000-0000-0000-0000-0000000000ca', 'c1a00000-0000-0000-0000-00000000c1a0',
   '44400000-0000-0000-0000-000000000444', '5b000000-0000-0000-0000-00000000005b');

-- Veri düzeyi: RLS'ten bağımsız duran sınırlar --------------------------------

select throws_ok(
  $sql$insert into public.class_enrollments (organization_id, class_id, student_id)
    values (
      'ca000000-0000-0000-0000-0000000000ca',
      'c1c00000-0000-0000-0000-00000000c1c0',
      '50000000-0000-0000-0000-000000000051'
    )$sql$,
  '23503',
  null,
  'a student cannot be enrolled into another organization class'
);

select throws_ok(
  $sql$insert into public.class_teachers (organization_id, class_id, membership_id, subject_id)
    values (
      'ca000000-0000-0000-0000-0000000000ca',
      'c1a00000-0000-0000-0000-00000000c1a0',
      '22200000-0000-0000-0000-000000000222',
      '5c000000-0000-0000-0000-00000000005c'
    )$sql$,
  '23503',
  null,
  'a teaching assignment cannot borrow another organization subject'
);

select throws_ok(
  $sql$update public.classes
      set mentor_membership_id = '77700000-0000-0000-0000-000000000777'
      where id = 'c1a00000-0000-0000-0000-00000000c1a0'$sql$,
  '23503',
  null,
  'a class mentor cannot be a member of another organization'
);

select throws_ok(
  $sql$insert into public.class_enrollments (organization_id, class_id, student_id)
    values (
      'ca000000-0000-0000-0000-0000000000ca',
      'c1a00000-0000-0000-0000-00000000c1a0',
      '50000000-0000-0000-0000-000000000051'
    )$sql$,
  '23505',
  null,
  'the same student cannot hold two active enrollments in one class'
);

-- Arşivlenmiş kayıt benzersizliği engellemez: yeni öğretim yılı aynı adı
-- yeniden kullanabilmeli.
select lives_ok(
  $sql$insert into public.classes (organization_id, branch_id, name, program, archived_at)
    values (
      'ca000000-0000-0000-0000-0000000000ca',
      'caa00000-0000-0000-0000-000000000aa1',
      'YKS 12-A',
      'YKS',
      now()
    )$sql$,
  'an archived class does not block reusing its name next year'
);

-- #150 içerik koruması dört yeni tabloyu da kimse listeye bir şey eklemeden
-- görmeli.
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
    'ca000000-0000-0000-0000-0000000000ca',
    '0e000000-0000-0000-0000-00000000000e'
  )::jsonb @> '[{"table": "classes", "rows": 3},
                {"table": "class_enrollments", "rows": 2},
                {"table": "class_teachers", "rows": 2},
                {"table": "subjects", "rows": 2},
                {"table": "students", "rows": 2}]'::jsonb,
  'the deletion guard already counts all four new tables'
);

-- Kurum yöneticisi ------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-0000000000c1', true);

select is(
  (select count(*) from public.classes),
  3::bigint,
  'an organization-wide admin sees every class in their organization'
);

select is(
  (select count(*) from public.classes
     where organization_id = 'cb000000-0000-0000-0000-0000000000cb'),
  0::bigint,
  'an admin cannot see another organization classes'
);

select is(
  (select count(*) from public.subjects),
  2::bigint,
  'an admin sees only their own organization subjects'
);

select lives_ok(
  $sql$insert into public.classes (organization_id, branch_id, name, program)
    values (
      'ca000000-0000-0000-0000-0000000000ca',
      'caa00000-0000-0000-0000-000000000aa1',
      'YKS 11-C',
      'YKS'
    )$sql$,
  'an admin can open a class in their own organization'
);

select throws_ok(
  $sql$insert into public.classes (organization_id, branch_id, name, program)
    values (
      'cb000000-0000-0000-0000-0000000000cb',
      'cbb00000-0000-0000-0000-000000000bb1',
      'Sızdırılan Sınıf',
      'LGS'
    )$sql$,
  '42501',
  null,
  'an admin cannot open a class in another organization'
);

select throws_ok(
  $sql$update public.classes
      set organization_id = 'cb000000-0000-0000-0000-0000000000cb'
      where id = 'c1a00000-0000-0000-0000-00000000c1a0'$sql$,
  '42501',
  null,
  'an admin cannot move a class to another organization'
);

select throws_ok(
  $sql$delete from public.classes where id = 'c1a00000-0000-0000-0000-00000000c1a0'$sql$,
  '42501',
  null,
  'nobody deletes a class through the API'
);

select throws_ok(
  $sql$update public.class_enrollments set class_id = 'c1b00000-0000-0000-0000-00000000c1b0'
      where student_id = '50000000-0000-0000-0000-000000000051'$sql$,
  '42501',
  null,
  'an enrollment is archived and reopened, never moved between classes'
);

-- Öğretmen ---------------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'c2000000-0000-0000-0000-0000000000c2', true);

select is(
  (select count(*) from public.classes),
  1::bigint,
  'a teacher sees only the classes they are assigned to'
);

select is(
  (select id from public.classes),
  'c1a00000-0000-0000-0000-00000000c1a0'::uuid,
  'the class a teacher sees is the one they teach'
);

select is(
  (select count(*) from public.students),
  1::bigint,
  'a teacher now sees students — but only those in their own class (v1.2-01 opened this door here)'
);

select is(
  (select id from public.students),
  '50000000-0000-0000-0000-000000000051'::uuid,
  'the student a teacher sees is the one enrolled in their class'
);

select is(
  (select count(*) from public.subjects),
  2::bigint,
  'a teacher reads the subject catalogue like any member'
);

select throws_ok(
  $sql$insert into public.subjects (organization_id, name) values (
      'ca000000-0000-0000-0000-0000000000ca', 'Kimya')$sql$,
  '42501',
  null,
  'a teacher cannot add a subject'
);

select throws_ok(
  $sql$insert into public.class_enrollments (organization_id, class_id, student_id)
    values (
      'ca000000-0000-0000-0000-0000000000ca',
      'c1a00000-0000-0000-0000-00000000c1a0',
      '50000000-0000-0000-0000-000000000052'
    )$sql$,
  '42501',
  null,
  'a teacher cannot enroll a student'
);

-- Rehber öğretmen ---------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'c3000000-0000-0000-0000-0000000000c3', true);

select is(
  (select count(*) from public.classes),
  1::bigint,
  'a class mentor sees their class even without a teaching assignment'
);

select is(
  (select count(*) from public.students),
  1::bigint,
  'a class mentor sees the students of the class they mentor'
);

-- Ders veren yönetici — kararın sınandığı yer ------------------------------------

select set_config('request.jwt.claim.sub', 'c4000000-0000-0000-0000-0000000000c4', true);

select ok(
  public.current_user_teaches_class('c1a00000-0000-0000-0000-00000000c1a0'),
  'a member whose role is admin can still hold a teaching assignment'
);

-- Öğrenci -------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'c5000000-0000-0000-0000-0000000000c5', true);

select is(
  (select count(*) from public.classes),
  1::bigint,
  'a student sees only the class they attend'
);

select is(
  (select count(*) from public.class_enrollments),
  1::bigint,
  'a student sees only their own enrollment'
);

-- Veli — kapsamı hâlâ v1.2-03'ü bekliyor -------------------------------------------

select set_config('request.jwt.claim.sub', 'c6000000-0000-0000-0000-0000000000c6', true);

select is(
  (select count(*) from public.classes),
  0::bigint,
  'a parent still sees no classes until the guardian link exists (v1.2-03)'
);

select is(
  (select count(*) from public.students),
  0::bigint,
  'a parent still sees no students'
);

-- Zorunlu şifre değişimi kilidi -----------------------------------------------------

reset role;
update public.profiles
set must_change_password = true
where id = 'c1000000-0000-0000-0000-0000000000c1';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-0000000000c1', true);

select is(
  (select count(*) from public.classes),
  0::bigint,
  'an admin who must change their password reads no classes'
);

-- anon -------------------------------------------------------------------------------

reset role;
set local role anon;

select throws_ok(
  $sql$select * from public.classes$sql$,
  '42501',
  null,
  'anon cannot read classes'
);

select throws_ok(
  $sql$select * from public.class_teachers$sql$,
  '42501',
  null,
  'anon cannot read teaching assignments'
);

select * from finish();
rollback;
