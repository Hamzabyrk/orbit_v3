-- v1.3-01/D — Öğrenci başına son sınav puanı (`student_latest_exam_scores`).
--
-- "Son sınav" bir **seçim**, ve yanlış seçim doğru bir sayı gibi görünür.
-- Bu yüzden testlerin çoğu seçimin kendisini sınıyor:
--
--   1. En yeni AKTİF sınav seçiliyor, eski olan değil.
--   2. ⛔ Arşivlenmiş bir sınav DAHA YENİ olsa bile seçilmiyor.
--   3. ⛔ Öğretmediği öğrencinin satırı hiç dönmüyor (RLS — bu LİSTE yolu,
--      maskeleme yok; maskeli SIRALAMA yolu `exam_ranking`'dir ve ayrıdır).
--   4. Sonucu olmayan öğrenci hiç dönmüyor — puanı `0` değil, YOK.
--
-- İkincisi özellikle sinsi: arşivlenmiş sınav genelde daha yeni olur (iptal
-- edilen son deneme gibi). Filtre unutulursa ekran, kaldırılmış bir sınavın
-- puanını "son puan" diye gösterir.

begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('31000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'puan-ogretmen@example.test', '', now(), now()),
  ('32000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'puan-yonetici@example.test', '', now(), now());

insert into public.organizations (id, name, slug, code)
values ('3a000000-0000-0000-0000-00000000003a', 'Puan Kurumu', 'puan-kurumu-v1301d', 7701);

insert into public.branches (id, organization_id, name, is_default)
values ('3b000000-0000-0000-0000-00000000003b', '3a000000-0000-0000-0000-00000000003a', 'Merkez', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('3c100000-0000-0000-0000-0000000c1001', '3a000000-0000-0000-0000-00000000003a',
   '3b000000-0000-0000-0000-00000000003b', '31000000-0000-0000-0000-000000000031', 'teacher', 'active', 3101),
  ('3c200000-0000-0000-0000-0000000c2002', '3a000000-0000-0000-0000-00000000003a', null,
   '32000000-0000-0000-0000-000000000032', 'admin', 'active', 3102);

insert into public.subjects (id, organization_id, name)
values ('3d000000-0000-0000-0000-00000000003d', '3a000000-0000-0000-0000-00000000003a', 'Matematik');

insert into public.classes (id, organization_id, branch_id, name)
values
  ('3e100000-0000-0000-0000-0000000e1001', '3a000000-0000-0000-0000-00000000003a',
   '3b000000-0000-0000-0000-00000000003b', '12-A'),
  ('3e200000-0000-0000-0000-0000000e2002', '3a000000-0000-0000-0000-00000000003a',
   '3b000000-0000-0000-0000-00000000003b', '12-B');

-- Öğretmen yalnız 12-A'ya giriyor.
insert into public.class_teachers (organization_id, class_id, membership_id, subject_id)
values
  ('3a000000-0000-0000-0000-00000000003a', '3e100000-0000-0000-0000-0000000e1001',
   '3c100000-0000-0000-0000-0000000c1001', '3d000000-0000-0000-0000-00000000003d');

insert into public.students (id, organization_id, branch_id, full_name)
values
  ('3f100000-0000-0000-0000-0000000f1001', '3a000000-0000-0000-0000-00000000003a',
   '3b000000-0000-0000-0000-00000000003b', 'Kendi Öğrencisi'),
  ('3f200000-0000-0000-0000-0000000f2002', '3a000000-0000-0000-0000-00000000003a',
   '3b000000-0000-0000-0000-00000000003b', 'Başka Öğrenci'),
  ('3f300000-0000-0000-0000-0000000f3003', '3a000000-0000-0000-0000-00000000003a',
   '3b000000-0000-0000-0000-00000000003b', 'Sınava Girmemiş');

insert into public.class_enrollments (organization_id, class_id, student_id)
values
  ('3a000000-0000-0000-0000-00000000003a', '3e100000-0000-0000-0000-0000000e1001',
   '3f100000-0000-0000-0000-0000000f1001'),
  ('3a000000-0000-0000-0000-00000000003a', '3e100000-0000-0000-0000-0000000e1001',
   '3f300000-0000-0000-0000-0000000f3003'),
  ('3a000000-0000-0000-0000-00000000003a', '3e200000-0000-0000-0000-0000000e2002',
   '3f200000-0000-0000-0000-0000000f2002');

-- Üç sınav: eski, yeni, ve ARŞİVLENMİŞ ama EN YENİ.
insert into public.exams (id, organization_id, class_id, name, exam_date, max_score)
values
  ('3aa00000-0000-0000-0000-0000000aa001', '3a000000-0000-0000-0000-00000000003a',
   '3e100000-0000-0000-0000-0000000e1001', 'Deneme 1', '2026-08-01', 100),
  ('3aa00000-0000-0000-0000-0000000aa002', '3a000000-0000-0000-0000-00000000003a',
   '3e100000-0000-0000-0000-0000000e1001', 'Deneme 2', '2026-09-01', 100),
  ('3aa00000-0000-0000-0000-0000000aa003', '3a000000-0000-0000-0000-00000000003a',
   '3e100000-0000-0000-0000-0000000e1001', 'İptal Edilen Deneme', '2026-09-05', 100),
  ('3aa00000-0000-0000-0000-0000000aa004', '3a000000-0000-0000-0000-00000000003a',
   '3e200000-0000-0000-0000-0000000e2002', 'Başka Sınıf Denemesi', '2026-09-02', 100);

update public.exams
set archived_at = now()
where id = '3aa00000-0000-0000-0000-0000000aa003';

insert into public.exam_results (organization_id, exam_id, student_id, score)
values
  ('3a000000-0000-0000-0000-00000000003a', '3aa00000-0000-0000-0000-0000000aa001',
   '3f100000-0000-0000-0000-0000000f1001', 60),
  ('3a000000-0000-0000-0000-00000000003a', '3aa00000-0000-0000-0000-0000000aa002',
   '3f100000-0000-0000-0000-0000000f1001', 84),
  -- Arşivlenmiş sınavın sonucu: en yüksek puan ve en yeni tarih. Seçilmemeli.
  ('3a000000-0000-0000-0000-00000000003a', '3aa00000-0000-0000-0000-0000000aa003',
   '3f100000-0000-0000-0000-0000000f1001', 99),
  ('3a000000-0000-0000-0000-00000000003a', '3aa00000-0000-0000-0000-0000000aa004',
   '3f200000-0000-0000-0000-0000000f2002', 70);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Öğretmen ---------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '31000000-0000-0000-0000-000000000031', true);

select is(
  (select count(*) from public.student_latest_exam_scores(
     array['3f100000-0000-0000-0000-0000000f1001',
           '3f200000-0000-0000-0000-0000000f2002',
           '3f300000-0000-0000-0000-0000000f3003']::uuid[])),
  1::bigint,
  'a teacher gets one row: their own student who has a result'
);

select is(
  (select score from public.student_latest_exam_scores(
     array['3f100000-0000-0000-0000-0000000f1001']::uuid[])),
  84::numeric,
  'the newest ACTIVE exam wins over the older one'
);

-- ⛔ Arşiv filtresi düşerse bu 99 döner: iptal edilmiş bir sınavın puanı
-- "son puan" diye gösterilirdi.
select isnt(
  (select score from public.student_latest_exam_scores(
     array['3f100000-0000-0000-0000-0000000f1001']::uuid[])),
  99::numeric,
  'an archived exam is not selected even though it is the newest'
);

select is(
  (select exam_name from public.student_latest_exam_scores(
     array['3f100000-0000-0000-0000-0000000f1001']::uuid[])),
  'Deneme 2',
  'the exam name comes from the selected exam'
);

-- ⛔ Sonucu olmayan öğrenci hiç dönmemeli: puanı 0 değil, YOK.
select is(
  (select count(*) from public.student_latest_exam_scores(
     array['3f300000-0000-0000-0000-0000000f3003']::uuid[])),
  0::bigint,
  'a student with no result is absent from the output — not a zero'
);

-- Yönetici: gerileme koruması --------------------------------------------------------

select set_config('request.jwt.claim.sub', '32000000-0000-0000-0000-000000000032', true);

select is(
  (select count(*) from public.student_latest_exam_scores(
     array['3f100000-0000-0000-0000-0000000f1001',
           '3f200000-0000-0000-0000-0000000f2002']::uuid[])),
  2::bigint,
  'an admin sees the latest score of every student in their organization'
);

select * from finish();
rollback;
