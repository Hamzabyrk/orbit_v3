-- v1.2-03 — Veli–öğrenci bağının sınırları.
--
-- Bu dosyanın en önemli testi **izolasyon** testidir: iki veli, iki öğrenci, ve
-- her velinin yalnızca kendi çocuğunu görmesi. Tek velili bir kurgu bunu
-- kanıtlayamaz — politika yanlışlıkla "bütün öğrenciler" derse de tek çocuklu
-- testte sonuç 1 çıkar ve test yeşil kalır.
--
-- İkinci önemli test, **arşivlenmiş veli kaydının kapıyı kapattığıdır.** Bağı
-- koparmanın karşılığı yoksa, kurumdan ayrılmış bir velinin erişimi sessizce
-- devam eder.

begin;

create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('e1000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'kurum-yoneticisi@example.test', '', now(), now()),
  ('e2000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogretmen@example.test', '', now(), now()),
  ('e3000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'birinci-veli@example.test', '', now(), now()),
  ('e4000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ikinci-veli@example.test', '', now(), now()),
  ('e5000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'hesabi-olan-ogrenci@example.test', '', now(), now()),
  ('f1000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'diger-kurum-yoneticisi@example.test', '', now(), now()),
  ('0d000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'platform-operatoru@example.test', '', now(), now());

insert into public.platform_operators (user_id, role, status)
values ('0d000000-0000-0000-0000-00000000000d', 'owner', 'active');

insert into public.organizations (id, name, slug, code)
values
  ('ea000000-0000-0000-0000-0000000000ea', 'Kurum A', 'kurum-a-v1203', 7201),
  ('eb000000-0000-0000-0000-0000000000eb', 'Kurum B', 'kurum-b-v1203', 7202);

insert into public.branches (id, organization_id, name, is_default)
values
  ('eaa00000-0000-0000-0000-000000000aa1', 'ea000000-0000-0000-0000-0000000000ea', 'A Merkez', true),
  ('ebb00000-0000-0000-0000-000000000bb1', 'eb000000-0000-0000-0000-0000000000eb', 'B Merkez', true);

insert into public.organization_memberships
  (organization_id, branch_id, user_id, role, status, person_code)
values
  ('ea000000-0000-0000-0000-0000000000ea', null,
   'e1000000-0000-0000-0000-0000000000e1', 'admin', 'active', 1000),
  ('ea000000-0000-0000-0000-0000000000ea', 'eaa00000-0000-0000-0000-000000000aa1',
   'e2000000-0000-0000-0000-0000000000e2', 'teacher', 'active', 1001),
  ('ea000000-0000-0000-0000-0000000000ea', 'eaa00000-0000-0000-0000-000000000aa1',
   'e3000000-0000-0000-0000-0000000000e3', 'parent', 'active', 1002),
  ('ea000000-0000-0000-0000-0000000000ea', 'eaa00000-0000-0000-0000-000000000aa1',
   'e4000000-0000-0000-0000-0000000000e4', 'parent', 'active', 1003),
  ('ea000000-0000-0000-0000-0000000000ea', 'eaa00000-0000-0000-0000-000000000aa1',
   'e5000000-0000-0000-0000-0000000000e5', 'student', 'active', 1004),
  ('eb000000-0000-0000-0000-0000000000eb', 'ebb00000-0000-0000-0000-000000000bb1',
   'f1000000-0000-0000-0000-0000000000f1', 'admin', 'active', 1000);

-- Birinci öğrencinin hesabı VAR, ikincisinin YOK. Soru 4'ün asıl senaryosu
-- ikincisidir: veli, hesabı olmayan çocuğunun kaydını kendi hesabından görür.
insert into public.students (id, organization_id, branch_id, auth_user_id, full_name)
values
  ('e5000000-0000-0000-0000-000000000501', 'ea000000-0000-0000-0000-0000000000ea',
   'eaa00000-0000-0000-0000-000000000aa1', 'e5000000-0000-0000-0000-0000000000e5', 'Birinci Öğrenci'),
  ('e5000000-0000-0000-0000-000000000502', 'ea000000-0000-0000-0000-0000000000ea',
   'eaa00000-0000-0000-0000-000000000aa1', null, 'İkinci Öğrenci'),
  ('e5000000-0000-0000-0000-000000000503', 'eb000000-0000-0000-0000-0000000000eb',
   'ebb00000-0000-0000-0000-000000000bb1', null, 'Diğer Kurumun Öğrencisi');

insert into public.guardians (id, organization_id, auth_user_id, full_name)
values
  ('e6000000-0000-0000-0000-000000000601', 'ea000000-0000-0000-0000-0000000000ea',
   'e3000000-0000-0000-0000-0000000000e3', 'Birinci Veli'),
  ('e6000000-0000-0000-0000-000000000602', 'ea000000-0000-0000-0000-0000000000ea',
   'e4000000-0000-0000-0000-0000000000e4', 'İkinci Veli'),
  ('e6000000-0000-0000-0000-000000000603', 'eb000000-0000-0000-0000-0000000000eb',
   null, 'Diğer Kurumun Velisi');

insert into public.classes (id, organization_id, branch_id, name, program)
values
  ('e7000000-0000-0000-0000-000000000701', 'ea000000-0000-0000-0000-0000000000ea',
   'eaa00000-0000-0000-0000-000000000aa1', 'YKS 12-A', 'YKS'),
  ('e7000000-0000-0000-0000-000000000702', 'ea000000-0000-0000-0000-0000000000ea',
   'eaa00000-0000-0000-0000-000000000aa1', 'YKS 12-B', 'YKS');

insert into public.class_enrollments (organization_id, class_id, student_id)
values
  ('ea000000-0000-0000-0000-0000000000ea', 'e7000000-0000-0000-0000-000000000701',
   'e5000000-0000-0000-0000-000000000501'),
  ('ea000000-0000-0000-0000-0000000000ea', 'e7000000-0000-0000-0000-000000000702',
   'e5000000-0000-0000-0000-000000000502');

insert into public.student_guardians (organization_id, student_id, guardian_id)
values
  ('ea000000-0000-0000-0000-0000000000ea', 'e5000000-0000-0000-0000-000000000501',
   'e6000000-0000-0000-0000-000000000601'),
  ('ea000000-0000-0000-0000-0000000000ea', 'e5000000-0000-0000-0000-000000000502',
   'e6000000-0000-0000-0000-000000000602');

-- Veri düzeyi ------------------------------------------------------------------

select throws_ok(
  $sql$insert into public.student_guardians (organization_id, student_id, guardian_id)
    values (
      'ea000000-0000-0000-0000-0000000000ea',
      'e5000000-0000-0000-0000-000000000501',
      'e6000000-0000-0000-0000-000000000603'
    )$sql$,
  '23503',
  null,
  'a guardian from another organization cannot be linked to a student'
);

select throws_ok(
  $sql$insert into public.student_guardians (organization_id, student_id, guardian_id)
    values (
      'ea000000-0000-0000-0000-0000000000ea',
      'e5000000-0000-0000-0000-000000000501',
      'e6000000-0000-0000-0000-000000000601'
    )$sql$,
  '23505',
  null,
  'the same guardian cannot be linked twice to the same student'
);

-- Velayet değişiklikleri gerçek bir durum: koparılan bağ yeniden kurulabilmeli.
select lives_ok(
  $sql$insert into public.student_guardians
      (organization_id, student_id, guardian_id, archived_at)
    values (
      'ea000000-0000-0000-0000-0000000000ea',
      'e5000000-0000-0000-0000-000000000501',
      'e6000000-0000-0000-0000-000000000602',
      now()
    )$sql$,
  'an archived link does not block re-linking the same pair later'
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
    'ea000000-0000-0000-0000-0000000000ea',
    '0d000000-0000-0000-0000-00000000000d'
  )::jsonb @> '[{"table": "student_guardians", "rows": 3}]'::jsonb,
  'the deletion guard counts the new link table without being told about it'
);

-- Kurum yöneticisi ---------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-0000000000e1', true);

select is(
  (select count(*) from public.student_guardians),
  3::bigint,
  'an admin sees every guardian link in their organization'
);

-- Birinci veli -------------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'e3000000-0000-0000-0000-0000000000e3', true);

select is(
  (select count(*) from public.students),
  1::bigint,
  'a guardian sees exactly one student — the door v1.2-01 left closed'
);

select is(
  (select id from public.students),
  'e5000000-0000-0000-0000-000000000501'::uuid,
  'the student a guardian sees is their own child'
);

select is(
  (select count(*) from public.classes),
  1::bigint,
  'a guardian sees the class their child attends'
);

select is(
  (select id from public.classes),
  'e7000000-0000-0000-0000-000000000701'::uuid,
  'the class a guardian sees is their child class, not the other one'
);

select is(
  (select count(*) from public.class_enrollments),
  1::bigint,
  'a guardian sees only their child enrollment'
);

select is(
  (select count(*) from public.student_guardians),
  1::bigint,
  'a guardian sees only their own link, not the other guardian of the same school'
);

select throws_ok(
  $sql$insert into public.student_guardians (organization_id, student_id, guardian_id)
    values (
      'ea000000-0000-0000-0000-0000000000ea',
      'e5000000-0000-0000-0000-000000000502',
      'e6000000-0000-0000-0000-000000000601'
    )$sql$,
  '42501',
  null,
  'a guardian cannot link themselves to another student'
);

-- Buradaki iddia bilinçli olarak `throws_ok` DEĞİL, sonucun kendisi.
--
-- Postgres, UPDATE'in `using` koşulu hiçbir satırı tutmadığında hata vermez —
-- sessizce sıfır satır günceller. `42501` yalnızca `with check` ihlalinde veya
-- sütun yetkisi yokken çıkar. İlk yazımda hata bekleniyordu ve test kırmızı
-- döndü; kırmızı olan politika değil beklentiydi.
--
-- Sonucu ölçmek zaten daha güçlü: hangi mekanizmayla engellendiğinden bağımsız
-- olarak kaydın **değişmediğini** kanıtlıyor.
update public.students
set full_name = 'Veli Tarafından Değiştirildi'
where id = 'e5000000-0000-0000-0000-000000000501';

select is(
  (select full_name from public.students
     where id = 'e5000000-0000-0000-0000-000000000501'),
  'Birinci Öğrenci',
  'a guardian reads their child record but cannot change it'
);

-- İkinci veli — izolasyon ----------------------------------------------------------

select set_config('request.jwt.claim.sub', 'e4000000-0000-0000-0000-0000000000e4', true);

select is(
  (select id from public.students),
  'e5000000-0000-0000-0000-000000000502'::uuid,
  'the second guardian sees their own child and not the first one'
);

select is(
  (select id from public.classes),
  'e7000000-0000-0000-0000-000000000702'::uuid,
  'the second guardian sees a different class'
);

-- Öğretmen ve öğrenci ---------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'e2000000-0000-0000-0000-0000000000e2', true);

select is(
  (select count(*) from public.student_guardians),
  0::bigint,
  'a teacher sees no guardian links — that is not their business'
);

select set_config('request.jwt.claim.sub', 'e5000000-0000-0000-0000-0000000000e5', true);

select is(
  (select count(*) from public.students),
  1::bigint,
  'a student still sees only their own record'
);

select is(
  (select count(*) from public.student_guardians),
  0::bigint,
  'a student does not read the guardian links either'
);

-- Yönetici yazma --------------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-0000000000e1', true);

select lives_ok(
  $sql$insert into public.student_guardians (organization_id, student_id, guardian_id)
    values (
      'ea000000-0000-0000-0000-0000000000ea',
      'e5000000-0000-0000-0000-000000000502',
      'e6000000-0000-0000-0000-000000000601'
    )$sql$,
  'an admin can link one guardian to a second child'
);

select throws_ok(
  $sql$update public.student_guardians
      set student_id = 'e5000000-0000-0000-0000-000000000502'
      where guardian_id = 'e6000000-0000-0000-0000-000000000601'$sql$,
  '42501',
  null,
  'a link is archived and reopened, never repointed at another student'
);

select throws_ok(
  $sql$delete from public.student_guardians$sql$,
  '42501',
  null,
  'nobody deletes a guardian link through the API'
);

-- Arşivlenmiş veli kaydı kapıyı kapatmalı ----------------------------------------------

reset role;
update public.guardians set archived_at = now()
where id = 'e6000000-0000-0000-0000-000000000602';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e4000000-0000-0000-0000-0000000000e4', true);

select is(
  (select count(*) from public.students),
  0::bigint,
  'an archived guardian record closes the door, not just the link'
);

-- Kilit ve anon --------------------------------------------------------------------------

reset role;
update public.profiles set must_change_password = true
where id = 'e1000000-0000-0000-0000-0000000000e1';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-0000000000e1', true);

select is(
  (select count(*) from public.student_guardians),
  0::bigint,
  'an admin who must change their password reads no guardian links'
);

reset role;
set local role anon;

select throws_ok(
  $sql$select * from public.student_guardians$sql$,
  '42501',
  null,
  'anon cannot read guardian links'
);

select * from finish();
rollback;
