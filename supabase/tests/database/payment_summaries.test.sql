-- v1.3-01/E — Ödeme özetleri ve "bugün"ün saat dilimi.
--
-- Ödeme, sistemin en dar kapsamlı verisi: **yalnız yönetici ve veli görür.**
-- Öğretmen bir öğrenciyi okutuyor diye ailesinin borcunu görmez, öğrencinin
-- kendisi de görmez (v1.2-06 kararı). Bu yüzden testlerin yarısı olumsuz.
--
-- Yanlış bir ödeme durumu, yanlış bir devam yüzdesinden ağırdır: veliye
-- "borcunuz yok" demek geri alınması zor bir hatadır. Ölçülen dört şey:
--
--   1. Saat dilimi. `due_date` bir gün; "geçti" demek için bir "bugün"
--      gerekiyor ve sunucunun TimeZone ayarı UTC. Türkiye gece yarısını
--      geçtiğinde `current_date` üç saat daha dünü gösterir.
--   2. ⛔ Planı olmayan öğrenci çıktıda YOK — `overdue_count = 0` değil.
--      Sıfır "borcu yok" der; yokluk "söyleyecek bir şey yok" der.
--   3. ⛔ Öğretmen ve öğrenci hiçbir şey almaz.
--   4. ⛔ Yönetici kartları, görecek taksiti olmayan çağırana HİÇ SATIR
--      döndürmez: üç sıfır "kurumda hiç ödeme yok" derdi.

begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

-- 1 ------------------------------------------------------------------------
-- Saat dilimi hatasının kendisi. 21:30 UTC, Türkiye'de ertesi günün 00:30'u.
-- `current_date` bu anda hâlâ dünü gösterir; vadesi bugün dolan taksit üç saat
-- daha "gecikmemiş" görünürdü.

select is(
  public.orbit_local_date('2026-09-08 21:30:00+00'::timestamptz),
  '2026-09-09'::date,
  'after midnight in Istanbul the local day has already turned, though UTC has not'
);

-- Kurgu ---------------------------------------------------------------------

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('51000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'odeme-yonetici@example.test', '', now(), now()),
  ('52000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'odeme-ogretmen@example.test', '', now(), now()),
  ('53000000-0000-0000-0000-000000000053', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'odeme-ogrenci@example.test', '', now(), now()),
  ('54000000-0000-0000-0000-000000000054', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'odeme-veli@example.test', '', now(), now());

insert into public.organizations (id, name, slug, code)
values ('5a000000-0000-0000-0000-00000000005a', 'Ödeme Kurumu', 'odeme-kurumu-v1315', 7901);

insert into public.branches (id, organization_id, name, is_default)
values ('5b000000-0000-0000-0000-00000000005b', '5a000000-0000-0000-0000-00000000005a', 'Merkez', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('5c100000-0000-0000-0000-0000000c1001', '5a000000-0000-0000-0000-00000000005a', null,
   '51000000-0000-0000-0000-000000000051', 'admin', 'active', 5101),
  ('5c200000-0000-0000-0000-0000000c2002', '5a000000-0000-0000-0000-00000000005a',
   '5b000000-0000-0000-0000-00000000005b', '52000000-0000-0000-0000-000000000052', 'teacher', 'active', 5102),
  ('5c300000-0000-0000-0000-0000000c3003', '5a000000-0000-0000-0000-00000000005a',
   '5b000000-0000-0000-0000-00000000005b', '53000000-0000-0000-0000-000000000053', 'student', 'active', 5103),
  ('5c400000-0000-0000-0000-0000000c4004', '5a000000-0000-0000-0000-00000000005a',
   '5b000000-0000-0000-0000-00000000005b', '54000000-0000-0000-0000-000000000054', 'parent', 'active', 5104);

insert into public.subjects (id, organization_id, name)
values ('5d000000-0000-0000-0000-00000000005d', '5a000000-0000-0000-0000-00000000005a', 'Matematik');

insert into public.classes (id, organization_id, branch_id, name)
values ('5e100000-0000-0000-0000-0000000e1001', '5a000000-0000-0000-0000-00000000005a',
        '5b000000-0000-0000-0000-00000000005b', '12-A');

-- Öğretmen bu sınıfa giriyor: ödemeyi göremiyor olması ROLDEN değil,
-- ödemenin kapsamından geliyor. Ayrım testin can alıcı noktası.
insert into public.class_teachers (organization_id, class_id, membership_id, subject_id)
values ('5a000000-0000-0000-0000-00000000005a', '5e100000-0000-0000-0000-0000000e1001',
        '5c200000-0000-0000-0000-0000000c2002', '5d000000-0000-0000-0000-00000000005d');

insert into public.students (id, organization_id, branch_id, full_name, auth_user_id)
values
  ('5f100000-0000-0000-0000-0000000f1001', '5a000000-0000-0000-0000-00000000005a',
   '5b000000-0000-0000-0000-00000000005b', 'Planı Olan', '53000000-0000-0000-0000-000000000053'),
  ('5f200000-0000-0000-0000-0000000f2002', '5a000000-0000-0000-0000-00000000005a',
   '5b000000-0000-0000-0000-00000000005b', 'Planı Olmayan', null);

insert into public.class_enrollments (organization_id, class_id, student_id)
values
  ('5a000000-0000-0000-0000-00000000005a', '5e100000-0000-0000-0000-0000000e1001',
   '5f100000-0000-0000-0000-0000000f1001'),
  ('5a000000-0000-0000-0000-00000000005a', '5e100000-0000-0000-0000-0000000e1001',
   '5f200000-0000-0000-0000-0000000f2002');

insert into public.guardians (id, organization_id, auth_user_id, full_name)
values ('5aa00000-0000-0000-0000-0000000aa001', '5a000000-0000-0000-0000-00000000005a',
        '54000000-0000-0000-0000-000000000054', 'Veli Kişi');

insert into public.student_guardians (organization_id, student_id, guardian_id)
values ('5a000000-0000-0000-0000-00000000005a', '5f100000-0000-0000-0000-0000000f1001',
        '5aa00000-0000-0000-0000-0000000aa001');

-- İki plan: biri aktif, biri arşivli. Arşivlinin taksiti çok eski ve
-- ödenmemiş — filtre düşerse her sayıya karışır.
insert into public.payment_plans (id, organization_id, student_id, name, total_amount, archived_at)
values
  ('5bb00000-0000-0000-0000-0000000bb001', '5a000000-0000-0000-0000-00000000005a',
   '5f100000-0000-0000-0000-0000000f1001', 'YKS Paket', 7500, null),
  ('5bb00000-0000-0000-0000-0000000bb002', '5a000000-0000-0000-0000-00000000005a',
   '5f100000-0000-0000-0000-0000000f1001', 'İptal Edilen Paket', 9999, now());

-- Vadeler `orbit_today()`'e GÖRE kuruluyor: sabit tarihler yazılsaydı test
-- gelecek yıl kendiliğinden kırmızıya dönerdi.
insert into public.installments (organization_id, plan_id, sequence_no, due_date, amount, paid_at)
values
  -- vadesi 20 gün geçmiş, ödenmemiş
  ('5a000000-0000-0000-0000-00000000005a', '5bb00000-0000-0000-0000-0000000bb001',
   1, public.orbit_today() - 20, 1000, null),
  -- 60 gün sonra: yaklaşan değil
  ('5a000000-0000-0000-0000-00000000005a', '5bb00000-0000-0000-0000-0000000bb001',
   2, public.orbit_today() + 60, 2000, null),
  -- bu ay ödendi
  ('5a000000-0000-0000-0000-00000000005a', '5bb00000-0000-0000-0000-0000000bb001',
   3, public.orbit_today() - 8, 1500, now()),
  -- 3 gün sonra: yedi günlük pencerenin içinde
  ('5a000000-0000-0000-0000-00000000005a', '5bb00000-0000-0000-0000-0000000bb001',
   4, public.orbit_today() + 3, 3000, null),
  -- arşivli planın taksiti: hiçbir sayıya girmemeli
  ('5a000000-0000-0000-0000-00000000005a', '5bb00000-0000-0000-0000-0000000bb002',
   1, public.orbit_today() - 300, 9999, null);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Yönetici ------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000051', true);

-- 2 · ⛔ Planı olmayan öğrenci çıktıda hiç yok — sıfırla değil, yoklukla.
select is(
  (select count(*) from public.student_payment_summaries(
     array['5f100000-0000-0000-0000-0000000f1001',
           '5f200000-0000-0000-0000-0000000f2002']::uuid[])),
  1::bigint,
  'a student with no plan is absent from the output — not a zero saying "owes nothing"'
);

-- 3
select is(
  (select overdue_count from public.student_payment_summaries(
     array['5f100000-0000-0000-0000-0000000f1001']::uuid[])),
  1::bigint,
  'one installment is past its due date and unpaid'
);

-- 4 · ⛔ Arşivli plan özetlenmiyor. Filtre düşerse iki satır döner.
select is(
  (select count(*) from public.payment_plan_summaries(
     array['5bb00000-0000-0000-0000-0000000bb001',
           '5bb00000-0000-0000-0000-0000000bb002']::uuid[])),
  1::bigint,
  'an archived plan is not summarized even when its installment is unpaid'
);

-- 5 · "Sonraki taksit" ödenmemiş EN ERKEN taksittir — geçmişte olsa bile.
select is(
  (select next_due_date from public.payment_plan_summaries(
     array['5bb00000-0000-0000-0000-0000000bb001']::uuid[])),
  public.orbit_today() - 20,
  'the next installment is the earliest unpaid one, even though that date has passed'
);

-- 6
select is(
  (select next_due_amount from public.payment_plan_summaries(
     array['5bb00000-0000-0000-0000-0000000bb001']::uuid[])),
  1000::numeric,
  'the amount belongs to that same installment, not to another one'
);

-- Veli ----------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '54000000-0000-0000-0000-000000000054', true);

-- 7
select is(
  (select overdue_count from public.student_payment_summaries(
     array['5f100000-0000-0000-0000-0000000f1001']::uuid[])),
  1::bigint,
  'the guardian sees their own child''s overdue installment'
);

-- Öğretmen ------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '52000000-0000-0000-0000-000000000052', true);

-- 8 · ⛔ Öğretmen bu öğrenciyi OKUTUYOR ve yine de hiçbir şey almıyor.
select is(
  (select count(*) from public.student_payment_summaries(
     array['5f100000-0000-0000-0000-0000000f1001',
           '5f200000-0000-0000-0000-0000000f2002']::uuid[])),
  0::bigint,
  'a teacher gets nothing — teaching a student is not a reason to see the family''s debt'
);

-- 9 · ⛔ Plan özeti de kapalı: iki kapıdan biri açık kalırsa yeter.
select is(
  (select count(*) from public.payment_plan_summaries(
     array['5bb00000-0000-0000-0000-0000000bb001']::uuid[])),
  0::bigint,
  'the plan summary is closed to a teacher too — one open door would be enough'
);

-- 10 · ⛔ Kartlar HİÇ SATIR döndürmemeli. Üç sıfır dönseydi öğretmen
-- "kurumda hiç ödeme yok" okurdu.
select is(
  (select count(*) from public.payment_overview_counts()),
  0::bigint,
  'the overview returns no row at all — three zeros would claim the institution has no payments'
);

-- Öğrencinin kendisi --------------------------------------------------------

select set_config('request.jwt.claim.sub', '53000000-0000-0000-0000-000000000053', true);

-- 11 · ⛔ Ailenin borcu çocuğun ekranına düşmez (2026-09-04 kararı).
select is(
  (select count(*) from public.student_payment_summaries(
     array['5f100000-0000-0000-0000-0000000f1001']::uuid[])),
  0::bigint,
  'the student does not see their own family''s debt'
);

-- Yönetici kartları ---------------------------------------------------------

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000051', true);

-- 12 · Tahsilat yalnız ödenmiş taksiti sayar; yaklaşan yalnız yedi günlük
-- pencereyi. 60 gün sonrası ve arşivlinin taksiti ikisinin de dışında.
select is(
  (select collected_this_month || '|' || upcoming_count || '|' || overdue_count
   from public.payment_overview_counts()),
  '1500.00|1|1',
  'collected counts only what was paid; upcoming only the seven-day window'
);

select * from finish();
rollback;
