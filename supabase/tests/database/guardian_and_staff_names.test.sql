-- v1.3-11 — Veli adı ve sınıfın öğretmen adları (#228).
--
-- Bu dosyanın en önemli testleri **olumsuz** olanlardır. Değişiklik,
-- `guardians` üzerinde bugüne kadar hiç olmayan bir okuma yolu açıyor: yanlış
-- yazılırsa bir kurumun velileri, o çocukları hiç okutmayan bir öğretmene
-- görünür. Olumlu testler bunu yakalayamaz — politika yanlışlıkla "bütün
-- veliler" derse tek öğretmenli bir kurguda sonuç yine 1 çıkar ve test yeşil
-- kalır.
--
-- Bu yüzden kurguda **iki öğretmen ve iki ayrı sınıf** var. Birinci öğretmen
-- kendi öğrencisinin velisini görmeli, **ikincisinin velisini görmemeli.**
--
-- Ayrıca `profiles` tablosunun AÇILMADIĞI ayrıca sınanıyor: öğretmen adı bir
-- fonksiyondan geliyor, çünkü `profiles` aynı satırda `recovery_email`,
-- `phone` ve şifre kilidi durumunu taşıyor ve RLS sütun gizleyemez.

begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('11000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'yonetici@example.test', '', now(), now()),
  ('12000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogretmen-bir@example.test', '', now(), now()),
  ('13000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogretmen-iki@example.test', '', now(), now()),
  ('14000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'veli-bir@example.test', '', now(), now()),
  ('15000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogrenci-bir@example.test', '', now(), now()),
  ('16000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'diger-kurum-yoneticisi@example.test', '', now(), now());

insert into public.organizations (id, name, slug, code)
values
  ('1a000000-0000-0000-0000-00000000001a', 'Kurum A', 'kurum-a-v1311', 7311),
  ('1b000000-0000-0000-0000-00000000001b', 'Kurum B', 'kurum-b-v1311', 7312);

insert into public.branches (id, organization_id, name, is_default)
values
  ('1aa00000-0000-0000-0000-00000000aa11', '1a000000-0000-0000-0000-00000000001a', 'A Merkez', true),
  ('1bb00000-0000-0000-0000-00000000bb11', '1b000000-0000-0000-0000-00000000001b', 'B Merkez', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('1c100000-0000-0000-0000-0000000c1001', '1a000000-0000-0000-0000-00000000001a', null,
   '11000000-0000-0000-0000-000000000011', 'admin', 'active', 1100),
  ('1c200000-0000-0000-0000-0000000c2002', '1a000000-0000-0000-0000-00000000001a',
   '1aa00000-0000-0000-0000-00000000aa11', '12000000-0000-0000-0000-000000000012', 'teacher', 'active', 1101),
  ('1c300000-0000-0000-0000-0000000c3003', '1a000000-0000-0000-0000-00000000001a',
   '1aa00000-0000-0000-0000-00000000aa11', '13000000-0000-0000-0000-000000000013', 'teacher', 'active', 1102),
  ('1c400000-0000-0000-0000-0000000c4004', '1a000000-0000-0000-0000-00000000001a',
   '1aa00000-0000-0000-0000-00000000aa11', '14000000-0000-0000-0000-000000000014', 'parent', 'active', 1103),
  ('1c500000-0000-0000-0000-0000000c5005', '1a000000-0000-0000-0000-00000000001a',
   '1aa00000-0000-0000-0000-00000000aa11', '15000000-0000-0000-0000-000000000015', 'student', 'active', 1104),
  ('1c600000-0000-0000-0000-0000000c6006', '1b000000-0000-0000-0000-00000000001b', null,
   '16000000-0000-0000-0000-000000000016', 'admin', 'active', 1105);

insert into public.subjects (id, organization_id, name)
values ('1d000000-0000-0000-0000-00000000001d', '1a000000-0000-0000-0000-00000000001a', 'Matematik');

-- İki sınıf, iki mentor. Ayrım bunun üzerine kurulu.
insert into public.classes (id, organization_id, branch_id, name, mentor_membership_id)
values
  ('1e100000-0000-0000-0000-0000000e1001', '1a000000-0000-0000-0000-00000000001a',
   '1aa00000-0000-0000-0000-00000000aa11', '12-A', '1c200000-0000-0000-0000-0000000c2002'),
  ('1e200000-0000-0000-0000-0000000e2002', '1a000000-0000-0000-0000-00000000001a',
   '1aa00000-0000-0000-0000-00000000aa11', '12-B', '1c300000-0000-0000-0000-0000000c3003');

insert into public.class_teachers (organization_id, class_id, membership_id, subject_id)
values
  ('1a000000-0000-0000-0000-00000000001a', '1e100000-0000-0000-0000-0000000e1001',
   '1c200000-0000-0000-0000-0000000c2002', '1d000000-0000-0000-0000-00000000001d'),
  ('1a000000-0000-0000-0000-00000000001a', '1e200000-0000-0000-0000-0000000e2002',
   '1c300000-0000-0000-0000-0000000c3003', '1d000000-0000-0000-0000-00000000001d');

insert into public.students (id, organization_id, branch_id, auth_user_id, full_name)
values
  ('1f100000-0000-0000-0000-0000000f1001', '1a000000-0000-0000-0000-00000000001a',
   '1aa00000-0000-0000-0000-00000000aa11', '15000000-0000-0000-0000-000000000015', 'Birinci Öğrenci'),
  ('1f200000-0000-0000-0000-0000000f2002', '1a000000-0000-0000-0000-00000000001a',
   '1aa00000-0000-0000-0000-00000000aa11', null, 'İkinci Öğrenci');

insert into public.class_enrollments (organization_id, class_id, student_id)
values
  ('1a000000-0000-0000-0000-00000000001a', '1e100000-0000-0000-0000-0000000e1001',
   '1f100000-0000-0000-0000-0000000f1001'),
  ('1a000000-0000-0000-0000-00000000001a', '1e200000-0000-0000-0000-0000000e2002',
   '1f200000-0000-0000-0000-0000000f2002');

insert into public.guardians (id, organization_id, auth_user_id, full_name)
values
  ('1a100000-0000-0000-0000-0000000a1001', '1a000000-0000-0000-0000-00000000001a',
   '14000000-0000-0000-0000-000000000014', 'Birinci Veli'),
  ('1a200000-0000-0000-0000-0000000a2002', '1a000000-0000-0000-0000-00000000001a',
   null, 'İkinci Veli');

insert into public.student_guardians (organization_id, student_id, guardian_id)
values
  ('1a000000-0000-0000-0000-00000000001a', '1f100000-0000-0000-0000-0000000f1001',
   '1a100000-0000-0000-0000-0000000a1001'),
  ('1a000000-0000-0000-0000-00000000001a', '1f200000-0000-0000-0000-0000000f2002',
   '1a200000-0000-0000-0000-0000000a2002');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Yönetici: gerileme koruması --------------------------------------------------------

select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000011', true);

select is(
  (select count(*) from public.guardians),
  2::bigint,
  'an admin still sees every guardian in their organization'
);

-- Birinci öğretmen: yeni kapsam ------------------------------------------------------

select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000012', true);

select is(
  (select count(*) from public.guardians),
  1::bigint,
  'a teacher sees exactly one guardian — the one they actually teach'
);

select is(
  (select id from public.guardians),
  '1a100000-0000-0000-0000-0000000a1001'::uuid,
  'and it is the guardian of their own student'
);

-- ⛔ Bu dosyanın var olma sebebi. Politika "bütün veliler" derse yukarıdaki iki
-- test yine geçerdi; bu geçmez.
select is(
  (select count(*) from public.guardians
   where id = '1a200000-0000-0000-0000-0000000a2002'),
  0::bigint,
  'a teacher does NOT see the guardian of a student they do not teach'
);

select is(
  (select count(*) from public.student_guardians),
  1::bigint,
  'the link row follows the same scope — one, not two'
);

-- `profiles` AÇILMADI. Öğretmen adı fonksiyondan geliyor; tablo hâlâ kapalı.
select is(
  (select count(*) from public.profiles),
  1::bigint,
  'profiles is still closed to a teacher — only their own row'
);

select is(
  (select count(*) from public.class_staff_names(
     array['1e100000-0000-0000-0000-0000000e1001']::uuid[])),
  1::bigint,
  'a teacher reads the staff name of their own class through the function'
);

-- ⛔ İkinci olumsuz: göremediğin sınıfın öğretmenini de göremezsin.
select is(
  (select count(*) from public.class_staff_names(
     array['1e200000-0000-0000-0000-0000000e2002']::uuid[])),
  0::bigint,
  'the function returns nothing for a class the caller cannot see'
);

-- Öğrenci: sorunun ikinci yarısı -----------------------------------------------------

select set_config('request.jwt.claim.sub', '15000000-0000-0000-0000-000000000015', true);

select is(
  (select display_name from public.class_staff_names(
     array['1e100000-0000-0000-0000-0000000e1001']::uuid[]) limit 1),
  'ogretmen-bir',
  'a student reads the name of the teacher of their own class'
);

-- Veli: gerileme koruması ------------------------------------------------------------

select set_config('request.jwt.claim.sub', '14000000-0000-0000-0000-000000000014', true);

select is(
  (select count(*) from public.guardians),
  1::bigint,
  'a guardian still sees only their own record — the teacher path did not widen this'
);

-- Kurum sınırı -----------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '16000000-0000-0000-0000-000000000016', true);

select is(
  (select count(*) from public.guardians),
  0::bigint,
  'an admin of another organization sees none of these guardians'
);

-- Şifre kilidi -----------------------------------------------------------------------
--
-- Kilit bütün politikalarda ortak bir şart; yeni yol da ona uymak zorunda.
-- Aksi halde şifresini değiştirmemiş bir öğretmen için yeni bir kapı açılmış
-- olurdu.

reset role;
update public.profiles
set must_change_password = true
where id = '12000000-0000-0000-0000-000000000012';

set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000012', true);

select is(
  (select count(*) from public.guardians),
  0::bigint,
  'a teacher who must change their password sees nothing — the new door obeys the lock'
);

select * from finish();
rollback;
