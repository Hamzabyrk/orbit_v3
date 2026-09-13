-- v1.4-15 — Getirilen ödev bir satırdır (#294).
--
-- Dört iddia kümesi:
--
--   1. Öğretmen işaretler; işaretleyeni sunucu yazar.
--   2. `ORB02` — teslim, ödevin sınıfına kayıtlı bir öğrenciye yazılır.
--      ⚠️ Ve **arşivlenmiş sınıf kaydı da kanıt sayılır** — bu, yoklama
--      kuralından kopyalanmış bilinçli bir ayrıntı; kendi iddiası var.
--   3. Öğrenci YAZAMAZ, okur. Sistemin ilk öğrenci yazma yolu açılmadı.
--   4. İşaret kaldırılır ve yeniden konabilir (arşiv + kısmi tekillik).

begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('c1000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'odev-ogretmen@example.test', '', now(), now()),
  ('c2000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'odev-ogrenci@example.test', '', now(), now()),
  ('c3000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'odev-yonetici@example.test', '', now(), now());

insert into public.organizations (id, name, slug, code)
values ('cc000000-0000-0000-0000-0000000000cc', 'Kurum Odev', 'kurum-odev-v1415', 7971);

insert into public.branches (id, organization_id, name, is_default)
values ('cc100000-0000-0000-0000-000000000011', 'cc000000-0000-0000-0000-0000000000cc', 'Odev Merkez', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('7a000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-0000000000cc',
   'cc100000-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-0000000000c1',
   'teacher', 'active', 2200),
  ('7a000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-0000000000cc',
   'cc100000-0000-0000-0000-000000000011', 'c2000000-0000-0000-0000-0000000000c2',
   'student', 'active', 2201),
  ('7a000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-0000000000cc', null,
   'c3000000-0000-0000-0000-0000000000c3', 'admin', 'active', 2202);

insert into public.classes (id, organization_id, branch_id, name)
values
  ('cf000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-0000000000cc',
   'cc100000-0000-0000-0000-000000000011', '10-A'),
  ('cf000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-0000000000cc',
   'cc100000-0000-0000-0000-000000000011', '10-B');

insert into public.subjects (id, organization_id, name)
values ('c5000000-0000-0000-0000-0000000000c5', 'cc000000-0000-0000-0000-0000000000cc', 'Tarih');

-- Öğretmen 10-A'yı okutuyor; 10-B'yi okutmuyor.
insert into public.class_teachers (id, organization_id, class_id, membership_id, subject_id)
values ('c7000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-0000000000cc',
        'cf000000-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001',
        'c5000000-0000-0000-0000-0000000000c5');

-- İki öğrenci: biri 10-A'da (hesabı bağlı), biri 10-B'de.
insert into public.students (id, organization_id, branch_id, full_name, auth_user_id)
values
  ('c9000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-0000000000cc',
   'cc100000-0000-0000-0000-000000000011', 'Ayşe Yılmaz', 'c2000000-0000-0000-0000-0000000000c2'),
  ('c9000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-0000000000cc',
   'cc100000-0000-0000-0000-000000000011', 'Baran Demir', null);

insert into public.class_enrollments (id, organization_id, class_id, student_id)
values
  ('ce000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-0000000000cc',
   'cf000000-0000-0000-0000-000000000001', 'c9000000-0000-0000-0000-000000000001'),
  ('ce000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-0000000000cc',
   'cf000000-0000-0000-0000-000000000002', 'c9000000-0000-0000-0000-000000000002');

insert into public.homework_assignments
  (id, organization_id, class_id, subject_id, title, assigned_on, due_date)
values ('cb000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-0000000000cc',
        'cf000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-0000000000c5',
        'Osmanlı kuruluş dönemi', current_date, current_date + 3);

-- =========================================================================
-- 1. Öğretmen işaretler; işaretleyeni sunucu yazar
-- =========================================================================

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-0000000000c1', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $sql$insert into public.homework_submissions
         (organization_id, homework_id, student_id)
       values ('cc000000-0000-0000-0000-0000000000cc',
               'cb000000-0000-0000-0000-000000000001',
               'c9000000-0000-0000-0000-000000000001')$sql$,
  'the teacher of the class can mark a submission'
);

select is(
  (select recorded_by_membership_id from public.homework_submissions
   where student_id = 'c9000000-0000-0000-0000-000000000001'),
  '7a000000-0000-0000-0000-000000000001'::uuid,
  'and the server records WHO marked it — the client never sends this'
);

-- İstemci `recorded_by_membership_id` gönderemiyor: yetkide yok.
select throws_ok(
  $sql$insert into public.homework_submissions
         (organization_id, homework_id, student_id, recorded_by_membership_id)
       values ('cc000000-0000-0000-0000-0000000000cc',
               'cb000000-0000-0000-0000-000000000001',
               'c9000000-0000-0000-0000-000000000002',
               '7a000000-0000-0000-0000-000000000003')$sql$,
  '42501',
  null,
  'the client cannot write the recorder column at all'
);

-- =========================================================================
-- 2. ORB02 — teslim, ödevin sınıfına kayıtlı öğrenciye yazılır
-- =========================================================================
--
-- Baran 10-B'de; ödev 10-A'nın. Yabancı anahtar onu durdurmaz — aynı kurumda
-- ve gerçek bir öğrenci. Durduran şey tetikleyici (**K-18**).

select throws_ok(
  $sql$insert into public.homework_submissions
         (organization_id, homework_id, student_id)
       values ('cc000000-0000-0000-0000-0000000000cc',
               'cb000000-0000-0000-0000-000000000001',
               'c9000000-0000-0000-0000-000000000002')$sql$,
  'ORB02',
  null,
  'a student from another class cannot be marked — the foreign key would have allowed it'
);

select is(
  (select count(*) from public.homework_submissions),
  1::bigint,
  'and the refusal wrote nothing'
);

-- =========================================================================
-- 3. 🔴 Arşivlenmiş sınıf kaydı da kanıt sayılır
-- =========================================================================
--
-- Bu küme bilinçli bir ayrıntıyı çiviliyor: aktif kayıt şart koşulsaydı,
-- sınıftan ayrılmış bir öğrencinin geçmiş teslimi **düzeltilemez** hâle
-- gelirdi. Kural "bu öğrencinin bu sınıfla bir ilişkisi var mı" diye soruyor.

reset role;
update public.class_enrollments set archived_at = now()
where id = 'ce000000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-0000000000c1', true);

-- Önce mevcut işareti kaldır ki tekillik engellemesin.
with kaldirma as (
  update public.homework_submissions set archived_at = now()
  where student_id = 'c9000000-0000-0000-0000-000000000001'
  returning 1
)
select is(
  (select count(*) from kaldirma),
  1::bigint,
  'the teacher can remove a mark (archive, never delete)'
);

select lives_ok(
  $sql$insert into public.homework_submissions
         (organization_id, homework_id, student_id)
       values ('cc000000-0000-0000-0000-0000000000cc',
               'cb000000-0000-0000-0000-000000000001',
               'c9000000-0000-0000-0000-000000000001')$sql$,
  'and can mark it again even though the class enrollment is now ARCHIVED — history stays correctable'
);

select is(
  (select count(*) from public.homework_submissions
   where student_id = 'c9000000-0000-0000-0000-000000000001'
     and archived_at is null),
  1::bigint,
  'exactly one active mark remains — the partial unique index holds'
);

-- Aynı çift ikinci kez açılamıyor.
select throws_ok(
  $sql$insert into public.homework_submissions
         (organization_id, homework_id, student_id)
       values ('cc000000-0000-0000-0000-0000000000cc',
               'cb000000-0000-0000-0000-000000000001',
               'c9000000-0000-0000-0000-000000000001')$sql$,
  '23505',
  null,
  'the same homework-student pair cannot be marked twice while active'
);

-- =========================================================================
-- 4. 🔴 Öğrenci YAZAMAZ — sistemin ilk öğrenci yazma yolu açılmadı
-- =========================================================================

select set_config('request.jwt.claim.sub', 'c2000000-0000-0000-0000-0000000000c2', true);

select throws_ok(
  $sql$insert into public.homework_submissions
         (organization_id, homework_id, student_id)
       values ('cc000000-0000-0000-0000-0000000000cc',
               'cb000000-0000-0000-0000-000000000001',
               'c9000000-0000-0000-0000-000000000001')$sql$,
  '42501',
  null,
  'a STUDENT cannot mark their own submission — this system has no student write path and this slice did not open one'
);

with ogrenci_denemesi as (
  update public.homework_submissions set archived_at = now()
  where student_id = 'c9000000-0000-0000-0000-000000000001'
  returning 1
)
select is(
  (select count(*) from ogrenci_denemesi),
  0::bigint,
  'nor remove one'
);

-- Ama kendi teslimini OKUYOR.
select is(
  (select count(*) from public.homework_submissions
   where archived_at is null),
  1::bigint,
  'but the student CAN read their own submission'
);

-- =========================================================================
-- 5. Kapsam — başka sınıfı okutmayan öğretmen göremez
-- =========================================================================

reset role;
insert into public.homework_assignments
  (id, organization_id, class_id, subject_id, title, assigned_on, due_date)
values ('cb000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-0000000000cc',
        'cf000000-0000-0000-0000-000000000002', 'c5000000-0000-0000-0000-0000000000c5',
        '10-B ödevi', current_date, current_date + 3);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-0000000000c1', true);

select throws_ok(
  $sql$insert into public.homework_submissions
         (organization_id, homework_id, student_id)
       values ('cc000000-0000-0000-0000-0000000000cc',
               'cb000000-0000-0000-0000-000000000002',
               'c9000000-0000-0000-0000-000000000002')$sql$,
  '42501',
  null,
  'a teacher cannot mark submissions for a class they do not teach'
);

-- =========================================================================
-- 6. İz düştü mü
-- =========================================================================

reset role;

select is(
  (select count(*) from public.audit_events
   where entity_type = 'homework_submission'),
  3::bigint,
  'every write that actually happened left a trace: mark, remove, mark again — the four refusals wrote nothing'
);

select is(
  (select metadata ->> 'student_id' from public.audit_events
   where entity_type = 'homework_submission'
   order by id desc limit 1),
  'c9000000-0000-0000-0000-000000000001',
  'and the ledger says which student it was about'
);

-- =========================================================================
-- 7. 🔴 İşaretleme, öğretmen bitirdiğini söyleyince biter
-- =========================================================================
--
-- Bu küme bir tasarım boşluğunun kapatılmasını çiviliyor. Teslim satırının
-- YOKLUĞU iki şey demekti: "getirmedi" ve "henüz işaretlenmedi". Artık
-- `submissions_recorded_at` ikisini ayırıyor: alan boşken ekran oran
-- ÜRETMEZ; dolduğunda yokluk "getirmedi" anlamına gelir.

select is(
  (select submissions_recorded_at from public.homework_assignments
   where id = 'cb000000-0000-0000-0000-000000000001'),
  null::timestamptz,
  'a homework starts with marking NOT finished — absence of a submission means "not marked yet"'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-0000000000c1', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- ⚠️ `lives_ok` ile sarılı ve bu bir K-23 dersinin sonucu: sütun yetkisini
-- kaldıran mutasyon, çıplak bir UPDATE'te `42501` fırlatıp **betiği
-- çökertiyordu** — okunabilir bir kırmızı yerine hard abort. Sarmalanınca
-- aynı mutasyon "bu iddia düştü" diyor.
select lives_ok(
  $sql$update public.homework_assignments set submissions_recorded_at = now()
       where id = 'cb000000-0000-0000-0000-000000000001'$sql$,
  'the teacher of the class can declare the marking finished'
);

select isnt(
  (select submissions_recorded_at from public.homework_assignments
   where id = 'cb000000-0000-0000-0000-000000000001'),
  null::timestamptz,
  'and the declaration actually took — the write was not silently dropped by RLS (K-14)'
);

-- Geri alınabilir: yanlışlıkla basan öğretmen temizleyebilmeli.
select lives_ok(
  $sql$update public.homework_assignments set submissions_recorded_at = null
       where id = 'cb000000-0000-0000-0000-000000000001'$sql$,
  'and can take it back — a mis-click must be correctable'
);

select is(
  (select submissions_recorded_at from public.homework_assignments
   where id = 'cb000000-0000-0000-0000-000000000001'),
  null::timestamptz,
  'and taking it back really cleared the field'
);

-- Öğrenci bu alanı yazamıyor: ödev yazma politikası zaten onu dışarıda
-- bırakıyor ve bu sütun yeni bir kapı açmadı.
select set_config('request.jwt.claim.sub', 'c2000000-0000-0000-0000-0000000000c2', true);

-- Bu da sarmalı: doğru durumda öğrenci hata ALMAZ, RLS satırı gizler ve sıfır
-- satır etkilenir. Sarmalanmasının sebebi yine mutasyon okunabilirliği.
select lives_ok(
  $sql$update public.homework_assignments set submissions_recorded_at = now()
       where id = 'cb000000-0000-0000-0000-000000000001'$sql$,
  'a student''s attempt does not error — RLS simply hides the row'
);

select is(
  (select submissions_recorded_at from public.homework_assignments
   where id = 'cb000000-0000-0000-0000-000000000001'),
  null::timestamptz,
  'and it changed nothing — the new column opened no new door'
);

reset role;

select * from finish();
rollback;
