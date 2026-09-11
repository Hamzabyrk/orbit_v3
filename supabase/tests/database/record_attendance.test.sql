-- v1.4-03 — Yoklama tek nefeste kaydedilir (#268).
--
-- İki iddia kümesi var ve ikincisi bu dilimin asıl kararını kilitliyor:
--
--   1. Kim kaydedebilir — ve bu dilim v1.4'te ilk kez yazma yetkisinin yalnız
--      yöneticide olmadığı yer: sınıfın öğretmeni de kaydeder.
--   2. Denetim kapsamı — ilk giriş iz bırakmaz, sonraki DEĞİŞİKLİK bırakır.
--      Kesme yeri bilinçli ve ölçülü (§4.12: ~90M satır/yıl), dolayısıyla
--      "iz yok" iddiası da en az "iz var" kadar test edilmeli.

begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('f1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'yonetici@example.test', '', now(), now()),
  ('f2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'sinifin-ogretmeni@example.test', '', now(), now()),
  ('f3000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'baska-ogretmen@example.test', '', now(), now()),
  ('f4000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogrenci@example.test', '', now(), now());

insert into public.organizations (id, name, slug, code)
values ('ff000000-0000-0000-0000-0000000000ff', 'Kurum F', 'kurum-f-v143', 7401);

insert into public.branches (id, organization_id, name, is_default)
values ('f1100000-0000-0000-0000-0000000011f1', 'ff000000-0000-0000-0000-0000000000ff', 'F Merkez', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('34000000-0000-0000-0000-000000000001', 'ff000000-0000-0000-0000-0000000000ff', null,
   'f1000000-0000-0000-0000-000000000001', 'admin', 'active', 1000),
  ('34000000-0000-0000-0000-000000000002', 'ff000000-0000-0000-0000-0000000000ff',
   'f1100000-0000-0000-0000-0000000011f1', 'f2000000-0000-0000-0000-000000000002',
   'teacher', 'active', 1001),
  ('34000000-0000-0000-0000-000000000003', 'ff000000-0000-0000-0000-0000000000ff',
   'f1100000-0000-0000-0000-0000000011f1', 'f3000000-0000-0000-0000-000000000003',
   'teacher', 'active', 1002),
  ('34000000-0000-0000-0000-000000000004', 'ff000000-0000-0000-0000-0000000000ff',
   'f1100000-0000-0000-0000-0000000011f1', 'f4000000-0000-0000-0000-000000000004',
   'student', 'active', 1003);

insert into public.subjects (id, organization_id, name)
values ('f9000000-0000-0000-0000-000000000009', 'ff000000-0000-0000-0000-0000000000ff', 'Matematik');

insert into public.classes (id, organization_id, branch_id, name)
values
  ('cf000000-0000-0000-0000-0000000000c1', 'ff000000-0000-0000-0000-0000000000ff',
   'f1100000-0000-0000-0000-0000000011f1', 'Yoklama Sınıfı'),
  ('cf000000-0000-0000-0000-0000000000c2', 'ff000000-0000-0000-0000-0000000000ff',
   'f1100000-0000-0000-0000-0000000011f1', 'Başka Sınıf');

-- Yalnız birinci öğretmen bu sınıfa giriyor.
insert into public.class_teachers (organization_id, class_id, membership_id, subject_id)
values ('ff000000-0000-0000-0000-0000000000ff', 'cf000000-0000-0000-0000-0000000000c1',
        '34000000-0000-0000-0000-000000000002', 'f9000000-0000-0000-0000-000000000009');

insert into public.students (id, organization_id, branch_id, full_name)
values
  ('5f000000-0000-0000-0000-00000000f001', 'ff000000-0000-0000-0000-0000000000ff',
   'f1100000-0000-0000-0000-0000000011f1', 'Kayıtlı Öğrenci'),
  ('5f000000-0000-0000-0000-00000000f002', 'ff000000-0000-0000-0000-0000000000ff',
   'f1100000-0000-0000-0000-0000000011f1', 'İkinci Kayıtlı'),
  ('5f000000-0000-0000-0000-00000000f003', 'ff000000-0000-0000-0000-0000000000ff',
   'f1100000-0000-0000-0000-0000000011f1', 'Sınıfa Kayıtsız Öğrenci');

insert into public.class_enrollments (organization_id, class_id, student_id)
values
  ('ff000000-0000-0000-0000-0000000000ff', 'cf000000-0000-0000-0000-0000000000c1',
   '5f000000-0000-0000-0000-00000000f001'),
  ('ff000000-0000-0000-0000-0000000000ff', 'cf000000-0000-0000-0000-0000000000c1',
   '5f000000-0000-0000-0000-00000000f002');

insert into public.attendance_sessions (id, organization_id, class_id, session_date)
values ('a5000000-0000-0000-0000-0000000000a5', 'ff000000-0000-0000-0000-0000000000ff',
        'cf000000-0000-0000-0000-0000000000c1', current_date);

-- Oturum açmak iz bırakır ------------------------------------------------------

select is(
  (select count(*) from public.audit_events
   where entity_id = 'a5000000-0000-0000-0000-0000000000a5'
     and action = 'attendance_session.created'),
  1::bigint,
  'opening a session leaves a trace'
);

-- Yetki sınırları --------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'f4000000-0000-0000-0000-000000000004', true);

select throws_ok(
  $sql$select public.record_attendance(
    'a5000000-0000-0000-0000-0000000000a5',
    '[{"student_id": "5f000000-0000-0000-0000-00000000f001", "status": "present"}]'::jsonb
  )$sql$,
  '42501',
  null,
  'a student cannot record attendance'
);

select set_config('request.jwt.claim.sub', 'f3000000-0000-0000-0000-000000000003', true);

select throws_ok(
  $sql$select public.record_attendance(
    'a5000000-0000-0000-0000-0000000000a5',
    '[{"student_id": "5f000000-0000-0000-0000-00000000f001", "status": "present"}]'::jsonb
  )$sql$,
  '42501',
  null,
  'a teacher who does not teach this class cannot record its attendance'
);

-- Sınıfın öğretmeni kaydedebilir -----------------------------------------------
--
-- v1.4'te ilk kez yazan taraf yönetici DEĞİL.

select set_config('request.jwt.claim.sub', 'f2000000-0000-0000-0000-000000000002', true);

select is(
  (select public.record_attendance(
    'a5000000-0000-0000-0000-0000000000a5',
    '[{"student_id": "5f000000-0000-0000-0000-00000000f001", "status": "absent"},
      {"student_id": "5f000000-0000-0000-0000-00000000f002", "status": "present"}]'::jsonb
  )),
  2,
  'the class teacher records the whole class in one call'
);

select is(
  (select status::text from public.attendance_records
   where session_id = 'a5000000-0000-0000-0000-0000000000a5'
     and student_id = '5f000000-0000-0000-0000-00000000f001'),
  'absent',
  'the status is actually written'
);

-- ⛔ Bu dilimin kesme yeri: ilk giriş iz BIRAKMAZ.
--
-- Denetim okumaları `reset role` ile yapılıyor: `audit_events` RLS taşıyor ve
-- burada ölçülmek istenen "kaç satır yazıldı", "öğretmen kaç satır görüyor"
-- değil.

reset role;

select is(
  (select count(*) from public.audit_events where action = 'attendance_record.created'),
  0::bigint,
  'the initial bulk entry writes no audit row — that is the measured decision, not an omission'
);

-- İlk girişte kimin yazdığı oturumdan okunur ------------------------------------
--
-- Fikstürdeki oturumu superuser açtı, dolayısıyla kaydedeni boş. Gerçek akışa
-- sadık olan, oturumu öğretmenin kendisinin açması: `id` sütunu
-- `authenticated` için salt okunur olduğundan kimliği veritabanı üretir.

set local role authenticated;

select lives_ok(
  $sql$insert into public.attendance_sessions (organization_id, class_id, session_date)
    values ('ff000000-0000-0000-0000-0000000000ff', 'cf000000-0000-0000-0000-0000000000c1',
            current_date - 1)$sql$,
  'the class teacher can open a session, and does not supply the id'
);

select is(
  (select recorded_by_membership_id from public.attendance_sessions
   where session_date = current_date - 1),
  '34000000-0000-0000-0000-000000000002'::uuid,
  'who opened the session is recorded by its own trigger'
);

-- Tekrar kaydetme: güncelleme, ikinci satır değil ------------------------------

select is(
  (select public.record_attendance(
    'a5000000-0000-0000-0000-0000000000a5',
    '[{"student_id": "5f000000-0000-0000-0000-00000000f001", "status": "excused"}]'::jsonb
  )),
  1,
  'recording again returns the number of rows touched'
);

select is(
  (select count(*) from public.attendance_records
   where session_id = 'a5000000-0000-0000-0000-0000000000a5'),
  2::bigint,
  'recording again does not create a second row for the same student'
);

select is(
  (select status::text from public.attendance_records
   where session_id = 'a5000000-0000-0000-0000-0000000000a5'
     and student_id = '5f000000-0000-0000-0000-00000000f001'),
  'excused',
  'the status is updated in place'
);

-- ✅ Ve DEĞİŞİKLİK iz bırakır — velinin itiraz edeceği işlem tam olarak bu.

reset role;

select is(
  (select count(*) from public.audit_events where action = 'attendance_record.updated'),
  1::bigint,
  'changing a status afterwards does leave a trace'
);

select is(
  (select metadata ->> 'status' from public.audit_events
   where action = 'attendance_record.updated'),
  'excused',
  'the audit row carries the new status'
);

select is(
  (select metadata -> 'changed' from public.audit_events
   where action = 'attendance_record.updated'),
  '["status"]'::jsonb,
  'and names the field that changed'
);

select is(
  (select metadata ->> 'student_id' from public.audit_events
   where action = 'attendance_record.updated'),
  '5f000000-0000-0000-0000-00000000f001',
  'and says which student it was about'
);

-- Şemanın kuralları RPC tarafından tekrarlanmıyor, olduğu gibi geçiyor ---------

set local role authenticated;

select throws_ok(
  $sql$select public.record_attendance(
    'a5000000-0000-0000-0000-0000000000a5',
    '[{"student_id": "5f000000-0000-0000-0000-00000000f003", "status": "present"}]'::jsonb
  )$sql$,
  'ORB02',
  null,
  'a student who is not enrolled in the class is refused by the schema, not by a second rule'
);

select throws_ok(
  $sql$select public.record_attendance(
    'a5000000-0000-0000-0000-0000000000a5',
    '[{"student_id": "5f000000-0000-0000-0000-00000000f001", "status": "belki"}]'::jsonb
  )$sql$,
  '22P02',
  null,
  'an invalid status is refused by the enum'
);

-- Biçim ve varlık ---------------------------------------------------------------

select throws_ok(
  $sql$select public.record_attendance(
    'a5000000-0000-0000-0000-0000000000a5',
    '{"student_id": "5f000000-0000-0000-0000-00000000f001"}'::jsonb
  )$sql$,
  '22023',
  null,
  'the entry list must be an array'
);

select throws_ok(
  $sql$select public.record_attendance(
    'a5000000-0000-0000-0000-0000000000ff',
    '[]'::jsonb
  )$sql$,
  '23503',
  null,
  'a session that does not exist is refused'
);

select is(
  (select public.record_attendance('a5000000-0000-0000-0000-0000000000a5', '[]'::jsonb)),
  0,
  'an empty list is a legitimate call that writes nothing'
);

-- Şifre kilidi -------------------------------------------------------------------

reset role;
update public.profiles
set must_change_password = true
where id = 'f2000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f2000000-0000-0000-0000-000000000002', true);

select throws_ok(
  $sql$select public.record_attendance(
    'a5000000-0000-0000-0000-0000000000a5',
    '[{"student_id": "5f000000-0000-0000-0000-00000000f001", "status": "present"}]'::jsonb
  )$sql$,
  '42501',
  null,
  'a teacher who must change their password cannot record either'
);

select throws_ok(
  $sql$select public.audit_row_change()$sql$,
  '42501',
  null,
  'the shared ledger writer stays closed to authenticated'
);

select * from finish();
rollback;
