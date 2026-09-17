-- v1.5-18 · 1/3 (#310) — Türetilmiş alan RPC'lerinin yetki sınırları.
--
-- `student_attendance_counts` ve `student_latest_exam_scores` bu dilimde
-- `security definer` oldu, yani **RLS artık onları koruMUyor**. Koruma elle
-- yazıldı ve bu dosya o yazının kanıtı.
--
-- Ölçülen kazanç 348× (ROADMAP §4.17) ama bu dosyanın derdi hız değil: aynı
-- cevabı verdiğini ve **bir satır fazlasını vermediğini** göstermek.
--
-- Kesişimin şekli iki fonksiyonda FARKLI ve testler bunu ayırıyor:
--
--   yoklama : attendance_records ÖĞRENCİ kapsamlı · attendance_sessions SINIF
--             kapsamlı  → öğretmen yalnız kendi sınıfının oturumlarını görür
--   sınav   : exam_results ÖĞRENCİ kapsamlı · exams KURUM kapsamlı (her rol)
--             → öğretmen, okuttuğu öğrencinin BAŞKA sınıftaki sınavını da görür
--
-- Konjonksiyonların gerekçesi de sınanıyor: `owns_student_record` arşivlenmiş
-- kaydı kabul ediyor, `attends_class` ise aktif kayıt istiyor. Sınıftan
-- ayrılmış öğrenci eski yoklamasını bugün göremiyor ve görmemeye devam etmeli.

begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

-- Kimlikler -----------------------------------------------------------------
-- ⚠️ `profiles` ELLE EKLENMEZ: `on_auth_user_created` onu kendisi açıyor ve
-- `must_change_password` sütun varsayılanıyla `false` geliyor (#308'de öğrendik).

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('c1000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'sayim-yonetici@example.test', '', now(), now()),
  ('c2000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'sayim-ogretmen-c@example.test', '', now(), now()),
  ('c3000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'sayim-ogretmen-d@example.test', '', now(), now()),
  ('c4000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'sayim-ogrenci-1@example.test', '', now(), now()),
  ('c5000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'sayim-ogrenci-2@example.test', '', now(), now()),
  ('c6000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'sayim-veli@example.test', '', now(), now()),
  ('c7000000-0000-0000-0000-0000000000c7', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'sayim-komsu-yonetici@example.test', '', now(), now()),
  ('c8000000-0000-0000-0000-0000000000c8', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'sayim-askiya-alinmis@example.test', '', now(), now());

-- Kurumlar ------------------------------------------------------------------

insert into public.organizations (id, name, slug, code)
values
  ('ca000000-0000-0000-0000-0000000000ca', 'Sayım Dershanesi', 'sayim-dershanesi', 7501),
  ('cb000000-0000-0000-0000-0000000000cb', 'Sayım Komşusu', 'sayim-komsusu', 7502);

insert into public.organization_memberships (id, organization_id, user_id, role, status)
values
  ('e1000000-0000-0000-0000-0000000000e1', 'ca000000-0000-0000-0000-0000000000ca',
   'c1000000-0000-0000-0000-0000000000c1', 'admin', 'active'),
  ('e2000000-0000-0000-0000-0000000000e2', 'ca000000-0000-0000-0000-0000000000ca',
   'c2000000-0000-0000-0000-0000000000c2', 'teacher', 'active'),
  ('e3000000-0000-0000-0000-0000000000e3', 'ca000000-0000-0000-0000-0000000000ca',
   'c3000000-0000-0000-0000-0000000000c3', 'teacher', 'active'),
  ('e4000000-0000-0000-0000-0000000000e4', 'ca000000-0000-0000-0000-0000000000ca',
   'c4000000-0000-0000-0000-0000000000c4', 'student', 'active'),
  ('e5000000-0000-0000-0000-0000000000e5', 'ca000000-0000-0000-0000-0000000000ca',
   'c5000000-0000-0000-0000-0000000000c5', 'student', 'active'),
  ('e6000000-0000-0000-0000-0000000000e6', 'ca000000-0000-0000-0000-0000000000ca',
   'c6000000-0000-0000-0000-0000000000c6', 'parent', 'active'),
  ('e7000000-0000-0000-0000-0000000000e7', 'cb000000-0000-0000-0000-0000000000cb',
   'c7000000-0000-0000-0000-0000000000c7', 'admin', 'active'),
  -- 🔴 Askıya alınmış üyelik: öğrenci kaydı bağlı ama üyelik `active` değil.
  --    Sınav fonksiyonundaki dış konjonksiyonun tek sebebi bu satır.
  ('e8000000-0000-0000-0000-0000000000e8', 'ca000000-0000-0000-0000-0000000000ca',
   'c8000000-0000-0000-0000-0000000000c8', 'student', 'suspended');

-- Sınıflar ve atamalar ------------------------------------------------------

insert into public.subjects (id, organization_id, name)
values ('f0000000-0000-0000-0000-0000000000f0', 'ca000000-0000-0000-0000-0000000000ca', 'Matematik');

insert into public.classes (id, organization_id, name)
values
  ('fc000000-0000-0000-0000-0000000000fc', 'ca000000-0000-0000-0000-0000000000ca', 'Sayım C'),
  ('fd000000-0000-0000-0000-0000000000fd', 'ca000000-0000-0000-0000-0000000000ca', 'Sayım D');

insert into public.class_teachers (id, organization_id, class_id, membership_id, subject_id)
values
  ('1c000000-0000-0000-0000-00000000001c', 'ca000000-0000-0000-0000-0000000000ca',
   'fc000000-0000-0000-0000-0000000000fc', 'e2000000-0000-0000-0000-0000000000e2',
   'f0000000-0000-0000-0000-0000000000f0'),
  ('1d000000-0000-0000-0000-00000000001d', 'ca000000-0000-0000-0000-0000000000ca',
   'fd000000-0000-0000-0000-0000000000fd', 'e3000000-0000-0000-0000-0000000000e3',
   'f0000000-0000-0000-0000-0000000000f0');

-- Öğrenciler, veli, kayıtlar -------------------------------------------------

insert into public.students (id, organization_id, auth_user_id, full_name, student_number)
values
  ('21000000-0000-0000-0000-000000000021', 'ca000000-0000-0000-0000-0000000000ca',
   'c4000000-0000-0000-0000-0000000000c4', 'Sayım Bir', '2001'),
  ('22000000-0000-0000-0000-000000000022', 'ca000000-0000-0000-0000-0000000000ca',
   'c5000000-0000-0000-0000-0000000000c5', 'Sayım İki', '2002'),
  ('23000000-0000-0000-0000-000000000023', 'ca000000-0000-0000-0000-0000000000ca',
   'c8000000-0000-0000-0000-0000000000c8', 'Sayım Askıda', '2003');

insert into public.guardians (id, organization_id, auth_user_id, full_name)
values
  ('29000000-0000-0000-0000-000000000029', 'ca000000-0000-0000-0000-0000000000ca',
   'c6000000-0000-0000-0000-0000000000c6', 'Sayım Velisi');

insert into public.student_guardians (id, organization_id, student_id, guardian_id)
values
  ('2a000000-0000-0000-0000-00000000002a', 'ca000000-0000-0000-0000-0000000000ca',
   '21000000-0000-0000-0000-000000000021', '29000000-0000-0000-0000-000000000029');

-- Öğrenci 1: C ve D sınıfında (ikisi de aktif)
-- Öğrenci 2: C sınıfında — kayıt SONRADAN arşivlenecek
-- Öğrenci 3 (askıda): C sınıfında
insert into public.class_enrollments (id, organization_id, class_id, student_id)
values
  ('31000000-0000-0000-0000-000000000031', 'ca000000-0000-0000-0000-0000000000ca',
   'fc000000-0000-0000-0000-0000000000fc', '21000000-0000-0000-0000-000000000021'),
  ('32000000-0000-0000-0000-000000000032', 'ca000000-0000-0000-0000-0000000000ca',
   'fd000000-0000-0000-0000-0000000000fd', '21000000-0000-0000-0000-000000000021'),
  ('33000000-0000-0000-0000-000000000033', 'ca000000-0000-0000-0000-0000000000ca',
   'fc000000-0000-0000-0000-0000000000fc', '22000000-0000-0000-0000-000000000022'),
  ('34000000-0000-0000-0000-000000000034', 'ca000000-0000-0000-0000-0000000000ca',
   'fc000000-0000-0000-0000-0000000000fc', '23000000-0000-0000-0000-000000000023');

-- Yoklama -------------------------------------------------------------------
-- C sınıfı: üç oturum · D sınıfı: bir oturum · C'de bir de ARŞİVLİ oturum

insert into public.attendance_sessions (id, organization_id, class_id, subject_id, session_date, starts_at)
values
  ('41000000-0000-0000-0000-000000000041', 'ca000000-0000-0000-0000-0000000000ca',
   'fc000000-0000-0000-0000-0000000000fc', 'f0000000-0000-0000-0000-0000000000f0', '2026-03-02', '09:00'),
  ('42000000-0000-0000-0000-000000000042', 'ca000000-0000-0000-0000-0000000000ca',
   'fc000000-0000-0000-0000-0000000000fc', 'f0000000-0000-0000-0000-0000000000f0', '2026-03-03', '09:00'),
  ('43000000-0000-0000-0000-000000000043', 'ca000000-0000-0000-0000-0000000000ca',
   'fc000000-0000-0000-0000-0000000000fc', 'f0000000-0000-0000-0000-0000000000f0', '2026-03-04', '09:00'),
  ('44000000-0000-0000-0000-000000000044', 'ca000000-0000-0000-0000-0000000000ca',
   'fd000000-0000-0000-0000-0000000000fd', 'f0000000-0000-0000-0000-0000000000f0', '2026-03-02', '11:00'),
  ('45000000-0000-0000-0000-000000000045', 'ca000000-0000-0000-0000-0000000000ca',
   'fc000000-0000-0000-0000-0000000000fc', 'f0000000-0000-0000-0000-0000000000f0', '2026-03-05', '09:00');

insert into public.attendance_records (id, organization_id, session_id, student_id, status)
values
  -- C · oturum 1
  ('51000000-0000-0000-0000-000000000051', 'ca000000-0000-0000-0000-0000000000ca',
   '41000000-0000-0000-0000-000000000041', '21000000-0000-0000-0000-000000000021', 'present'),
  ('52000000-0000-0000-0000-000000000052', 'ca000000-0000-0000-0000-0000000000ca',
   '41000000-0000-0000-0000-000000000041', '22000000-0000-0000-0000-000000000022', 'present'),
  -- C · oturum 2
  ('53000000-0000-0000-0000-000000000053', 'ca000000-0000-0000-0000-0000000000ca',
   '42000000-0000-0000-0000-000000000042', '21000000-0000-0000-0000-000000000021', 'late'),
  ('54000000-0000-0000-0000-000000000054', 'ca000000-0000-0000-0000-0000000000ca',
   '42000000-0000-0000-0000-000000000042', '22000000-0000-0000-0000-000000000022', 'absent'),
  -- C · oturum 3: 'excused' hiçbir sayaca girmemeli
  ('55000000-0000-0000-0000-000000000055', 'ca000000-0000-0000-0000-0000000000ca',
   '43000000-0000-0000-0000-000000000043', '21000000-0000-0000-0000-000000000021', 'excused'),
  -- D · oturum: yalnız D öğretmeninin göreceği satır
  ('56000000-0000-0000-0000-000000000056', 'ca000000-0000-0000-0000-0000000000ca',
   '44000000-0000-0000-0000-000000000044', '21000000-0000-0000-0000-000000000021', 'absent'),
  -- C · ARŞİVLENECEK oturum: hiçbir sayıma girmemeli
  ('57000000-0000-0000-0000-000000000057', 'ca000000-0000-0000-0000-0000000000ca',
   '45000000-0000-0000-0000-000000000045', '21000000-0000-0000-0000-000000000021', 'present');

update public.attendance_sessions
   set archived_at = now()
 where id = '45000000-0000-0000-0000-000000000045';

-- ⚠️ Kayıt arşivleme SONRADAN: `enforce_attendance_record_belongs_to_session`
-- ekleme anında aktif kayıt istiyor, o yüzden önce yoklama eklendi.
update public.class_enrollments
   set archived_at = now()
 where id = '33000000-0000-0000-0000-000000000033';

-- Sınavlar ------------------------------------------------------------------
-- E1 (C sınıfı, erken) · E2 (D sınıfı, geç → en son olan bu) · E3 (ARŞİVLİ, en geç)

insert into public.exams (id, organization_id, class_id, subject_id, name, exam_date, max_score)
values
  ('61000000-0000-0000-0000-000000000061', 'ca000000-0000-0000-0000-0000000000ca',
   'fc000000-0000-0000-0000-0000000000fc', 'f0000000-0000-0000-0000-0000000000f0',
   'Sayım Deneme 1', '2026-03-10', 100),
  ('62000000-0000-0000-0000-000000000062', 'ca000000-0000-0000-0000-0000000000ca',
   'fd000000-0000-0000-0000-0000000000fd', 'f0000000-0000-0000-0000-0000000000f0',
   'Sayım Deneme 2', '2026-03-20', 100),
  ('63000000-0000-0000-0000-000000000063', 'ca000000-0000-0000-0000-0000000000ca',
   'fc000000-0000-0000-0000-0000000000fc', 'f0000000-0000-0000-0000-0000000000f0',
   'Sayım Deneme 3 (arşivli)', '2026-03-30', 100);

insert into public.exam_results (id, organization_id, exam_id, student_id, score)
values
  ('71000000-0000-0000-0000-000000000071', 'ca000000-0000-0000-0000-0000000000ca',
   '61000000-0000-0000-0000-000000000061', '21000000-0000-0000-0000-000000000021', 50),
  ('72000000-0000-0000-0000-000000000072', 'ca000000-0000-0000-0000-0000000000ca',
   '62000000-0000-0000-0000-000000000062', '21000000-0000-0000-0000-000000000021', 80),
  ('73000000-0000-0000-0000-000000000073', 'ca000000-0000-0000-0000-0000000000ca',
   '63000000-0000-0000-0000-000000000063', '21000000-0000-0000-0000-000000000021', 99),
  -- Askıya alınmış üyeliğin sonucu
  ('74000000-0000-0000-0000-000000000074', 'ca000000-0000-0000-0000-0000000000ca',
   '61000000-0000-0000-0000-000000000061', '23000000-0000-0000-0000-000000000023', 60);

update public.exams set archived_at = now()
 where id = '63000000-0000-0000-0000-000000000063';

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

-- ===========================================================================
-- YOKLAMA — yönetici
-- ===========================================================================

select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-0000000000c1', true);

-- 1 · Öğrenci 1: present(C1) · late(C2) · absent(D). excused(C3) hiçbir sayaca
--     girmez, arşivli oturum (C5) hiç sayılmaz.
select is(
  (select present_count || '/' || late_count || '/' || absent_count
   from public.student_attendance_counts(
     array['21000000-0000-0000-0000-000000000021']::uuid[])),
  '1/1/1',
  'admin counts every class; excused is counted in no bucket and the archived session is excluded'
);

-- 2 · 🔴 Öğrenci 2'nin sınıf kaydı ARŞİVLİ ama yoklama satırları duruyor.
--     Yönetici bugün bunları görüyor; `class_enrollments`'tan türetilen bir
--     yetki bu satırları düşürürdü. Çiftler ham satırdan türetiliyor.
select is(
  (select present_count || '/' || late_count || '/' || absent_count
   from public.student_attendance_counts(
     array['22000000-0000-0000-0000-000000000022']::uuid[])),
  '1/0/1',
  'attendance left behind by an archived enrollment still counts for the admin'
);

-- ===========================================================================
-- YOKLAMA — öğretmenler: kesişim SINIF kapsamlı
-- ===========================================================================

select set_config('request.jwt.claim.sub', 'c2000000-0000-0000-0000-0000000000c2', true);

-- 3 · C öğretmeni D'nin oturumunu GÖRMEZ: absent düşer.
select is(
  (select present_count || '/' || late_count || '/' || absent_count
   from public.student_attendance_counts(
     array['21000000-0000-0000-0000-000000000021']::uuid[])),
  '1/1/0',
  'the C teacher sees only C sessions — the D absence is invisible (scope not widened)'
);

-- 4 · ⛔ Kaydı arşivlenmiş öğrenci için `teaches_student` artık yanlış:
--     C öğretmeni öğrenci 2'yi görmez. Bugün de görmüyor.
select is(
  (select count(*) from public.student_attendance_counts(
     array['22000000-0000-0000-0000-000000000022']::uuid[])),
  0::bigint,
  'the C teacher gets nothing for a student whose enrollment was archived — teaches_student is false'
);

select set_config('request.jwt.claim.sub', 'c3000000-0000-0000-0000-0000000000c3', true);

-- 5 · D öğretmeni yalnız D'yi görür: tek absent.
select is(
  (select present_count || '/' || late_count || '/' || absent_count
   from public.student_attendance_counts(
     array['21000000-0000-0000-0000-000000000021']::uuid[])),
  '0/0/1',
  'the D teacher sees only the D session'
);

-- ===========================================================================
-- YOKLAMA — öğrenci ve veli
-- ===========================================================================

select set_config('request.jwt.claim.sub', 'c4000000-0000-0000-0000-0000000000c4', true);

-- 6 · Kendi kayıtları, iki sınıfın toplamı.
select is(
  (select present_count || '/' || late_count || '/' || absent_count
   from public.student_attendance_counts(
     array['21000000-0000-0000-0000-000000000021']::uuid[])),
  '1/1/1',
  'a student sees their own attendance across every class they attend'
);

-- 7 · ⛔ Sınıf arkadaşını görmez.
select is(
  (select count(*) from public.student_attendance_counts(
     array['22000000-0000-0000-0000-000000000022']::uuid[])),
  0::bigint,
  'a student cannot see a classmates attendance'
);

-- 8 · İkisi birden istendiğinde yalnız kendisi döner.
select is(
  (select count(*) from public.student_attendance_counts(
     array['21000000-0000-0000-0000-000000000021',
           '22000000-0000-0000-0000-000000000022']::uuid[])),
  1::bigint,
  'asking for both returns only the caller own row'
);

select set_config('request.jwt.claim.sub', 'c5000000-0000-0000-0000-0000000000c5', true);

-- 9 · 🔴 Konjonksiyonun kendisi. Öğrenci 2 C'den ayrıldı (kayıt arşivli).
--     `owns_student_record` hâlâ doğru, `attends_class` YANLIŞ. Bugün eski
--     yoklamasını göremiyor; görmemeye devam ediyor. Konjonksiyon düşürülüp
--     yalnız `owns_student_record` yazılsaydı burada '1/0/1' dönerdi.
select is(
  (select count(*) from public.student_attendance_counts(
     array['22000000-0000-0000-0000-000000000022']::uuid[])),
  0::bigint,
  'a student who left the class does not see their old attendance — owns_student_record alone would have opened it'
);

select set_config('request.jwt.claim.sub', 'c6000000-0000-0000-0000-0000000000c6', true);

-- 10 · Veli bağlı olduğu öğrenciyi görür.
select is(
  (select present_count || '/' || late_count || '/' || absent_count
   from public.student_attendance_counts(
     array['21000000-0000-0000-0000-000000000021']::uuid[])),
  '1/1/1',
  'a guardian sees their own child across every class'
);

-- 11 · ⛔ Bağlı olmadığı öğrenciyi görmez.
select is(
  (select count(*) from public.student_attendance_counts(
     array['22000000-0000-0000-0000-000000000022']::uuid[])),
  0::bigint,
  'a guardian gets nothing for a student they do not guard'
);

-- ===========================================================================
-- YOKLAMA — komşu kurum
-- ===========================================================================

select set_config('request.jwt.claim.sub', 'c7000000-0000-0000-0000-0000000000c7', true);

-- 12 · 🔴 `security definer` RLS'i atlıyor; kiracı duvarı elle yazıldı.
select is(
  (select count(*) from public.student_attendance_counts(
     array['21000000-0000-0000-0000-000000000021',
           '22000000-0000-0000-0000-000000000022']::uuid[])),
  0::bigint,
  'an admin of a different institution sees no attendance — the tenant wall is written by hand here'
);

-- ===========================================================================
-- SINAV — kesişimin şekli burada KURUM kapsamlı
-- ===========================================================================

select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-0000000000c1', true);

-- 13 · En son sınav E2 (20 Mart). E3 daha geç ama ARŞİVLİ, girmemeli.
select is(
  (select exam_name || ' · ' || score
   from public.student_latest_exam_scores(
     array['21000000-0000-0000-0000-000000000021']::uuid[])),
  'Sayım Deneme 2 · 80.00',
  'the latest exam wins and the archived one is excluded even though it is newer'
);

select set_config('request.jwt.claim.sub', 'c2000000-0000-0000-0000-0000000000c2', true);

-- 14 · 🔴 İki fonksiyonun kesişimi FARKLI, ve fark burada görünüyor:
--      `exams` politikası kurum kapsamlı olduğu için C öğretmeni, okuttuğu
--      öğrencinin **D sınıfındaki** sınav sonucunu görüyor. Yoklamada
--      görmüyordu (test 3). İkisi de bugünkü davranış.
select is(
  (select exam_name from public.student_latest_exam_scores(
     array['21000000-0000-0000-0000-000000000021']::uuid[])),
  'Sayım Deneme 2',
  'exams are org-scoped, so the C teacher does see a result from the D class — unlike attendance'
);

select set_config('request.jwt.claim.sub', 'c4000000-0000-0000-0000-0000000000c4', true);

-- 15 · Öğrenci kendi sonucunu görür.
select is(
  (select score from public.student_latest_exam_scores(
     array['21000000-0000-0000-0000-000000000021']::uuid[])),
  80.00::numeric,
  'a student sees their own latest score'
);

select set_config('request.jwt.claim.sub', 'c8000000-0000-0000-0000-0000000000c8', true);

-- 16 · 🔴 Dış konjonksiyonun tek sebebi. Bu kullanıcının `students.auth_user_id`
--      bağlı ve sonucu var, ama kurum üyeliği `suspended`. `exams` politikası
--      aktif üyelik istediği için bugün sonuç göremiyor. Dış konjonksiyon
--      düşürülüp yalnız `owns_student_record` bırakılsaydı burada 1 satır dönerdi.
select is(
  (select count(*) from public.student_latest_exam_scores(
     array['23000000-0000-0000-0000-000000000023']::uuid[])),
  0::bigint,
  'a suspended membership sees no exam result even though the student record is linked — the exams side needs an active membership'
);

select set_config('request.jwt.claim.sub', 'c7000000-0000-0000-0000-0000000000c7', true);

-- 17 · ⛔ Komşu kurum yöneticisi sınav sonucu da görmez.
select is(
  (select count(*) from public.student_latest_exam_scores(
     array['21000000-0000-0000-0000-000000000021',
           '23000000-0000-0000-0000-000000000023']::uuid[])),
  0::bigint,
  'an admin of a different institution sees no exam result either'
);

select * from finish();
rollback;
