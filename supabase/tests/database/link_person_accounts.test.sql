-- v1.4-00 — Akademik kayıt ile giriş hesabının bağlanması (#261).
--
-- Bu dosyanın çoğu **olumsuz**: bağlamanın ne zaman REDDEDİLDİĞİNİ kanıtlıyor.
-- Sebebi şu: fazla açık yazılmış bir bağlama fonksiyonu olumlu testlerin
-- hepsini geçer. "Yönetici kendi öğrencisini bağlayabiliyor mu" sorusu, başka
-- kurumun üyeliğini de kabul eden bir dünyada da "evet" der.
--
-- Üç red sınıfı ayrı ayrı ölçülüyor, çünkü istemcinin cevabı üçünde farklı:
--   * `42501` → "senin yetkin yok"
--   * `ORB03` → "başka bir üyelik seç" (yanlış rol veya yanlış kurum)
--   * `ORB04` → "önce mevcut bağı çöz"
--
-- Ayrıca **K-13**: engelin sonucu ölçülüyor. Bağlamanın gerçekleştiği her
-- yerde `auth_user_id`'nin son değeri ve denetim kaydının sayısı okunuyor;
-- "hata fırlatmadı" tek başına kanıt sayılmadı.

begin;

create extension if not exists pgtap with schema extensions;
select plan(37);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'sube-yoneticisi@example.test', '', now(), now()),
  ('a2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'kurum-yoneticisi@example.test', '', now(), now()),
  ('a3000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogretmen@example.test', '', now(), now()),
  ('a4000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogrenci-bir@example.test', '', now(), now()),
  ('a5000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'veli@example.test', '', now(), now()),
  ('a6000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogrenci-iki@example.test', '', now(), now()),
  ('a7000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogrenci-uc@example.test', '', now(), now()),
  ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'diger-kurum-yoneticisi@example.test', '', now(), now()),
  ('b2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'diger-kurum-ogrencisi@example.test', '', now(), now());

insert into public.organizations (id, name, slug, code)
values
  ('aa000000-0000-0000-0000-0000000000aa', 'Kurum A', 'kurum-a-v140', 7101),
  ('bb000000-0000-0000-0000-0000000000bb', 'Kurum B', 'kurum-b-v140', 7102);

insert into public.branches (id, organization_id, name, is_default)
values
  ('a1100000-0000-0000-0000-0000000011a1', 'aa000000-0000-0000-0000-0000000000aa', 'A Merkez', true),
  ('a2200000-0000-0000-0000-0000000022a2', 'aa000000-0000-0000-0000-0000000000aa', 'A İkinci Şube', false),
  ('b1100000-0000-0000-0000-0000000011b1', 'bb000000-0000-0000-0000-0000000000bb', 'B Merkez', true);

-- Şube yöneticisinin `branch_id`'si dolu, kurum yöneticisininki NULL. Fark
-- testlerin konusu: ilki yalnız kendi şubesindeki kaydı bağlayabilmeli.
insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('31000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-0000000000aa',
   'a1100000-0000-0000-0000-0000000011a1', 'a1000000-0000-0000-0000-000000000001',
   'admin', 'active', 1000),
  ('31000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-0000000000aa',
   null, 'a2000000-0000-0000-0000-000000000002', 'admin', 'active', 1001),
  ('31000000-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-0000000000aa',
   'a1100000-0000-0000-0000-0000000011a1', 'a3000000-0000-0000-0000-000000000003',
   'teacher', 'active', 1002),
  ('31000000-0000-0000-0000-000000000004', 'aa000000-0000-0000-0000-0000000000aa',
   'a1100000-0000-0000-0000-0000000011a1', 'a4000000-0000-0000-0000-000000000004',
   'student', 'active', 1003),
  ('31000000-0000-0000-0000-000000000005', 'aa000000-0000-0000-0000-0000000000aa',
   'a1100000-0000-0000-0000-0000000011a1', 'a6000000-0000-0000-0000-000000000006',
   'student', 'active', 1004),
  ('31000000-0000-0000-0000-000000000006', 'aa000000-0000-0000-0000-0000000000aa',
   'a1100000-0000-0000-0000-0000000011a1', 'a5000000-0000-0000-0000-000000000005',
   'parent', 'active', 1005),
  ('31000000-0000-0000-0000-000000000009', 'aa000000-0000-0000-0000-0000000000aa',
   'a1100000-0000-0000-0000-0000000011a1', 'a7000000-0000-0000-0000-000000000007',
   'student', 'active', 1006),
  ('31000000-0000-0000-0000-000000000007', 'bb000000-0000-0000-0000-0000000000bb',
   'b1100000-0000-0000-0000-0000000011b1', 'b1000000-0000-0000-0000-000000000001',
   'admin', 'active', 1000),
  ('31000000-0000-0000-0000-000000000008', 'bb000000-0000-0000-0000-0000000000bb',
   'b1100000-0000-0000-0000-0000000011b1', 'b2000000-0000-0000-0000-000000000002',
   'student', 'active', 1001);

insert into public.students (id, organization_id, branch_id, auth_user_id, full_name, archived_at)
values
  ('50000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-0000000000aa',
   'a1100000-0000-0000-0000-0000000011a1', null, 'Merkezdeki Öğrenci', null),
  ('50000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-0000000000aa',
   'a2200000-0000-0000-0000-0000000022a2', null, 'İkinci Şubedeki Öğrenci', null),
  ('50000000-0000-0000-0000-000000000004', 'aa000000-0000-0000-0000-0000000000aa',
   'a1100000-0000-0000-0000-0000000011a1', null, 'Merkezdeki İkinci Öğrenci', null),
  -- Arşivde duran ve BAĞLI bir kayıt: küresel tekillik indeksi yüzünden bu
  -- satır, a7'nin başka bir kayda bağlanmasını engelliyor.
  ('50000000-0000-0000-0000-000000000005', 'aa000000-0000-0000-0000-0000000000aa',
   'a1100000-0000-0000-0000-0000000011a1', 'a7000000-0000-0000-0000-000000000007',
   'Arşivlenmiş Öğrenci', now()),
  ('50000000-0000-0000-0000-000000000003', 'bb000000-0000-0000-0000-0000000000bb',
   'b1100000-0000-0000-0000-0000000011b1', null, 'Diğer Kurumun Öğrencisi', null);

insert into public.guardians (id, organization_id, auth_user_id, full_name)
values
  ('60000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-0000000000aa', null, 'Bağlanacak Veli'),
  ('60000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-0000000000aa', null, 'İkinci Veli');

-- Giriş yapmamış çağıran ------------------------------------------------------

set local role anon;

select throws_ok(
  $sql$select public.link_student_account(
    '50000000-0000-0000-0000-000000000001',
    '31000000-0000-0000-0000-000000000004'
  )$sql$,
  '42501',
  null,
  'anon cannot call the student link function'
);

-- Yetkisiz roller -------------------------------------------------------------

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'a3000000-0000-0000-0000-000000000003', true);

select throws_ok(
  $sql$select public.link_student_account(
    '50000000-0000-0000-0000-000000000001',
    '31000000-0000-0000-0000-000000000004'
  )$sql$,
  '42501',
  null,
  'a teacher cannot link a student account'
);

select throws_ok(
  $sql$select public.link_guardian_account(
    '60000000-0000-0000-0000-000000000001',
    '31000000-0000-0000-0000-000000000006'
  )$sql$,
  '42501',
  null,
  'a teacher cannot link a guardian account either'
);

select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000001', true);

select throws_ok(
  $sql$select public.link_student_account(
    '50000000-0000-0000-0000-000000000001',
    '31000000-0000-0000-0000-000000000004'
  )$sql$,
  '42501',
  null,
  'an admin of another organization cannot link this student'
);

-- Kurum yöneticisi: bağlama ---------------------------------------------------

select set_config('request.jwt.claim.sub', 'a2000000-0000-0000-0000-000000000002', true);

select lives_ok(
  $sql$select public.link_student_account(
    '50000000-0000-0000-0000-000000000001',
    '31000000-0000-0000-0000-000000000004'
  )$sql$,
  'an organization admin links a student record to a student membership'
);

select is(
  (select auth_user_id from public.students where id = '50000000-0000-0000-0000-000000000001'),
  'a4000000-0000-0000-0000-000000000004'::uuid,
  'the link is actually written to the row'
);

select is(
  (select count(*) from public.audit_events
   where action = 'student.account_linked'
     and entity_id = '50000000-0000-0000-0000-000000000001'),
  1::bigint,
  'linking writes exactly one audit event'
);

select is(
  (select metadata ->> 'person_code' from public.audit_events
   where action = 'student.account_linked'
     and entity_id = '50000000-0000-0000-0000-000000000001'),
  '1003',
  'the audit event carries the person code of the linked membership'
);

-- Tekrarlanan istek ikinci bir istek değil ------------------------------------

select lives_ok(
  $sql$select public.link_student_account(
    '50000000-0000-0000-0000-000000000001',
    '31000000-0000-0000-0000-000000000004'
  )$sql$,
  'linking the same membership again is a silent no-op'
);

select is(
  (select count(*) from public.audit_events
   where action = 'student.account_linked'
     and entity_id = '50000000-0000-0000-0000-000000000001'),
  1::bigint,
  'the no-op writes no second audit event'
);

-- Redler ----------------------------------------------------------------------

select throws_ok(
  $sql$select public.link_student_account(
    '50000000-0000-0000-0000-000000000002',
    '31000000-0000-0000-0000-000000000004'
  )$sql$,
  'ORB04',
  null,
  'an account already linked elsewhere cannot be linked again'
);

select throws_ok(
  $sql$select public.link_student_account(
    '50000000-0000-0000-0000-000000000001',
    '31000000-0000-0000-0000-000000000005'
  )$sql$,
  'ORB04',
  null,
  'a record that already carries an account rejects a second one'
);

select throws_ok(
  $sql$select public.link_student_account(
    '50000000-0000-0000-0000-000000000002',
    '31000000-0000-0000-0000-000000000006'
  )$sql$,
  'ORB03',
  null,
  'a parent membership cannot be linked to a student record'
);

select throws_ok(
  $sql$select public.link_student_account(
    '50000000-0000-0000-0000-000000000002',
    '31000000-0000-0000-0000-000000000008'
  )$sql$,
  'ORB03',
  null,
  'a membership from another organization cannot be linked'
);

select throws_ok(
  $sql$select public.link_student_account(
    '50000000-0000-0000-0000-0000000000ff',
    '31000000-0000-0000-0000-000000000005'
  )$sql$,
  '23503',
  null,
  'a student record that does not exist is refused'
);

select throws_ok(
  $sql$select public.link_student_account(
    '50000000-0000-0000-0000-000000000002',
    '31000000-0000-0000-0000-0000000000ff'
  )$sql$,
  '23503',
  null,
  'a membership that does not exist is refused'
);

select is(
  (select auth_user_id from public.students where id = '50000000-0000-0000-0000-000000000002'),
  null::uuid,
  'none of the refused calls left a link behind'
);

-- Şube yöneticisinin sınırı ---------------------------------------------------

select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);

select throws_ok(
  $sql$select public.link_student_account(
    '50000000-0000-0000-0000-000000000002',
    '31000000-0000-0000-0000-000000000005'
  )$sql$,
  '42501',
  null,
  'a branch admin cannot link a student of another branch'
);

select lives_ok(
  $sql$select public.link_student_account(
    '50000000-0000-0000-0000-000000000004',
    '31000000-0000-0000-0000-000000000005'
  )$sql$,
  'a branch admin links a student of their own branch'
);

select is(
  (select auth_user_id from public.students where id = '50000000-0000-0000-0000-000000000004'),
  'a6000000-0000-0000-0000-000000000006'::uuid,
  'the branch admin link is written'
);

-- Bağı çözme ------------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'a2000000-0000-0000-0000-000000000002', true);

select lives_ok(
  $sql$select public.unlink_student_account('50000000-0000-0000-0000-000000000001')$sql$,
  'an organization admin unlinks a student account'
);

select is(
  (select auth_user_id from public.students where id = '50000000-0000-0000-0000-000000000001'),
  null::uuid,
  'the link is actually removed from the row'
);

select is(
  (select count(*) from public.audit_events
   where action = 'student.account_unlinked'
     and entity_id = '50000000-0000-0000-0000-000000000001'),
  1::bigint,
  'unlinking writes exactly one audit event'
);

select lives_ok(
  $sql$select public.unlink_student_account('50000000-0000-0000-0000-000000000001')$sql$,
  'unlinking an already unlinked record is a silent no-op'
);

select is(
  (select count(*) from public.audit_events
   where action = 'student.account_unlinked'
     and entity_id = '50000000-0000-0000-0000-000000000001'),
  1::bigint,
  'the unlink no-op writes no second audit event'
);

-- Arşivlenmiş kayıt: bağlanamaz ama ÇÖZÜLEBİLİR -------------------------------
--
-- Küresel tekillik indeksi yüzünden arşivde bağlı kalan bir satır, o hesabı
-- kalıcı olarak kilitler. Çözmenin arşivde de çalışması bu yüzden bilinçli.

select throws_ok(
  $sql$select public.link_student_account(
    '50000000-0000-0000-0000-000000000005',
    '31000000-0000-0000-0000-000000000009'
  )$sql$,
  '23503',
  null,
  'an archived record is invisible to linking'
);

select lives_ok(
  $sql$select public.unlink_student_account('50000000-0000-0000-0000-000000000005')$sql$,
  'an archived record can still be unlinked'
);

select is(
  (select auth_user_id from public.students where id = '50000000-0000-0000-0000-000000000005'),
  null::uuid,
  'the archived record releases its account'
);

select lives_ok(
  $sql$select public.link_student_account(
    '50000000-0000-0000-0000-000000000002',
    '31000000-0000-0000-0000-000000000009'
  )$sql$,
  'the released account can now be linked to another record'
);

-- Veli tarafı -----------------------------------------------------------------

select lives_ok(
  $sql$select public.link_guardian_account(
    '60000000-0000-0000-0000-000000000001',
    '31000000-0000-0000-0000-000000000006'
  )$sql$,
  'an organization admin links a guardian record to a parent membership'
);

select is(
  (select auth_user_id from public.guardians where id = '60000000-0000-0000-0000-000000000001'),
  'a5000000-0000-0000-0000-000000000005'::uuid,
  'the guardian link is written'
);

select throws_ok(
  $sql$select public.link_guardian_account(
    '60000000-0000-0000-0000-000000000002',
    '31000000-0000-0000-0000-000000000004'
  )$sql$,
  'ORB03',
  null,
  'a student membership cannot be linked to a guardian record'
);

select lives_ok(
  $sql$select public.unlink_guardian_account('60000000-0000-0000-0000-000000000001')$sql$,
  'an organization admin unlinks a guardian account'
);

select is(
  (select auth_user_id from public.guardians where id = '60000000-0000-0000-0000-000000000001'),
  null::uuid,
  'the guardian link is actually removed'
);

-- Zorunlu şifre değişimi kilidi -----------------------------------------------

reset role;
update public.profiles
set must_change_password = true
where id = 'a2000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2000000-0000-0000-0000-000000000002', true);

select throws_ok(
  $sql$select public.link_student_account(
    '50000000-0000-0000-0000-000000000001',
    '31000000-0000-0000-0000-000000000004'
  )$sql$,
  '42501',
  null,
  'an admin who must change their password cannot link'
);

select throws_ok(
  $sql$select public.unlink_student_account('50000000-0000-0000-0000-000000000004')$sql$,
  '42501',
  null,
  'an admin who must change their password cannot unlink either'
);

-- Ölçüt fonksiyonu dışarıya kapalı --------------------------------------------

select throws_ok(
  $sql$select public.membership_may_be_linked(
    '31000000-0000-0000-0000-000000000004',
    'aa000000-0000-0000-0000-0000000000aa',
    'student'::public.app_role
  )$sql$,
  '42501',
  null,
  'the eligibility helper is not callable by authenticated'
);

select * from finish();
rollback;
