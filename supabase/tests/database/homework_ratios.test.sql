-- v1.5-17 (#308) — Ödev oranının sunucudaki sınırları.
--
-- Bu dosya üç şeyi ölçüyor ve üçü de fonksiyonun gerekçesinin kendisi:
--
--   1. SAYIM doğru mu — yarım işaretlenmiş ödev girmiyor, kayıttan önceki ödev
--      teslim edilmedikçe girmiyor, sorumluluğu olmayan öğrenci çıktıda YOK.
--   2. YETKİ genişlemedi mi — fonksiyon `security definer`, yani RLS atlanıyor.
--      Kritik vaka: öğrenci sınıf ARKADAŞININ oranını göremez, komşu kurumun
--      yöneticisi hiçbir şey görmez, C sınıfını okutan öğretmen öğrencinin D
--      sınıfındaki ödevini görmez.
--   3. GÜN kurum saatinden mi geliyor — `orbit_local_date`, `current_date` değil.
--
-- Kurgu: tek kurum, iki sınıf (C ve D), iki öğretmen (biri C biri D), iki
-- öğrenci (biri her iki sınıfta), bir veli, ve bir komşu kurum yöneticisi.

begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

-- Kimlikler -----------------------------------------------------------------

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('a1000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'oran-yonetici@example.test', '', now(), now()),
  ('a2000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'oran-ogretmen-c@example.test', '', now(), now()),
  ('a3000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'oran-ogretmen-d@example.test', '', now(), now()),
  ('a4000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'oran-ogrenci-1@example.test', '', now(), now()),
  ('a5000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'oran-ogrenci-2@example.test', '', now(), now()),
  ('a6000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'oran-veli@example.test', '', now(), now()),
  ('a7000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'oran-komsu-yonetici@example.test', '', now(), now());

-- ⚠️ `profiles` satırı ELLE EKLENMEZ. `on_auth_user_created` tetikleyicisi
-- auth.users eklendiğinde profili kendisi açıyor ve `must_change_password`
-- sütunun varsayılanıyla `false` geliyor — yani politikalar açık. Elle eklemek
-- `profiles_pkey` çakışması verir (bu dosya ilk yazıldığında verdi).

-- Kurumlar ------------------------------------------------------------------

insert into public.organizations (id, name, slug, code)
values
  ('ab000000-0000-0000-0000-0000000000ab', 'Oran Dershanesi', 'oran-dershanesi', 7401),
  ('ac000000-0000-0000-0000-0000000000ac', 'Komşu Dershane', 'oran-komsu', 7402);

insert into public.organization_memberships (id, organization_id, user_id, role, status)
values
  ('b1000000-0000-0000-0000-0000000000b1', 'ab000000-0000-0000-0000-0000000000ab',
   'a1000000-0000-0000-0000-0000000000a1', 'admin', 'active'),
  ('b2000000-0000-0000-0000-0000000000b2', 'ab000000-0000-0000-0000-0000000000ab',
   'a2000000-0000-0000-0000-0000000000a2', 'teacher', 'active'),
  ('b3000000-0000-0000-0000-0000000000b3', 'ab000000-0000-0000-0000-0000000000ab',
   'a3000000-0000-0000-0000-0000000000a3', 'teacher', 'active'),
  ('b4000000-0000-0000-0000-0000000000b4', 'ab000000-0000-0000-0000-0000000000ab',
   'a4000000-0000-0000-0000-0000000000a4', 'student', 'active'),
  ('b5000000-0000-0000-0000-0000000000b5', 'ab000000-0000-0000-0000-0000000000ab',
   'a5000000-0000-0000-0000-0000000000a5', 'student', 'active'),
  ('b6000000-0000-0000-0000-0000000000b6', 'ab000000-0000-0000-0000-0000000000ab',
   'a6000000-0000-0000-0000-0000000000a6', 'parent', 'active'),
  ('b7000000-0000-0000-0000-0000000000b7', 'ac000000-0000-0000-0000-0000000000ac',
   'a7000000-0000-0000-0000-0000000000a7', 'admin', 'active');

-- Sınıflar, dersler, atamalar ------------------------------------------------

insert into public.subjects (id, organization_id, name)
values ('c0000000-0000-0000-0000-0000000000c0', 'ab000000-0000-0000-0000-0000000000ab', 'Matematik');

insert into public.classes (id, organization_id, name)
values
  ('cc000000-0000-0000-0000-0000000000cc', 'ab000000-0000-0000-0000-0000000000ab', 'Sınıf C'),
  ('cd000000-0000-0000-0000-0000000000cd', 'ab000000-0000-0000-0000-0000000000ab', 'Sınıf D');

insert into public.class_teachers (id, organization_id, class_id, membership_id, subject_id)
values
  ('ce000000-0000-0000-0000-0000000000ce', 'ab000000-0000-0000-0000-0000000000ab',
   'cc000000-0000-0000-0000-0000000000cc', 'b2000000-0000-0000-0000-0000000000b2',
   'c0000000-0000-0000-0000-0000000000c0'),
  ('cf000000-0000-0000-0000-0000000000cf', 'ab000000-0000-0000-0000-0000000000ab',
   'cd000000-0000-0000-0000-0000000000cd', 'b3000000-0000-0000-0000-0000000000b3',
   'c0000000-0000-0000-0000-0000000000c0');

-- Öğrenciler ve kayıtlar ----------------------------------------------------
-- Öğrenci 1 hem C hem D sınıfında; öğrenci 2 yalnız C'de.
-- Öğrenci 2 C sınıfına GEÇ kaydolmuş: kayıt tarihi kurum saatiyle 2026-03-01.

insert into public.students (id, organization_id, auth_user_id, full_name, student_number)
values
  ('d1000000-0000-0000-0000-0000000000d1', 'ab000000-0000-0000-0000-0000000000ab',
   'a4000000-0000-0000-0000-0000000000a4', 'Öğrenci Bir', '1001'),
  ('d2000000-0000-0000-0000-0000000000d2', 'ab000000-0000-0000-0000-0000000000ab',
   'a5000000-0000-0000-0000-0000000000a5', 'Öğrenci İki', '1002');

insert into public.guardians (id, organization_id, auth_user_id, full_name)
values
  ('d9000000-0000-0000-0000-0000000000d9', 'ab000000-0000-0000-0000-0000000000ab',
   'a6000000-0000-0000-0000-0000000000a6', 'Veli');

insert into public.student_guardians (id, organization_id, student_id, guardian_id)
values
  ('da000000-0000-0000-0000-0000000000da', 'ab000000-0000-0000-0000-0000000000ab',
   'd1000000-0000-0000-0000-0000000000d1', 'd9000000-0000-0000-0000-0000000000d9');

insert into public.class_enrollments (id, organization_id, class_id, student_id, created_at)
values
  ('e1000000-0000-0000-0000-0000000000e1', 'ab000000-0000-0000-0000-0000000000ab',
   'cc000000-0000-0000-0000-0000000000cc', 'd1000000-0000-0000-0000-0000000000d1',
   '2025-09-01 09:00:00+03'),
  ('e2000000-0000-0000-0000-0000000000e2', 'ab000000-0000-0000-0000-0000000000ab',
   'cd000000-0000-0000-0000-0000000000cd', 'd1000000-0000-0000-0000-0000000000d1',
   '2025-09-01 09:00:00+03'),
  -- ⚠️ Saat dilimi vakası: UTC'de 2026-02-28, İstanbul'da 2026-03-01 00:30.
  ('e3000000-0000-0000-0000-0000000000e3', 'ab000000-0000-0000-0000-0000000000ab',
   'cc000000-0000-0000-0000-0000000000cc', 'd2000000-0000-0000-0000-0000000000d2',
   '2026-02-28 21:30:00+00');

-- Ödevler -------------------------------------------------------------------

insert into public.homework_assignments (
  id, organization_id, class_id, subject_id, title,
  assigned_by_membership_id, assigned_on, due_date, submissions_recorded_at
)
values
  -- C sınıfı, işaretlemesi bitmiş, öğrenci 2'nin kaydından ÖNCE verilmiş
  ('f1000000-0000-0000-0000-0000000000f1', 'ab000000-0000-0000-0000-0000000000ab',
   'cc000000-0000-0000-0000-0000000000cc', 'c0000000-0000-0000-0000-0000000000c0',
   'C · eski ödev', 'b2000000-0000-0000-0000-0000000000b2',
   '2025-10-01', '2025-10-08', '2025-10-09 20:00:00+03'),
  -- C sınıfı, işaretlemesi bitmiş, öğrenci 2'nin kayıt GÜNÜNDE verilmiş
  ('f2000000-0000-0000-0000-0000000000f2', 'ab000000-0000-0000-0000-0000000000ab',
   'cc000000-0000-0000-0000-0000000000cc', 'c0000000-0000-0000-0000-0000000000c0',
   'C · kayıt günü ödevi', 'b2000000-0000-0000-0000-0000000000b2',
   '2026-03-01', '2026-03-08', '2026-03-09 20:00:00+03'),
  -- C sınıfı, işaretlemesi YARIM: hiçbir orana girmemeli (v1.4-15 R1)
  ('f3000000-0000-0000-0000-0000000000f3', 'ab000000-0000-0000-0000-0000000000ab',
   'cc000000-0000-0000-0000-0000000000cc', 'c0000000-0000-0000-0000-0000000000c0',
   'C · yarım işaretlenmiş', 'b2000000-0000-0000-0000-0000000000b2',
   '2026-03-02', '2026-03-09', null),
  -- C sınıfı, ARŞİVLİ: orana girmemeli
  ('f4000000-0000-0000-0000-0000000000f4', 'ab000000-0000-0000-0000-0000000000ab',
   'cc000000-0000-0000-0000-0000000000cc', 'c0000000-0000-0000-0000-0000000000c0',
   'C · arşivli ödev', 'b2000000-0000-0000-0000-0000000000b2',
   '2026-03-03', '2026-03-10', '2026-03-11 20:00:00+03'),
  -- D sınıfı, işaretlemesi bitmiş — C öğretmeni bunu GÖRMEMELİ
  ('f5000000-0000-0000-0000-0000000000f5', 'ab000000-0000-0000-0000-0000000000ab',
   'cd000000-0000-0000-0000-0000000000cd', 'c0000000-0000-0000-0000-0000000000c0',
   'D · ödev', 'b3000000-0000-0000-0000-0000000000b3',
   '2025-11-01', '2025-11-08', '2025-11-09 20:00:00+03'),
  -- 🔴 C sınıfı, UTC ile kurum saatini AYIRAN ödev. Öğrenci 2'nin kaydı UTC'de
  --    2026-02-28, kurum saatinde 2026-03-01. Bu ödev 2026-02-28'de verildi:
  --    kurum gününe göre kayıttan ÖNCE (sayılmaz), UTC gününe göre kayıt
  --    GÜNÜNDE (sayılır). Tek satırla iki uygulamayı ayırıyor.
  ('f6000000-0000-0000-0000-0000000000f6', 'ab000000-0000-0000-0000-0000000000ab',
   'cc000000-0000-0000-0000-0000000000cc', 'c0000000-0000-0000-0000-0000000000c0',
   'C · saat dilimi sınırındaki ödev', 'b2000000-0000-0000-0000-0000000000b2',
   '2026-02-28', '2026-03-07', '2026-03-08 20:00:00+03');

update public.homework_assignments
   set archived_at = now()
 where id = 'f4000000-0000-0000-0000-0000000000f4';

-- Teslimler -----------------------------------------------------------------
-- Öğrenci 1: C'nin eski ödevini teslim etti, D'nin ödevini teslim ETMEDİ.
-- Öğrenci 2: hiçbir şey teslim etmedi.

-- ⚠️ `recorded_by_membership_id` ELLE YAZILAMAZ: `homework_submissions_set_recorder`
-- tetikleyicisi onu çağıranın üyeliğinden türetiyor (istemci kaydediciyi
-- uyduramasın diye, v1.4-15). Kimlik verilmeden eklenirse sütun null kalıp
-- NOT NULL kısıtını ihlal eder — bu dosya ilk yazıldığında etti. Bu yüzden
-- kurgu C öğretmeninin kimliğiyle ekiliyor.
select set_config('request.jwt.claim.sub', 'a2000000-0000-0000-0000-0000000000a2', true);

insert into public.homework_submissions (
  id, organization_id, homework_id, student_id
)
values
  ('11100000-0000-0000-0000-000000000111', 'ab000000-0000-0000-0000-0000000000ab',
   'f1000000-0000-0000-0000-0000000000f1', 'd1000000-0000-0000-0000-0000000000d1');

-- Kaydedicinin gerçekten C öğretmeni olduğu kurgunun bir parçası; yanlışsa
-- aşağıdaki sayıların hiçbiri anlam taşımaz.
select set_config('request.jwt.claim.sub', '', true);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

-- ===========================================================================
-- Yönetici — sayım doğruluğu
-- ===========================================================================

select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-0000000000a1', true);

-- 1 · Öğrenci 1: C'nin eski ödevi (teslim) + C'nin kayıt günü ödevi (teslim yok)
--     + D'nin ödevi (teslim yok) = 3 sorumluluk. Yarım işaretlenmiş ve arşivli yok.
select is(
  (select recorded_count || '/' || submitted_count
   from public.student_homework_ratios(
     array['d1000000-0000-0000-0000-0000000000d1']::uuid[])),
  '4/1',
  'admin sees every class the student belongs to; the half-marked and archived homework are absent'
);

-- 2 · ⛔ Öğrenci 2 C'ye 1 Mart'ta kaydoldu. "C · eski ödev" (2025-10-01) kaydından
--     önce verildi ve teslim etmedi → hesaba girmez. Kalan: kayıt günü ödevi.
select is(
  (select recorded_count || '/' || submitted_count
   from public.student_homework_ratios(
     array['d2000000-0000-0000-0000-0000000000d2']::uuid[])),
  '1/0',
  'homework assigned before the student enrolled is not counted unless submitted (K-03/K-22)'
);

-- 3 · 🔴 UTC ile kurum saatini AYIRAN satır, ve ayrımı oranın kendisinde ölçüyor.
--     Öğrenci 2'nin kaydı UTC'de 2026-02-28 21:30, kurum saatinde 2026-03-01 00:30.
--     "C · saat dilimi sınırındaki ödev" 2026-02-28'de verildi ve teslim edilmedi.
--
--       kurum saati (doğru) : kayıt 1 Mart → ödev kayıttan önce → SAYILMAZ → 1/0
--       UTC (istemcinin eski davranışı) : kayıt 28 Şubat → ödev kayıt günü → 2/0
--
--     Yani bu satır düşerse fonksiyon `orbit_local_date` yerine UTC'ye dönmüş
--     demektir (K-06: gün kuralı tek yerde durur).
select is(
  (select recorded_count || '/' || submitted_count
   from public.student_homework_ratios(
     array['d2000000-0000-0000-0000-0000000000d2']::uuid[])),
  '1/0',
  'the enrollment day comes from institution time, not UTC — under UTC this student would count 2 homeworks instead of 1'
);

-- 4 · ⛔ Sorumluluğu olmayan öğrenci çıktıda HİÇ yok — sıfırla değil, yoklukla.
--     Yalnız D sınıfında olmayan, hiç kaydı olmayan bir kimlik sorulduğunda.
select is(
  (select count(*) from public.student_homework_ratios(
     array['d1000000-0000-0000-0000-0000000000d1',
           '99900000-0000-0000-0000-000000000999']::uuid[])),
  1::bigint,
  'a student with no recorded homework is absent from the output — not a fabricated 0/0'
);

-- ===========================================================================
-- C sınıfı öğretmeni — ⛔ D sınıfını GÖRMEMELİ
-- ===========================================================================

select set_config('request.jwt.claim.sub', 'a2000000-0000-0000-0000-0000000000a2', true);

-- 5 · Yalnız C'nin üç ödevi = 3/1. Yönetici 4/1 görüyordu; fark D'nin ödevi.
select is(
  (select recorded_count || '/' || submitted_count
   from public.student_homework_ratios(
     array['d1000000-0000-0000-0000-0000000000d1']::uuid[])),
  '3/1',
  'the C teacher sees only the C class — the D homework stays invisible (scope was not widened)'
);

-- 6 · Kendi sınıfındaki diğer öğrenciyi görebilir.
select is(
  (select recorded_count || '/' || submitted_count
   from public.student_homework_ratios(
     array['d2000000-0000-0000-0000-0000000000d2']::uuid[])),
  '1/0',
  'the C teacher sees the other student in their own class'
);

-- ===========================================================================
-- D sınıfı öğretmeni — aynı kural ters yönde
-- ===========================================================================

select set_config('request.jwt.claim.sub', 'a3000000-0000-0000-0000-0000000000a3', true);

-- 7 · Yalnız D: bir ödev, teslim yok.
select is(
  (select recorded_count || '/' || submitted_count
   from public.student_homework_ratios(
     array['d1000000-0000-0000-0000-0000000000d1']::uuid[])),
  '1/0',
  'the D teacher sees only the D class'
);

-- 8 · ⛔ D öğretmeni, C'ye kayıtlı olup D'ye kayıtlı OLMAYAN öğrenciyi görmez.
select is(
  (select count(*) from public.student_homework_ratios(
     array['d2000000-0000-0000-0000-0000000000d2']::uuid[])),
  0::bigint,
  'the D teacher gets nothing for a student who is not in any class they teach'
);

-- ===========================================================================
-- Öğrenci — kendini görür, SINIF ARKADAŞINI GÖRMEZ
-- ===========================================================================

select set_config('request.jwt.claim.sub', 'a4000000-0000-0000-0000-0000000000a4', true);

-- 9 · Kendi oranı, iki sınıfın toplamı.
select is(
  (select recorded_count || '/' || submitted_count
   from public.student_homework_ratios(
     array['d1000000-0000-0000-0000-0000000000d1']::uuid[])),
  '4/1',
  'a student sees their own ratio across every class they attend'
);

-- 10 · 🔴 Kesişim kararının kendisi. Öğrenci 1 ve öğrenci 2 aynı C sınıfında.
--      `class_enrollments` politikası SINIF kapsamlı olduğu için öğrenci 1
--      arkadaşının kayıt satırını RLS altında görebiliyor; `homework_submissions`
--      politikası ÖĞRENCİ kapsamlı olduğu için teslimlerini göremiyor.
--      Fonksiyon kesişimi aldığı için arkadaşı için HİÇBİR ŞEY döndürmüyor.
--      Birleşim alınsaydı burada `1/0` dönerdi — ve o sayı bir sızıntı olurdu.
select is(
  (select count(*) from public.student_homework_ratios(
     array['d2000000-0000-0000-0000-0000000000d2']::uuid[])),
  0::bigint,
  'a student cannot see a classmates ratio — the function takes the intersection of the three policies, not the union'
);

-- 11 · İkisi birden istendiğinde yalnız kendisi döner.
select is(
  (select count(*) from public.student_homework_ratios(
     array['d1000000-0000-0000-0000-0000000000d1',
           'd2000000-0000-0000-0000-0000000000d2']::uuid[])),
  1::bigint,
  'asking for both returns only the caller own row'
);

-- ===========================================================================
-- Veli — bağlı olduğu öğrenciyi görür
-- ===========================================================================

select set_config('request.jwt.claim.sub', 'a6000000-0000-0000-0000-0000000000a6', true);

-- 12 · Veli öğrenci 1'e bağlı; iki sınıfın toplamını görür.
select is(
  (select recorded_count || '/' || submitted_count
   from public.student_homework_ratios(
     array['d1000000-0000-0000-0000-0000000000d1']::uuid[])),
  '4/1',
  'a guardian sees their own child across every class'
);

-- 13 · ⛔ Bağlı olmadığı öğrenciyi görmez.
select is(
  (select count(*) from public.student_homework_ratios(
     array['d2000000-0000-0000-0000-0000000000d2']::uuid[])),
  0::bigint,
  'a guardian gets nothing for a student they do not guard'
);

-- ===========================================================================
-- Komşu kurumun yöneticisi — ⛔ hiçbir şey
-- ===========================================================================

select set_config('request.jwt.claim.sub', 'a7000000-0000-0000-0000-0000000000a7', true);

-- 14 · 🔴 `security definer` RLS'i atlıyor; kiracı sınırı elle yazıldı.
--      Bu satır o yazının kanıtı: düşerse fonksiyon kurumlar arası sızdırıyor.
select is(
  (select count(*) from public.student_homework_ratios(
     array['d1000000-0000-0000-0000-0000000000d1',
           'd2000000-0000-0000-0000-0000000000d2']::uuid[])),
  0::bigint,
  'an admin of a different institution sees nothing — security definer bypasses RLS, so the tenant wall is written by hand here'
);

select * from finish();
rollback;
