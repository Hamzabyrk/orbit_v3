-- v1.3-01/D — Sınava kaç kişi girdiği (`exam_participant_count`).
--
-- Bu fonksiyon, istemcide yapılan bir sayımın yerine geçiyor. O sayım
-- `exam_results` satırlarını sayıyordu ve RLS satır bazlı olduğu için sonuç
-- role göre değişiyordu: öğretmen 2, öğrenci 1, yönetici 3 — sınava giren
-- üç kişi olduğu halde.
--
-- Bu yüzden testlerin çekirdeği tek bir soru: **aynı sınav için herkes aynı
-- ve doğru sayıyı alıyor mu?**
--
--   1. Öğretmen RLS ile iki satır görüyor — tuzağın kendisi ölçülüyor.
--   2. Öğretmen yine de 3 alıyor.
--   3. Öğrenci 3 alıyor — göreceği satır sayısı 1 olduğu halde.
--   4. Yönetici 3 alıyor (gerileme koruması).
--   5. ⛔ Arşivlenmiş sınav `null` döner.
--   6. ⛔ Sınavda kimseyi görmeyen üyeye dönen değer `0` DEĞİL: `0`, "bu
--      sınava kimse girmedi" demektir ve bu bir iddiadır (K-22). Susmak
--      yanlış cevap değildir.
--   7. ⛔ Başka kurumun üyesi `null` döner.
--
-- Altıncısı ayrı duruyor çünkü `count(*)` boş kümede kendiliğinden `0`
-- verir: `null` dönmesi fonksiyonun bilinçli kararıdır ve biri
-- "sadeleştirirken" o `case`'i düşürürse yalnızca o test yakalar.

begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('41000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'katilimci-ogretmen@example.test', '', now(), now()),
  ('42000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'katilimci-yonetici@example.test', '', now(), now()),
  ('43000000-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'katilimci-ogrenci@example.test', '', now(), now()),
  ('44000000-0000-0000-0000-000000000044', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'katilimci-ilgisiz@example.test', '', now(), now()),
  ('45000000-0000-0000-0000-000000000045', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'katilimci-yabanci@example.test', '', now(), now());

insert into public.organizations (id, name, slug, code)
values
  ('4a000000-0000-0000-0000-00000000004a', 'Katılımcı Kurumu', 'katilimci-kurumu-v1301d', 7801),
  ('4a900000-0000-0000-0000-0000000049a9', 'Yabancı Kurum', 'yabanci-kurum-v1301d', 7802);

insert into public.branches (id, organization_id, name, is_default)
values ('4b000000-0000-0000-0000-00000000004b', '4a000000-0000-0000-0000-00000000004a', 'Merkez', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('4c100000-0000-0000-0000-0000000c1001', '4a000000-0000-0000-0000-00000000004a',
   '4b000000-0000-0000-0000-00000000004b', '41000000-0000-0000-0000-000000000041', 'teacher', 'active', 4101),
  ('4c200000-0000-0000-0000-0000000c2002', '4a000000-0000-0000-0000-00000000004a', null,
   '42000000-0000-0000-0000-000000000042', 'admin', 'active', 4102),
  ('4c300000-0000-0000-0000-0000000c3003', '4a000000-0000-0000-0000-00000000004a',
   '4b000000-0000-0000-0000-00000000004b', '43000000-0000-0000-0000-000000000043', 'student', 'active', 4103),
  -- Kuruma üye ama sınavda kimseyi görmüyor: sınava girmemiş bir öğrenci.
  ('4c400000-0000-0000-0000-0000000c4004', '4a000000-0000-0000-0000-00000000004a',
   '4b000000-0000-0000-0000-00000000004b', '44000000-0000-0000-0000-000000000044', 'student', 'active', 4104),
  ('4c500000-0000-0000-0000-0000000c5005', '4a900000-0000-0000-0000-0000000049a9', null,
   '45000000-0000-0000-0000-000000000045', 'admin', 'active', 4105);

insert into public.subjects (id, organization_id, name)
values ('4d000000-0000-0000-0000-00000000004d', '4a000000-0000-0000-0000-00000000004a', 'Matematik');

insert into public.classes (id, organization_id, branch_id, name)
values
  ('4e100000-0000-0000-0000-0000000e1001', '4a000000-0000-0000-0000-00000000004a',
   '4b000000-0000-0000-0000-00000000004b', '12-A'),
  ('4e200000-0000-0000-0000-0000000e2002', '4a000000-0000-0000-0000-00000000004a',
   '4b000000-0000-0000-0000-00000000004b', '12-B');

-- Öğretmen yalnız 12-A'ya giriyor: sınava giren üç öğrenciden ikisi orada.
insert into public.class_teachers (organization_id, class_id, membership_id, subject_id)
values
  ('4a000000-0000-0000-0000-00000000004a', '4e100000-0000-0000-0000-0000000e1001',
   '4c100000-0000-0000-0000-0000000c1001', '4d000000-0000-0000-0000-00000000004d');

insert into public.students (id, organization_id, branch_id, full_name, auth_user_id)
values
  ('4f100000-0000-0000-0000-0000000f1001', '4a000000-0000-0000-0000-00000000004a',
   '4b000000-0000-0000-0000-00000000004b', 'Kendi Hesabı Olan', '43000000-0000-0000-0000-000000000043'),
  ('4f200000-0000-0000-0000-0000000f2002', '4a000000-0000-0000-0000-00000000004a',
   '4b000000-0000-0000-0000-00000000004b', 'Aynı Sınıf', null),
  ('4f300000-0000-0000-0000-0000000f3003', '4a000000-0000-0000-0000-00000000004a',
   '4b000000-0000-0000-0000-00000000004b', 'Başka Sınıf', null),
  ('4f400000-0000-0000-0000-0000000f4004', '4a000000-0000-0000-0000-00000000004a',
   '4b000000-0000-0000-0000-00000000004b', 'Sınava Girmemiş', '44000000-0000-0000-0000-000000000044');

insert into public.class_enrollments (organization_id, class_id, student_id)
values
  ('4a000000-0000-0000-0000-00000000004a', '4e100000-0000-0000-0000-0000000e1001',
   '4f100000-0000-0000-0000-0000000f1001'),
  ('4a000000-0000-0000-0000-00000000004a', '4e100000-0000-0000-0000-0000000e1001',
   '4f200000-0000-0000-0000-0000000f2002'),
  ('4a000000-0000-0000-0000-00000000004a', '4e200000-0000-0000-0000-0000000e2002',
   '4f300000-0000-0000-0000-0000000f3003'),
  ('4a000000-0000-0000-0000-00000000004a', '4e200000-0000-0000-0000-0000000e2002',
   '4f400000-0000-0000-0000-0000000f4004');

-- Kurum geneli deneme (`class_id` null) — üç öğrenci girdi.
insert into public.exams (id, organization_id, class_id, name, exam_date, max_score)
values
  ('4aa00000-0000-0000-0000-0000000aa001', '4a000000-0000-0000-0000-00000000004a',
   null, 'Kurum Geneli Deneme', '2026-09-07', 100),
  ('4aa00000-0000-0000-0000-0000000aa002', '4a000000-0000-0000-0000-00000000004a',
   null, 'İptal Edilen Deneme', '2026-09-06', 100);

update public.exams
set archived_at = now()
where id = '4aa00000-0000-0000-0000-0000000aa002';

insert into public.exam_results (organization_id, exam_id, student_id, score)
values
  ('4a000000-0000-0000-0000-00000000004a', '4aa00000-0000-0000-0000-0000000aa001',
   '4f100000-0000-0000-0000-0000000f1001', 80),
  ('4a000000-0000-0000-0000-00000000004a', '4aa00000-0000-0000-0000-0000000aa001',
   '4f200000-0000-0000-0000-0000000f2002', 70),
  ('4a000000-0000-0000-0000-00000000004a', '4aa00000-0000-0000-0000-0000000aa001',
   '4f300000-0000-0000-0000-0000000f3003', 60),
  ('4a000000-0000-0000-0000-00000000004a', '4aa00000-0000-0000-0000-0000000aa002',
   '4f100000-0000-0000-0000-0000000f1001', 90);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Öğretmen: RLS ile iki satır görür, doğru cevap üç ------------------------------------

select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000041', true);

select is(
  (select count(*) from public.exam_results
   where exam_id = '4aa00000-0000-0000-0000-0000000aa001'),
  2::bigint,
  'the teacher can read only two of the three result rows — this is the trap'
);

select is(
  public.exam_participant_count('4aa00000-0000-0000-0000-0000000aa001'),
  3::bigint,
  'the teacher still gets three: the count belongs to the exam, not to the reader'
);

-- Öğrenci: RLS ile tek satır görür, doğru cevap yine üç --------------------------------

select set_config('request.jwt.claim.sub', '43000000-0000-0000-0000-000000000043', true);

select is(
  public.exam_participant_count('4aa00000-0000-0000-0000-0000000aa001'),
  3::bigint,
  'a student gets three, not the single row they are allowed to read'
);

-- Yönetici: gerileme koruması ---------------------------------------------------------

select set_config('request.jwt.claim.sub', '42000000-0000-0000-0000-000000000042', true);

select is(
  public.exam_participant_count('4aa00000-0000-0000-0000-0000000aa001'),
  3::bigint,
  'an admin gets three'
);

-- ⛔ Arşivlenmiş sınav ----------------------------------------------------------------

select is(
  public.exam_participant_count('4aa00000-0000-0000-0000-0000000aa002'),
  null::bigint,
  'an archived exam has no participant count'
);

-- ⛔ Sınavda kimseyi görmeyen üye: özellikle 0 DEĞİL -----------------------------------

select set_config('request.jwt.claim.sub', '44000000-0000-0000-0000-000000000044', true);

select isnt(
  coalesce(public.exam_participant_count('4aa00000-0000-0000-0000-0000000aa001'), -1::bigint),
  0::bigint,
  'a member who sees nobody is not told "nobody sat it" — a zero would be a claim'
);

-- ⛔ Başka kurumun üyesi --------------------------------------------------------------

select set_config('request.jwt.claim.sub', '45000000-0000-0000-0000-000000000045', true);

select is(
  public.exam_participant_count('4aa00000-0000-0000-0000-0000000aa001'),
  null::bigint,
  'an admin of another organization gets nothing'
);

select * from finish();
rollback;
