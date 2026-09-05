-- v1.2-04 — Yoklamanın sınırları.
--
-- Bu dosyanın en önemli testleri **öğretmenin ilk yazma yetkisinin ne kadar dar
-- olduğunu** ölçenlerdir. Öğretmen bugüne kadar her tabloda salt okurdu; yazma
-- açılırken rolüne değil **atamasına** bağlandığı kanıtlanmalı: dersini verdiği
-- sınıfa yazabilmeli, komşu sınıfa yazamamalı.
--
-- İkinci grup, yoklamayı kimin aldığı bilgisinin **istemci tarafından
-- uydurulamadığını** ölçüyor: sütun yazma yetkisinde yok, trigger çağıranın
-- kimliğinden dolduruyor.
--
-- Bir test bilinçli olarak **sonucu** ölçüyor, hata kodunu değil (K-13).

begin;

create extension if not exists pgtap with schema extensions;
select plan(28);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('a1000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'kurum-yoneticisi@example.test', '', now(), now()),
  ('a2000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'matematik-ogretmeni@example.test', '', now(), now()),
  ('a3000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'fizik-ogretmeni@example.test', '', now(), now()),
  ('a4000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogrenci@example.test', '', now(), now()),
  ('a5000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'veli@example.test', '', now(), now()),
  ('b1000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'diger-kurum-yoneticisi@example.test', '', now(), now()),
  ('0c000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'platform-operatoru@example.test', '', now(), now());

insert into public.platform_operators (user_id, role, status)
values ('0c000000-0000-0000-0000-00000000000c', 'owner', 'active');

insert into public.organizations (id, name, slug, code)
values
  ('aa000000-0000-0000-0000-0000000000aa', 'Kurum A', 'kurum-a-v1204', 7301),
  ('bb000000-0000-0000-0000-0000000000bb', 'Kurum B', 'kurum-b-v1204', 7302);

insert into public.branches (id, organization_id, name, is_default)
values
  ('aaa00000-0000-0000-0000-000000000aa1', 'aa000000-0000-0000-0000-0000000000aa', 'A Merkez', true),
  ('bbb00000-0000-0000-0000-000000000bb1', 'bb000000-0000-0000-0000-0000000000bb', 'B Merkez', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('10000000-0000-0000-0000-000000000100', 'aa000000-0000-0000-0000-0000000000aa', null,
   'a1000000-0000-0000-0000-0000000000a1', 'admin', 'active', 1000),
  ('20000000-0000-0000-0000-000000000200', 'aa000000-0000-0000-0000-0000000000aa', 'aaa00000-0000-0000-0000-000000000aa1',
   'a2000000-0000-0000-0000-0000000000a2', 'teacher', 'active', 1001),
  ('30000000-0000-0000-0000-000000000300', 'aa000000-0000-0000-0000-0000000000aa', 'aaa00000-0000-0000-0000-000000000aa1',
   'a3000000-0000-0000-0000-0000000000a3', 'teacher', 'active', 1002),
  ('40000000-0000-0000-0000-000000000400', 'aa000000-0000-0000-0000-0000000000aa', 'aaa00000-0000-0000-0000-000000000aa1',
   'a4000000-0000-0000-0000-0000000000a4', 'student', 'active', 1003),
  ('50000000-0000-0000-0000-000000000500', 'aa000000-0000-0000-0000-0000000000aa', 'aaa00000-0000-0000-0000-000000000aa1',
   'a5000000-0000-0000-0000-0000000000a5', 'parent', 'active', 1004),
  ('60000000-0000-0000-0000-000000000600', 'bb000000-0000-0000-0000-0000000000bb', 'bbb00000-0000-0000-0000-000000000bb1',
   'b1000000-0000-0000-0000-0000000000b1', 'admin', 'active', 1000);

insert into public.subjects (id, organization_id, name)
values
  ('50000000-0000-0000-0000-0000000000f1', 'aa000000-0000-0000-0000-0000000000aa', 'Matematik'),
  ('50000000-0000-0000-0000-0000000000f2', 'aa000000-0000-0000-0000-0000000000aa', 'Fizik');

insert into public.classes (id, organization_id, branch_id, name, program)
values
  ('c0000000-0000-0000-0000-0000000000c1', 'aa000000-0000-0000-0000-0000000000aa',
   'aaa00000-0000-0000-0000-000000000aa1', 'YKS 12-A', 'YKS'),
  ('c0000000-0000-0000-0000-0000000000c2', 'aa000000-0000-0000-0000-0000000000aa',
   'aaa00000-0000-0000-0000-000000000aa1', 'YKS 12-B', 'YKS'),
  ('c0000000-0000-0000-0000-0000000000c3', 'bb000000-0000-0000-0000-0000000000bb',
   'bbb00000-0000-0000-0000-000000000bb1', 'LGS 8-A', 'LGS');

-- Matematik öğretmeni 12-A'ya atanmış, Fizik öğretmeni 12-B'ye. Yazma
-- sınırının kanıtı bu ayrımda.
insert into public.class_teachers (organization_id, class_id, membership_id, subject_id)
values
  ('aa000000-0000-0000-0000-0000000000aa', 'c0000000-0000-0000-0000-0000000000c1',
   '20000000-0000-0000-0000-000000000200', '50000000-0000-0000-0000-0000000000f1'),
  ('aa000000-0000-0000-0000-0000000000aa', 'c0000000-0000-0000-0000-0000000000c2',
   '30000000-0000-0000-0000-000000000300', '50000000-0000-0000-0000-0000000000f2');

insert into public.students (id, organization_id, branch_id, auth_user_id, full_name)
values
  ('50000000-0000-0000-0000-000000000801', 'aa000000-0000-0000-0000-0000000000aa',
   'aaa00000-0000-0000-0000-000000000aa1', 'a4000000-0000-0000-0000-0000000000a4', 'Birinci Öğrenci'),
  ('50000000-0000-0000-0000-000000000802', 'aa000000-0000-0000-0000-0000000000aa',
   'aaa00000-0000-0000-0000-000000000aa1', null, 'İkinci Öğrenci'),
  -- 12-A'da, ama fixture'da hiç yoklama kaydı YOK. Öğretmenin meşru yazma
  -- durumunu göstermek için gerekli: 801'in e1'de zaten kaydı var ve
  -- benzersizlik kısıtı ikinci bir kaydı reddederdi.
  ('50000000-0000-0000-0000-000000000803', 'aa000000-0000-0000-0000-0000000000aa',
   'aaa00000-0000-0000-0000-000000000aa1', null, 'Üçüncü Öğrenci');

insert into public.guardians (id, organization_id, auth_user_id, full_name)
values ('60000000-0000-0000-0000-000000000901', 'aa000000-0000-0000-0000-0000000000aa',
        'a5000000-0000-0000-0000-0000000000a5', 'Birinci Veli');

insert into public.student_guardians (organization_id, student_id, guardian_id)
values ('aa000000-0000-0000-0000-0000000000aa', '50000000-0000-0000-0000-000000000801',
        '60000000-0000-0000-0000-000000000901');

insert into public.class_enrollments (organization_id, class_id, student_id)
values
  ('aa000000-0000-0000-0000-0000000000aa', 'c0000000-0000-0000-0000-0000000000c1',
   '50000000-0000-0000-0000-000000000801'),
  ('aa000000-0000-0000-0000-0000000000aa', 'c0000000-0000-0000-0000-0000000000c2',
   '50000000-0000-0000-0000-000000000802'),
  ('aa000000-0000-0000-0000-0000000000aa', 'c0000000-0000-0000-0000-0000000000c1',
   '50000000-0000-0000-0000-000000000803');

insert into public.attendance_sessions
  (id, organization_id, class_id, subject_id, session_date, starts_at)
values
  ('e0000000-0000-0000-0000-0000000000e1', 'aa000000-0000-0000-0000-0000000000aa',
   'c0000000-0000-0000-0000-0000000000c1', '50000000-0000-0000-0000-0000000000f1',
   date '2026-09-01', time '09:00'),
  ('e0000000-0000-0000-0000-0000000000e2', 'aa000000-0000-0000-0000-0000000000aa',
   'c0000000-0000-0000-0000-0000000000c2', '50000000-0000-0000-0000-0000000000f2',
   date '2026-09-01', time '10:00');

insert into public.attendance_records (organization_id, session_id, student_id, status)
values
  ('aa000000-0000-0000-0000-0000000000aa', 'e0000000-0000-0000-0000-0000000000e1',
   '50000000-0000-0000-0000-000000000801', 'present'),
  ('aa000000-0000-0000-0000-0000000000aa', 'e0000000-0000-0000-0000-0000000000e2',
   '50000000-0000-0000-0000-000000000802', 'absent');

-- Veri düzeyi --------------------------------------------------------------------

select throws_ok(
  $sql$insert into public.attendance_sessions
      (organization_id, class_id, subject_id, session_date, starts_at)
    values (
      'aa000000-0000-0000-0000-0000000000aa',
      'c0000000-0000-0000-0000-0000000000c1',
      '50000000-0000-0000-0000-0000000000f1',
      date '2026-09-01',
      time '09:00'
    )$sql$,
  '23505',
  null,
  'the same lesson attendance cannot be opened twice'
);

-- Aynı gün aynı sınıf, ama günlük yoklama: ders yoklamasıyla çakışmamalı.
select lives_ok(
  $sql$insert into public.attendance_sessions
      (organization_id, class_id, session_date)
    values (
      'aa000000-0000-0000-0000-0000000000aa',
      'c0000000-0000-0000-0000-0000000000c1',
      date '2026-09-01'
    )$sql$,
  'a daily attendance can exist alongside a lesson attendance on the same day'
);

select throws_ok(
  $sql$insert into public.attendance_sessions
      (organization_id, class_id, session_date)
    values (
      'aa000000-0000-0000-0000-0000000000aa',
      'c0000000-0000-0000-0000-0000000000c1',
      date '2026-09-01'
    )$sql$,
  '23505',
  null,
  'a daily attendance cannot be opened twice either — NULL subject does not create a hole'
);

select throws_ok(
  $sql$insert into public.attendance_sessions
      (organization_id, class_id, session_date)
    values (
      'aa000000-0000-0000-0000-0000000000aa',
      'c0000000-0000-0000-0000-0000000000c3',
      date '2026-09-02'
    )$sql$,
  '23503',
  null,
  'an attendance session cannot point at another organization class'
);

select throws_ok(
  $sql$insert into public.attendance_records (organization_id, session_id, student_id, status)
    values (
      'aa000000-0000-0000-0000-0000000000aa',
      'e0000000-0000-0000-0000-0000000000e1',
      '50000000-0000-0000-0000-000000000801',
      'absent'
    )$sql$,
  '23505',
  null,
  'a student cannot hold two records in one session'
);

-- INSERT'i korumak tek başına yetmiyor: oturum sonradan başka bir sınıfa
-- taşınırsa kural geriye dönük bozulurdu. Bu yol bugün yalnızca `service_role`
-- ve superuser için açık (`class_id` yazma yetkisinde değil) — testin burada,
-- rol geçişlerinden ÖNCE olmasının sebebi bu.
select throws_ok(
  $sql$update public.attendance_sessions
      set class_id = 'c0000000-0000-0000-0000-0000000000c2'
      where id = 'e0000000-0000-0000-0000-0000000000e1'$sql$,
  'ORB02',
  null,
  'a session cannot move to a class that would orphan its existing records'
);

-- Ve koruma her taşımayı reddetmiyor: kaydı olmayan bir oturum serbestçe
-- taşınır. Her zaman reddeden bir koruma, hiç reddetmeyen kadar yanlıştır.
select lives_ok(
  $sql$update public.attendance_sessions
      set class_id = 'c0000000-0000-0000-0000-0000000000c2'
      where session_date = date '2026-09-01'
        and subject_id is null
        and class_id = 'c0000000-0000-0000-0000-0000000000c1'$sql$,
  'a session with no records can move freely'
);

-- Yukarıdaki taşıma fixture'ı değiştirdi: 12-A bir oturum kaybetti ve dosyanın
-- sonundaki "veli çocuğunun sınıfının üç oturumunu görür" iddiası bozulurdu.
-- Geri alınıyor — bir iddia değil, düzen toplama.
update public.attendance_sessions
set class_id = 'c0000000-0000-0000-0000-0000000000c1'
where session_date = date '2026-09-01'
  and subject_id is null
  and class_id = 'c0000000-0000-0000-0000-0000000000c2';

create function pg_temp.silmeyi_dene(org uuid, actor uuid)
returns text
language plpgsql
as $fn$
declare
  gerekce text;
begin
  perform public.internal_delete_organization(org, actor);
  return null;
exception when sqlstate 'ORB01' then
  get stacked diagnostics gerekce = pg_exception_detail;
  return gerekce;
end;
$fn$;

select ok(
  pg_temp.silmeyi_dene(
    'aa000000-0000-0000-0000-0000000000aa',
    '0c000000-0000-0000-0000-00000000000c'
  )::jsonb @> '[{"table": "attendance_sessions", "rows": 3},
                {"table": "attendance_records", "rows": 2}]'::jsonb,
  'the deletion guard counts both attendance tables without being told about them'
);

-- Öğretmenin ilk yazma yetkisi -------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'a2000000-0000-0000-0000-0000000000a2', true);

select lives_ok(
  $sql$insert into public.attendance_sessions
      (organization_id, class_id, subject_id, session_date, starts_at)
    values (
      'aa000000-0000-0000-0000-0000000000aa',
      'c0000000-0000-0000-0000-0000000000c1',
      '50000000-0000-0000-0000-0000000000f1',
      date '2026-09-08',
      time '09:00'
    )$sql$,
  'a teacher can open attendance for the class they are assigned to'
);

-- Sütun yazma yetkisinde olmadığı hâlde doldurulmuş olmalı.
select is(
  (select recorded_by_membership_id from public.attendance_sessions
     where session_date = date '2026-09-08'),
  '20000000-0000-0000-0000-000000000200'::uuid,
  'the recorder is filled from the caller identity, not from what the client sent'
);

select throws_ok(
  $sql$insert into public.attendance_sessions
      (organization_id, class_id, subject_id, session_date)
    values (
      'aa000000-0000-0000-0000-0000000000aa',
      'c0000000-0000-0000-0000-0000000000c2',
      '50000000-0000-0000-0000-0000000000f1',
      date '2026-09-08'
    )$sql$,
  '42501',
  null,
  'a teacher cannot open attendance for a class they do not teach'
);

-- ⛔ Bu iddia 2026-09-05'e kadar `lives_ok` idi ve etiketi
-- "a teacher can record attendance in a session of their own class" diyordu.
-- Etiket oturum yarısını anlatıyor, öğrencinin YABANCI olduğunu hiç
-- söylemiyordu: 802, 12-B'nin öğrencisi; oturum e1 ise 12-A'nın. Yani test
-- açığı yakalamıyor, **doğru davranış olarak çiviliyordu** (K-17).
select throws_ok(
  $sql$insert into public.attendance_records (organization_id, session_id, student_id, status)
    values (
      'aa000000-0000-0000-0000-0000000000aa',
      'e0000000-0000-0000-0000-0000000000e1',
      '50000000-0000-0000-0000-000000000802',
      'excused'
    )$sql$,
  'ORB02',
  null,
  'a teacher cannot record a student who is not enrolled in the session class'
);

-- Ve engellenen şeyin gerçekten OLMADIĞI ayrıca ölçülüyor: hata kodu bizim
-- seçtiğimiz bir sözleşme, kaydın yokluğu ise olgunun kendisi (K-13).
select is(
  (select count(*) from public.attendance_records
     where session_id = 'e0000000-0000-0000-0000-0000000000e1'
       and student_id = '50000000-0000-0000-0000-000000000802'),
  0::bigint,
  'the rejected record was really not written'
);

-- Meşru durum: 803 gerçekten 12-A'da ve oturum 12-A'nın.
select lives_ok(
  $sql$insert into public.attendance_records (organization_id, session_id, student_id, status)
    values (
      'aa000000-0000-0000-0000-0000000000aa',
      'e0000000-0000-0000-0000-0000000000e1',
      '50000000-0000-0000-0000-000000000803',
      'excused'
    )$sql$,
  'a teacher can record a student who is enrolled in the session class'
);

select throws_ok(
  $sql$update public.attendance_sessions
      set recorded_by_membership_id = '10000000-0000-0000-0000-000000000100'
      where id = 'e0000000-0000-0000-0000-0000000000e1'$sql$,
  '42501',
  null,
  'nobody can claim someone else took the roll'
);

-- Atanmamış öğretmen ------------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'a3000000-0000-0000-0000-0000000000a3', true);

select throws_ok(
  $sql$insert into public.attendance_records (organization_id, session_id, student_id, status)
    values (
      'aa000000-0000-0000-0000-0000000000aa',
      'e0000000-0000-0000-0000-0000000000e1',
      '50000000-0000-0000-0000-000000000801',
      'absent'
    )$sql$,
  '42501',
  null,
  'a teacher cannot write into another teacher session'
);

select is(
  (select count(*) from public.attendance_sessions),
  1::bigint,
  'a teacher sees only the sessions of the class they teach'
);

-- Yönetici ------------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-0000000000a1', true);

select lives_ok(
  $sql$insert into public.attendance_sessions
      (organization_id, class_id, subject_id, session_date)
    values (
      'aa000000-0000-0000-0000-0000000000aa',
      'c0000000-0000-0000-0000-0000000000c2',
      '50000000-0000-0000-0000-0000000000f2',
      date '2026-09-09'
    )$sql$,
  'an admin can open attendance for any class in their organization'
);

select throws_ok(
  $sql$delete from public.attendance_sessions
      where id = 'e0000000-0000-0000-0000-0000000000e1'$sql$,
  '42501',
  null,
  'nobody deletes an attendance session through the API'
);

-- Öğrenci ve veli ---------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'a4000000-0000-0000-0000-0000000000a4', true);

select is(
  (select count(*) from public.attendance_records),
  1::bigint,
  'a student sees only their own attendance records'
);

select is(
  (select student_id from public.attendance_records),
  '50000000-0000-0000-0000-000000000801'::uuid,
  'the attendance a student sees is their own'
);

select set_config('request.jwt.claim.sub', 'a5000000-0000-0000-0000-0000000000a5', true);

select is(
  (select count(*) from public.attendance_records),
  1::bigint,
  'a guardian sees their child attendance and nobody else'
);

select throws_ok(
  $sql$insert into public.attendance_records (organization_id, session_id, student_id, status)
    values (
      'aa000000-0000-0000-0000-0000000000aa',
      'e0000000-0000-0000-0000-0000000000e1',
      '50000000-0000-0000-0000-000000000801',
      'present'
    )$sql$,
  '42501',
  null,
  'a guardian cannot record attendance'
);

-- K-13: bu engel `using` tarafından geliyor, yani UPDATE hata FIRLATMAZ —
-- sessizce sıfır satır günceller. Ölçülen şey hata kodu değil, kaydın
-- değişmemiş olması.
-- Yazılmaya çalışılan değer mevcut değerden FARKLI olmak zorunda. Aynı değer
-- yazılsaydı, güncelleme başarılı olsa bile sonuç aynı çıkar ve test yanlış
-- sebeple yeşil kalırdı.
update public.attendance_records
set status = 'absent'
where student_id = '50000000-0000-0000-0000-000000000801';

select is(
  (select status from public.attendance_records
     where student_id = '50000000-0000-0000-0000-000000000801'),
  'present'::public.attendance_status,
  'a guardian update silently changes nothing — the record is still present'
);

-- Velinin kapsamı ÇOCUĞUNUN SINIFI, çocuğunun kaydı olan oturum değil: 12-A'nın
-- üç oturumunu da görür, 12-B'ninkileri görmez.
select is(
  (select count(*) from public.attendance_sessions),
  3::bigint,
  'a guardian sees the sessions of their child class and no other class'
);

-- Kilit ve anon ------------------------------------------------------------------------------

reset role;
update public.profiles set must_change_password = true
where id = 'a1000000-0000-0000-0000-0000000000a1';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-0000000000a1', true);

select is(
  (select count(*) from public.attendance_sessions),
  0::bigint,
  'an admin who must change their password reads no attendance'
);

reset role;
set local role anon;

select throws_ok(
  $sql$select * from public.attendance_sessions$sql$,
  '42501',
  null,
  'anon cannot read attendance sessions'
);

select throws_ok(
  $sql$select * from public.attendance_records$sql$,
  '42501',
  null,
  'anon cannot read attendance records'
);

select * from finish();
rollback;
