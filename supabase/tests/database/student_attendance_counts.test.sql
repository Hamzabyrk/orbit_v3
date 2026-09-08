-- v1.3-01/C — Devam sayaçları (`student_attendance_counts`).
--
-- Bu fonksiyon bir yüzdenin girdisini üretiyor ve o yüzde veliye "çocuğunuz
-- derslerin %72'sine katıldı" diye gösterilecek. Yanlış bir sayı, eksik bir
-- listeden kötüdür: eksik liste soruyu açık bırakır, yanlış yüzde kapalı ve
-- yanlış bir cevap verir.
--
-- Bu yüzden dört şey ayrı ayrı sınanıyor ve üçü **olumsuz**:
--
--   1. Kendi öğrencisinin sayıları doğru.
--   2. ⛔ Öğretmediği öğrencinin sayıları HİÇ dönmüyor (RLS).
--   3. ⛔ Arşivlenmiş oturumun kaydı sayılmıyor.
--   4. ⛔ `excused` üç sayacın hiçbirine girmiyor.
--
-- Dördüncüsü özellikle önemli: `DECISION_LOG` — "Devam yüzdesinde izinli ders
-- hiç sayılmaz" kararı, izinliyi ne paya ne paydaya koymuyor. Fonksiyon onu
-- `absent` sayarsa raporlu bir çocuk devamsız görünür; `present` sayarsa hiç
-- derse gelmemiş bir çocuk %100 görünür. İkisi de yanlış.

begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('21000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'sayac-ogretmen@example.test', '', now(), now()),
  ('22000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'sayac-yonetici@example.test', '', now(), now());

insert into public.organizations (id, name, slug, code)
values ('2a000000-0000-0000-0000-00000000002a', 'Sayaç Kurumu', 'sayac-kurumu-v1301c', 7601);

insert into public.branches (id, organization_id, name, is_default)
values ('2b000000-0000-0000-0000-00000000002b', '2a000000-0000-0000-0000-00000000002a', 'Merkez', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('2c100000-0000-0000-0000-0000000c1001', '2a000000-0000-0000-0000-00000000002a',
   '2b000000-0000-0000-0000-00000000002b', '21000000-0000-0000-0000-000000000021', 'teacher', 'active', 2101),
  ('2c200000-0000-0000-0000-0000000c2002', '2a000000-0000-0000-0000-00000000002a', null,
   '22000000-0000-0000-0000-000000000022', 'admin', 'active', 2102);

insert into public.subjects (id, organization_id, name)
values ('2d000000-0000-0000-0000-00000000002d', '2a000000-0000-0000-0000-00000000002a', 'Matematik');

-- İki sınıf: öğretmen yalnız birincisine giriyor. Ayrım bunun üzerine kurulu.
insert into public.classes (id, organization_id, branch_id, name)
values
  ('2e100000-0000-0000-0000-0000000e1001', '2a000000-0000-0000-0000-00000000002a',
   '2b000000-0000-0000-0000-00000000002b', '12-A'),
  ('2e200000-0000-0000-0000-0000000e2002', '2a000000-0000-0000-0000-00000000002a',
   '2b000000-0000-0000-0000-00000000002b', '12-B');

insert into public.class_teachers (organization_id, class_id, membership_id, subject_id)
values
  ('2a000000-0000-0000-0000-00000000002a', '2e100000-0000-0000-0000-0000000e1001',
   '2c100000-0000-0000-0000-0000000c1001', '2d000000-0000-0000-0000-00000000002d');

insert into public.students (id, organization_id, branch_id, full_name)
values
  ('2f100000-0000-0000-0000-0000000f1001', '2a000000-0000-0000-0000-00000000002a',
   '2b000000-0000-0000-0000-00000000002b', 'Kendi Öğrencisi'),
  ('2f200000-0000-0000-0000-0000000f2002', '2a000000-0000-0000-0000-00000000002a',
   '2b000000-0000-0000-0000-00000000002b', 'Başka Öğrenci');

insert into public.class_enrollments (organization_id, class_id, student_id)
values
  ('2a000000-0000-0000-0000-00000000002a', '2e100000-0000-0000-0000-0000000e1001',
   '2f100000-0000-0000-0000-0000000f1001'),
  ('2a000000-0000-0000-0000-00000000002a', '2e200000-0000-0000-0000-0000000e2002',
   '2f200000-0000-0000-0000-0000000f2002');

-- Dört oturum: üçü aktif, biri arşivli.
insert into public.attendance_sessions (id, organization_id, class_id, session_date)
values
  ('2aa00000-0000-0000-0000-0000000aa001', '2a000000-0000-0000-0000-00000000002a',
   '2e100000-0000-0000-0000-0000000e1001', '2026-09-01'),
  ('2aa00000-0000-0000-0000-0000000aa002', '2a000000-0000-0000-0000-00000000002a',
   '2e100000-0000-0000-0000-0000000e1001', '2026-09-02'),
  ('2aa00000-0000-0000-0000-0000000aa003', '2a000000-0000-0000-0000-00000000002a',
   '2e100000-0000-0000-0000-0000000e1001', '2026-09-03'),
  ('2aa00000-0000-0000-0000-0000000aa004', '2a000000-0000-0000-0000-00000000002a',
   '2e200000-0000-0000-0000-0000000e2002', '2026-09-01');

update public.attendance_sessions
set archived_at = now()
where id = '2aa00000-0000-0000-0000-0000000aa002';

insert into public.attendance_records (organization_id, session_id, student_id, status)
values
  -- Kendi öğrencisi: aktif oturumda katıldı, arşivli oturumda gelmedi, aktif oturumda izinli
  ('2a000000-0000-0000-0000-00000000002a', '2aa00000-0000-0000-0000-0000000aa001',
   '2f100000-0000-0000-0000-0000000f1001', 'present'),
  ('2a000000-0000-0000-0000-00000000002a', '2aa00000-0000-0000-0000-0000000aa002',
   '2f100000-0000-0000-0000-0000000f1001', 'absent'),
  ('2a000000-0000-0000-0000-00000000002a', '2aa00000-0000-0000-0000-0000000aa003',
   '2f100000-0000-0000-0000-0000000f1001', 'excused'),
  -- Öğretmenin girmediği sınıftaki öğrenci
  ('2a000000-0000-0000-0000-00000000002a', '2aa00000-0000-0000-0000-0000000aa004',
   '2f200000-0000-0000-0000-0000000f2002', 'present');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Öğretmen ---------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000021', true);

select is(
  (select count(*) from public.student_attendance_counts(
     array['2f100000-0000-0000-0000-0000000f1001',
           '2f200000-0000-0000-0000-0000000f2002']::uuid[])),
  1::bigint,
  'a teacher gets counts for exactly one student — the one they teach'
);

select is(
  (select present_count from public.student_attendance_counts(
     array['2f100000-0000-0000-0000-0000000f1001']::uuid[])),
  1::bigint,
  'the active-session present record is counted'
);

-- ⛔ Arşivlenmiş oturumdaki `absent` sayılırsa bu 1 döner.
select is(
  (select absent_count from public.student_attendance_counts(
     array['2f100000-0000-0000-0000-0000000f1001']::uuid[])),
  0::bigint,
  'a record in an archived session is not counted'
);

-- ⛔ `excused` üç sayacın hiçbirine girmemeli. Toplam 1 olmalı (yalnız present).
select is(
  (select present_count + late_count + absent_count
   from public.student_attendance_counts(
     array['2f100000-0000-0000-0000-0000000f1001']::uuid[])),
  1::bigint,
  'excused enters none of the three counters — it is outside what is measured'
);

-- ⛔ Öğretmediği öğrenci hiç dönmemeli.
select is(
  (select count(*) from public.student_attendance_counts(
     array['2f200000-0000-0000-0000-0000000f2002']::uuid[])),
  0::bigint,
  'a teacher gets nothing for a student they do not teach'
);

-- Yönetici: gerileme koruması --------------------------------------------------------

select set_config('request.jwt.claim.sub', '22000000-0000-0000-0000-000000000022', true);

select is(
  (select count(*) from public.student_attendance_counts(
     array['2f100000-0000-0000-0000-0000000f1001',
           '2f200000-0000-0000-0000-0000000f2002']::uuid[])),
  2::bigint,
  'an admin still gets counts for every student in their organization'
);

select * from finish();
rollback;
