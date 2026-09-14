-- v1.4-16 — Rapor ekranının üç kartı (`report_attendance_weeks`,
-- `report_exam_averages`, `report_homework_weeks`).
--
-- Bu üç fonksiyonun ürettiği sayılar bir yöneticinin "şubeyi kapatalım mı"
-- sorusuna ve bir öğretmenin "bu sınıf geriliyor mu" sorusuna cevap olacak.
-- Yanlış bir eğilim, eksik bir listeden kötüdür: eksik liste soruyu açık
-- bırakır, yanlış eğilim kapalı ve yanlış bir cevap verir.
--
-- Bu yüzden ondan fazla iddia ayrı ayrı sınanıyor ve **çoğu olumsuz** — yani
-- bir şeyin sayılMAdığını sınıyor:
--
--   Devam:
--     1. Eksen HER ZAMAN dört hafta; yalnız ikisi ölçülmüş sayı taşıyor.
--     2. ⛔ Öğretmediği sınıfın kaydı öğretmenin sayısına GİRMİYOR (RLS);
--        aynı fonksiyon yöneticide daha büyük sayı veriyor.
--     3. ⛔ Bütün kayıtları izinli olan hafta BOŞ (NULL) geliyor
--        (payda sıfır — "%0 devam" değil, "ölçülmedi").
--     4. ⛔ Arşivli oturumun haftası boş geliyor.
--     5. ⛔ Dört haftalık pencerenin dışındaki hafta dönmüyor.
--
--   Deneme:
--     6. ⛔ Fonksiyon hiç patlamıyor — sıfır tavanlı sınav bir bölmeye
--        ulaşmıyor. Ayrı bir iddia, çünkü koruma kaldırıldığında hata
--        süitin tamamını düşürüyor (yerelde ölçüldü).
--     7. Yüzde farklı tam puanlar üzerinden doğru hesaplanıyor.
--     7. ⛔ `max_score` boş olan sınav ortalamaya GİRMİYOR.
--     8. ⛔ `max_score = 0` olan sınav GİRMİYOR — sıfıra bölmeyi şema
--        engellemiyor (`exams` üzerinde `max_score` için CHECK yok), fonksiyon
--        engelliyor (**K-04**).
--
--   Ödev:
--     9. Bitirilmiş ödevin haftası doğru (pay ve payda).
--    10. ⛔ `submissions_recorded_at` boş ödevin haftası BOŞ geliyor
--        (v1.4-15 kararı).
--    11. ⛔ Arşivli ödevin haftası boş geliyor.
--    12. Sınıftan ayrılmış ama teslim etmiş öğrenci PAYDADA — pay ile payda
--        aynı kümeden gelir (#297) ve bu yüzden pay paydayı geçemez.
--
-- Üçüncüsü özellikle önemli: `DECISION_LOG` — "Devam yüzdesinde izinli ders
-- hiç sayılmaz" kararı izinliyi ne paya ne paydaya koyuyor. Bütün dersleri
-- izinli geçen bir hafta için `0` döndürmek, o kararı sessizce bozardı.
--
-- ⚠️ İki haftalık fonksiyon HER ZAMAN dört satır döndürür — ekseni sunucu
-- kurar, istemci kendi saatiyle hafta hesaplamasın diye. Bu yüzden "o hafta
-- yok" iddiaları satır SAYARAK değil, sayıların BOŞ olduğunu sınayarak
-- yazıldı.

begin;

create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('31000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'rapor-ogretmen@example.test', '', now(), now()),
  ('32000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'rapor-yonetici@example.test', '', now(), now());

insert into public.organizations (id, name, slug, code)
values ('3a000000-0000-0000-0000-00000000003a', 'Rapor Kurumu', 'rapor-kurumu-v1416', 7616);

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

-- İki sınıf: öğretmen yalnız 12-A'ya giriyor. Bütün olumsuz iddialar bunun
-- üzerine kurulu.
insert into public.classes (id, organization_id, branch_id, name)
values
  ('3e100000-0000-0000-0000-0000000e1001', '3a000000-0000-0000-0000-00000000003a',
   '3b000000-0000-0000-0000-00000000003b', '12-A'),
  ('3e200000-0000-0000-0000-0000000e2002', '3a000000-0000-0000-0000-00000000003a',
   '3b000000-0000-0000-0000-00000000003b', '12-B');

insert into public.class_teachers (organization_id, class_id, membership_id, subject_id)
values
  ('3a000000-0000-0000-0000-00000000003a', '3e100000-0000-0000-0000-0000000e1001',
   '3c100000-0000-0000-0000-0000000c1001', '3d000000-0000-0000-0000-00000000003d');

insert into public.students (id, organization_id, branch_id, full_name)
values
  ('3f100000-0000-0000-0000-0000000f1001', '3a000000-0000-0000-0000-00000000003a',
   '3b000000-0000-0000-0000-00000000003b', 'Birinci Öğrenci'),
  ('3f200000-0000-0000-0000-0000000f2002', '3a000000-0000-0000-0000-00000000003a',
   '3b000000-0000-0000-0000-00000000003b', 'İkinci Öğrenci'),
  ('3f300000-0000-0000-0000-0000000f3003', '3a000000-0000-0000-0000-00000000003a',
   '3b000000-0000-0000-0000-00000000003b', 'Başka Sınıfın Öğrencisi'),
  ('3f400000-0000-0000-0000-0000000f4004', '3a000000-0000-0000-0000-00000000003a',
   '3b000000-0000-0000-0000-00000000003b', 'Ayrılmış Öğrenci');

-- Dördüncü öğrencinin kaydı ARŞİVLİ: sınıftan ayrıldı ama ödevi teslim etmişti.
insert into public.class_enrollments (organization_id, class_id, student_id, archived_at)
values
  ('3a000000-0000-0000-0000-00000000003a', '3e100000-0000-0000-0000-0000000e1001',
   '3f100000-0000-0000-0000-0000000f1001', null),
  ('3a000000-0000-0000-0000-00000000003a', '3e100000-0000-0000-0000-0000000e1001',
   '3f200000-0000-0000-0000-0000000f2002', null),
  ('3a000000-0000-0000-0000-00000000003a', '3e200000-0000-0000-0000-0000000e2002',
   '3f300000-0000-0000-0000-0000000f3003', null),
  ('3a000000-0000-0000-0000-00000000003a', '3e100000-0000-0000-0000-0000000e1001',
   '3f400000-0000-0000-0000-0000000f4004', now());

-- ---------------------------------------------------------------------------
-- Yoklama — tarihler `orbit_today()`'e göre RELATİF kuruluyor
-- ---------------------------------------------------------------------------
--
-- Sabit tarih yazılamaz: fonksiyonun penceresi bugüne göre kayıyor, sabit
-- tarihli bir kurgu birkaç hafta sonra sessizce pencerenin dışına düşer ve
-- test "yeşil" kalırken hiçbir şeyi sınamaz olurdu.
--
-- `date_trunc('week', ...)` pazartesiyi verir; bu haftanın pazartesi'si her
-- zaman bugünden küçük ya da bugüne eşittir, yani geçmiştedir.

insert into public.attendance_sessions (id, organization_id, class_id, session_date)
values
  -- Bu hafta · 12-A
  ('3aa00000-0000-0000-0000-0000000aa001', '3a000000-0000-0000-0000-00000000003a',
   '3e100000-0000-0000-0000-0000000e1001', date_trunc('week', public.orbit_today())::date),
  -- Bu hafta · 12-B (öğretmen bunu görmemeli)
  ('3aa00000-0000-0000-0000-0000000aa002', '3a000000-0000-0000-0000-00000000003a',
   '3e200000-0000-0000-0000-0000000e2002', date_trunc('week', public.orbit_today())::date),
  -- Geçen hafta · 12-A
  ('3aa00000-0000-0000-0000-0000000aa003', '3a000000-0000-0000-0000-00000000003a',
   '3e100000-0000-0000-0000-0000000e1001', date_trunc('week', public.orbit_today())::date - 6),
  -- İki hafta önce · 12-A · YALNIZ İZİNLİ
  ('3aa00000-0000-0000-0000-0000000aa004', '3a000000-0000-0000-0000-00000000003a',
   '3e100000-0000-0000-0000-0000000e1001', date_trunc('week', public.orbit_today())::date - 13),
  -- Üç hafta önce · 12-A · ARŞİVLİ oturum
  ('3aa00000-0000-0000-0000-0000000aa005', '3a000000-0000-0000-0000-00000000003a',
   '3e100000-0000-0000-0000-0000000e1001', date_trunc('week', public.orbit_today())::date - 20),
  -- Dört hafta önce · 12-A · PENCERENİN DIŞINDA
  ('3aa00000-0000-0000-0000-0000000aa006', '3a000000-0000-0000-0000-00000000003a',
   '3e100000-0000-0000-0000-0000000e1001', date_trunc('week', public.orbit_today())::date - 27);

update public.attendance_sessions
set archived_at = now()
where id = '3aa00000-0000-0000-0000-0000000aa005';

insert into public.attendance_records (organization_id, session_id, student_id, status)
values
  ('3a000000-0000-0000-0000-00000000003a', '3aa00000-0000-0000-0000-0000000aa001',
   '3f100000-0000-0000-0000-0000000f1001', 'present'),
  ('3a000000-0000-0000-0000-00000000003a', '3aa00000-0000-0000-0000-0000000aa001',
   '3f200000-0000-0000-0000-0000000f2002', 'present'),
  ('3a000000-0000-0000-0000-00000000003a', '3aa00000-0000-0000-0000-0000000aa002',
   '3f300000-0000-0000-0000-0000000f3003', 'present'),
  ('3a000000-0000-0000-0000-00000000003a', '3aa00000-0000-0000-0000-0000000aa003',
   '3f100000-0000-0000-0000-0000000f1001', 'present'),
  ('3a000000-0000-0000-0000-00000000003a', '3aa00000-0000-0000-0000-0000000aa003',
   '3f200000-0000-0000-0000-0000000f2002', 'absent'),
  ('3a000000-0000-0000-0000-00000000003a', '3aa00000-0000-0000-0000-0000000aa004',
   '3f100000-0000-0000-0000-0000000f1001', 'excused'),
  ('3a000000-0000-0000-0000-00000000003a', '3aa00000-0000-0000-0000-0000000aa004',
   '3f200000-0000-0000-0000-0000000f2002', 'excused'),
  ('3a000000-0000-0000-0000-00000000003a', '3aa00000-0000-0000-0000-0000000aa005',
   '3f100000-0000-0000-0000-0000000f1001', 'present'),
  ('3a000000-0000-0000-0000-00000000003a', '3aa00000-0000-0000-0000-0000000aa006',
   '3f100000-0000-0000-0000-0000000f1001', 'present');

-- ---------------------------------------------------------------------------
-- Sınavlar — üçü de kurum geneli (`class_id` boş), biri tavansız, biri sıfır tavanlı
-- ---------------------------------------------------------------------------

insert into public.exams (id, organization_id, class_id, name, exam_date, max_score)
values
  ('3ba00000-0000-0000-0000-0000000ba001', '3a000000-0000-0000-0000-00000000003a',
   null, 'Deneme 1', public.orbit_today() - 3, 100),
  ('3ba00000-0000-0000-0000-0000000ba002', '3a000000-0000-0000-0000-00000000003a',
   null, 'Tavansız Deneme', public.orbit_today() - 2, null),
  ('3ba00000-0000-0000-0000-0000000ba003', '3a000000-0000-0000-0000-00000000003a',
   null, 'Sıfır Tavanlı Deneme', public.orbit_today() - 1, 0);

insert into public.exam_results (organization_id, exam_id, student_id, score)
values
  ('3a000000-0000-0000-0000-00000000003a', '3ba00000-0000-0000-0000-0000000ba001',
   '3f100000-0000-0000-0000-0000000f1001', 50),
  ('3a000000-0000-0000-0000-00000000003a', '3ba00000-0000-0000-0000-0000000ba001',
   '3f200000-0000-0000-0000-0000000f2002', 100),
  ('3a000000-0000-0000-0000-00000000003a', '3ba00000-0000-0000-0000-0000000ba001',
   '3f300000-0000-0000-0000-0000000f3003', 100),
  ('3a000000-0000-0000-0000-00000000003a', '3ba00000-0000-0000-0000-0000000ba002',
   '3f100000-0000-0000-0000-0000000f1001', 80),
  ('3a000000-0000-0000-0000-00000000003a', '3ba00000-0000-0000-0000-0000000ba003',
   '3f100000-0000-0000-0000-0000000f1001', 0);

-- ---------------------------------------------------------------------------
-- Ödevler
-- ---------------------------------------------------------------------------

-- ⚠️ `assigned_on` açıkça yazılıyor: varsayılanı `CURRENT_DATE` ve
-- `homework_assignments_due_check` teslim tarihinin veriliş tarihinden önce
-- olmasını reddediyor (yerelde ölçüldü). Geçmiş haftalara ödev kurgulamak,
-- verilme tarihini de geçmişe koymayı gerektiriyor.
insert into public.homework_assignments
  (id, organization_id, class_id, title, assigned_on, due_date,
   submissions_recorded_at, archived_at)
values
  -- Geçen hafta · işaretlemesi BİTMİŞ
  ('3ca00000-0000-0000-0000-0000000ca001', '3a000000-0000-0000-0000-00000000003a',
   '3e100000-0000-0000-0000-0000000e1001', 'Geçen haftanın ödevi',
   date_trunc('week', public.orbit_today())::date - 7,
   date_trunc('week', public.orbit_today())::date - 6, now(), null),
  -- İki hafta önce · işaretlemesi BİTMEMİŞ
  ('3ca00000-0000-0000-0000-0000000ca002', '3a000000-0000-0000-0000-00000000003a',
   '3e100000-0000-0000-0000-0000000e1001', 'Yarım işaretlenmiş ödev',
   date_trunc('week', public.orbit_today())::date - 14,
   date_trunc('week', public.orbit_today())::date - 13, null, null),
  -- Üç hafta önce · ARŞİVLİ
  ('3ca00000-0000-0000-0000-0000000ca003', '3a000000-0000-0000-0000-00000000003a',
   '3e100000-0000-0000-0000-0000000e1001', 'Arşivlenmiş ödev',
   date_trunc('week', public.orbit_today())::date - 21,
   date_trunc('week', public.orbit_today())::date - 20, now(), now()),
  -- Bu hafta · işaretlemesi bitmiş · teslimi AYRILMIŞ öğrenciden
  ('3ca00000-0000-0000-0000-0000000ca004', '3a000000-0000-0000-0000-00000000003a',
   '3e100000-0000-0000-0000-0000000e1001', 'Bu haftanın ödevi',
   date_trunc('week', public.orbit_today())::date - 7,
   date_trunc('week', public.orbit_today())::date + 2, now(), null);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

-- ===========================================================================
-- Öğretmen
-- ===========================================================================

select set_config('request.jwt.claim.sub', '31000000-0000-0000-0000-000000000031', true);

-- Teslimler öğretmenin kimliğiyle yazılıyor ve `recorded_by_membership_id`
-- GÖNDERİLMİYOR: v1.4-15'te ölçüldü, o sütun istemciye açık değil ve değerini
-- bir tetikleyici koyuyor. Yükseltilmiş rolle yazmayı denemek `auth.uid()`
-- boş olduğu için NOT NULL ihlaliyle düşüyordu — yani kurgu gerçek yazma
-- yolundan geçmek zorunda, ki zaten doğrusu bu.
--
-- Arşivlenmiş ödevin teslimi kurguda YOK ve olmasına gerek de yok: o haftanın
-- hiç satır döndürmemesi zaten arşiv süzgecinin kanıtı.
insert into public.homework_submissions
  (organization_id, homework_id, student_id)
values
  ('3a000000-0000-0000-0000-00000000003a', '3ca00000-0000-0000-0000-0000000ca001',
   '3f100000-0000-0000-0000-0000000f1001'),
  ('3a000000-0000-0000-0000-00000000003a', '3ca00000-0000-0000-0000-0000000ca002',
   '3f100000-0000-0000-0000-0000000f1001'),
  ('3a000000-0000-0000-0000-00000000003a', '3ca00000-0000-0000-0000-0000000ca004',
   '3f400000-0000-0000-0000-0000000f4004');

-- 1 · Yalnız iki hafta sayılabilir veri taşıyor: bu hafta ve geçen hafta.
select is(
  (select count(*) filter (where hafta.present_count is not null)
          || '/' || count(*)
     from public.report_attendance_weeks() as hafta),
  '2/4',
  'the axis is always four weeks, and exactly two of them carry measured counts'
);

-- 2 · Bu haftanın sayısı 12-A ile sınırlı: 12-B''nin katılan öğrencisi yok.
select is(
  (select hafta.present_count
     from public.report_attendance_weeks() as hafta
    where hafta.week_start = date_trunc('week', public.orbit_today())::date),
  2::bigint,
  'the other class''s attendance record does not enter the teacher''s count'
);

-- 3 · Geçen haftanın payı ve paydası ayrı ayrı doğru.
select is(
  (select hafta.present_count || '/' || hafta.absent_count
     from public.report_attendance_weeks() as hafta
    where hafta.week_start = date_trunc('week', public.orbit_today())::date - 7),
  '1/1',
  'last week reports one present and one absent'
);

-- 4 · ⛔ Bütün kayıtları izinli olan hafta HİÇ SATIR döndürmüyor.
select is(
  (select hafta.present_count is null
            and hafta.late_count is null
            and hafta.absent_count is null
     from public.report_attendance_weeks() as hafta
    where hafta.week_start = date_trunc('week', public.orbit_today())::date - 14),
  true,
  'a week whose every record is excused comes back empty, not as a zero'
);

-- 5 · ⛔ Arşivli oturumun haftası dönmüyor.
select is(
  (select hafta.present_count is null
     from public.report_attendance_weeks() as hafta
    where hafta.week_start = date_trunc('week', public.orbit_today())::date - 21),
  true,
  'an archived session contributes nothing, so its week comes back empty'
);

-- 6 · ⛔ Dört haftalık pencerenin dışı dönmüyor.
select is(
  (select count(*) from public.report_attendance_weeks() as hafta
    where hafta.week_start = date_trunc('week', public.orbit_today())::date - 28),
  0::bigint,
  'the week before the four-week window is outside the report'
);

-- 7 · ⛔ Fonksiyon HİÇ PATLAMIYOR. Bu iddia ayrı duruyor ve sebebi ölçüldü:
--      `max_score > 0` süzgeci kaldırıldığında sıfır tavanlı sınav bir
--      `division by zero` fırlatıyor ve süit **çöküyor** — kalan sekiz iddia
--      hiç koşmuyor. Çöken bir süit "koruma çalıştı" demez (v1.4-15'in dersi).
--      Bu satır, o durumda okunabilir bir kırmızı bırakıyor.
select lives_ok(
  'select * from public.report_exam_averages()',
  'a zero max score never reaches a division'
);

-- 8 · Yüzde doğru: (50/100 + 100/100) / 2 = %75.
select is(
  (select ortalama.average_percent from public.report_exam_averages() as ortalama),
  75.0::numeric,
  'the exam average is computed as a percentage of each exam''s own max score'
);

-- 9 · ⛔ Tavansız ve sıfır tavanlı sınavlar listede YOK.
select is(
  (select count(*) from public.report_exam_averages()),
  1::bigint,
  'exams without a max score, and with a zero max score, never enter the average'
);

-- 10 · Geçen haftanın ödevi: 1 teslim, 2 beklenen (sınıfın iki aktif öğrencisi).
select is(
  (select hafta.submission_count || '/' || hafta.expected_count
     from public.report_homework_weeks() as hafta
    where hafta.week_start = date_trunc('week', public.orbit_today())::date - 7),
  '1/2',
  'a finished homework reports its submissions over the class it was given to'
);

-- 11 · ⛔ İşaretlemesi bitirilmemiş ödevin haftası HİÇ SATIR döndürmüyor.
select is(
  (select hafta.submission_count is null and hafta.expected_count is null
     from public.report_homework_weeks() as hafta
    where hafta.week_start = date_trunc('week', public.orbit_today())::date - 14),
  true,
  'a homework whose marking is unfinished leaves its week empty (v1.4-15)'
);

-- 12 · ⛔ Arşivli ödevin haftası dönmüyor.
select is(
  (select hafta.submission_count is null
     from public.report_homework_weeks() as hafta
    where hafta.week_start = date_trunc('week', public.orbit_today())::date - 21),
  true,
  'an archived homework contributes nothing, so its week comes back empty'
);

-- 13 · Ayrılmış öğrencinin teslimi PAYDADA: beklenen = aktif ikisi ∪ teslim eden.
--      Pay ile payda aynı kümeden geldiği için pay paydayı geçemez (#297).
select is(
  (select hafta.submission_count || '/' || hafta.expected_count
     from public.report_homework_weeks() as hafta
    where hafta.week_start = date_trunc('week', public.orbit_today())::date),
  '1/3',
  'a student who left the class but submitted stays in the denominator'
);

-- ===========================================================================
-- Yönetici — aynı üç fonksiyon, daha geniş kapsam
-- ===========================================================================
--
-- Bu iki iddia, yukarıdaki olumsuzların **sebebini** kanıtlıyor. Öğretmenin
-- küçük sayıları "veri yoktu" diye de açıklanabilirdi; aynı fonksiyonun
-- yöneticide büyük sayı vermesi, farkın RLS'ten geldiğini gösteriyor.

select set_config('request.jwt.claim.sub', '32000000-0000-0000-0000-000000000032', true);

-- 14 · Yönetici bu hafta üç katılım görüyor — öğretmen ikisini görüyordu.
select is(
  (select hafta.present_count
     from public.report_attendance_weeks() as hafta
    where hafta.week_start = date_trunc('week', public.orbit_today())::date),
  3::bigint,
  'the same function returns the whole organization to an admin'
);

-- 15 · Aynı sınavın ortalaması yöneticide farklı: (50 + 100 + 100) / 3 = %83,3.
select is(
  (select ortalama.average_percent from public.report_exam_averages() as ortalama),
  83.3::numeric,
  'the exam average widens with the reader''s scope, and is labelled accordingly on screen'
);

select * from finish();
rollback;
