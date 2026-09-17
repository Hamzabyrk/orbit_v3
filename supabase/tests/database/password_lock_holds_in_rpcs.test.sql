-- Şifre kilidi `security definer` RPC'lerin içinde de tutar (#314).
--
-- 🔴 Bu dosya bir GERİLEMENİN kapısı. `v1.5-17` ve `v1.5-18` beş okuma yolunu
-- `definer` kalıbına taşıdı; kalıbın gereği yetki elle yazılıyor ve elle
-- yazılırken politikaların **her** SELECT'ine eklediği bir şart atlandı:
--
--     and not (select public.current_user_must_change_password())
--
-- Ölçüldü: şifre kilidi açık bir kurum yöneticisi tabloları doğrudan
-- okuyamıyordu (RLS tutuyor) ama beş RPC'nin beşi de veri döndürüyordu.
--
-- Kilit E3'te bilinçli konmuştu: hesap kâğıda yazılmış GEÇİCİ bir şifreyle
-- açılıyor ve ilk iş onu değiştirmek olmak zorunda. Kilit atlanabiliyorsa
-- elindeki fişle giriş yapan biri şifresini hiç değiştirmeden veri okur.
-- Ekran onu şifre sayfasına zorluyor; API zorlamıyordu.
--
-- Dosyanın kapsamı bilinçli olarak TEK şart: kilit. Fonksiyonların kendi
-- yetki kesişimleri başka dosyalarda sınanıyor (`homework_ratios`,
-- `derived_field_rpc_scope`, `report_aggregate_scope`).

begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values ('cc100000-0000-0000-0000-00000000cc10', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'kilit-yonetici@example.test', '', now(), now());

insert into public.organizations (id, name, slug, code)
values ('cc200000-0000-0000-0000-00000000cc20', 'Kilit Dershanesi', 'kilit-dershanesi', 7801);

insert into public.organization_memberships (id, organization_id, user_id, role, status)
values ('cc300000-0000-0000-0000-00000000cc30', 'cc200000-0000-0000-0000-00000000cc20',
        'cc100000-0000-0000-0000-00000000cc10', 'admin', 'active');

insert into public.subjects (id, organization_id, name)
values ('cc400000-0000-0000-0000-00000000cc40', 'cc200000-0000-0000-0000-00000000cc20', 'Matematik');

insert into public.classes (id, organization_id, name)
values ('cc500000-0000-0000-0000-00000000cc50', 'cc200000-0000-0000-0000-00000000cc20', 'Kilit A');

insert into public.students (id, organization_id, full_name, student_number)
values ('cc600000-0000-0000-0000-00000000cc60', 'cc200000-0000-0000-0000-00000000cc20',
        'Kilit Öğrencisi', '4001');

insert into public.class_enrollments (id, organization_id, class_id, student_id, created_at)
values ('cc700000-0000-0000-0000-00000000cc70', 'cc200000-0000-0000-0000-00000000cc20',
        'cc500000-0000-0000-0000-00000000cc50', 'cc600000-0000-0000-0000-00000000cc60',
        timestamptz '2026-02-01 09:00+03');

insert into public.attendance_sessions (id, organization_id, class_id, subject_id, session_date, starts_at)
values ('cc800000-0000-0000-0000-00000000cc80', 'cc200000-0000-0000-0000-00000000cc20',
        'cc500000-0000-0000-0000-00000000cc50', 'cc400000-0000-0000-0000-00000000cc40',
        '2026-03-02', '09:00');

insert into public.attendance_records (id, organization_id, session_id, student_id, status)
values ('cc900000-0000-0000-0000-00000000cc90', 'cc200000-0000-0000-0000-00000000cc20',
        'cc800000-0000-0000-0000-00000000cc80', 'cc600000-0000-0000-0000-00000000cc60', 'present');

insert into public.exams (id, organization_id, class_id, subject_id, name, exam_date, max_score)
values ('cca00000-0000-0000-0000-00000000cca0', 'cc200000-0000-0000-0000-00000000cc20',
        'cc500000-0000-0000-0000-00000000cc50', 'cc400000-0000-0000-0000-00000000cc40',
        'Kilit Deneme', '2026-03-10', 100);

insert into public.exam_results (id, organization_id, exam_id, student_id, score)
values ('ccb00000-0000-0000-0000-00000000ccb0', 'cc200000-0000-0000-0000-00000000cc20',
        'cca00000-0000-0000-0000-00000000cca0', 'cc600000-0000-0000-0000-00000000cc60', 70);

insert into public.payment_plans (id, organization_id, student_id, name, total_amount)
values ('ccc00000-0000-0000-0000-00000000ccc0', 'cc200000-0000-0000-0000-00000000cc20',
        'cc600000-0000-0000-0000-00000000cc60', 'Kilit Plan', 1000);

insert into public.installments (id, organization_id, plan_id, sequence_no, due_date, amount, paid_at)
values ('ccd00000-0000-0000-0000-00000000ccd0', 'cc200000-0000-0000-0000-00000000cc20',
        'ccc00000-0000-0000-0000-00000000ccc0', 1, public.orbit_today() - 5, 500, null);

insert into public.homework_assignments (id, organization_id, class_id, subject_id, title,
  assigned_on, due_date, submissions_recorded_at)
values ('cce00000-0000-0000-0000-00000000cce0', 'cc200000-0000-0000-0000-00000000cc20',
        'cc500000-0000-0000-0000-00000000cc50', 'cc400000-0000-0000-0000-00000000cc40',
        'Kilit Ödevi', '2026-03-01', '2026-03-08', '2026-03-09 20:00:00+03');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'cc100000-0000-0000-0000-00000000cc10', true);

-- ===========================================================================
-- Kilit KAPALI: kurgu gerçekten veri üretiyor mu
-- ===========================================================================
--
-- Bu beş iddia olmadan aşağıdaki beş iddia anlamsız olurdu: her şey boşsa
-- kilit tutuyormuş gibi görünür. Önce verinin görünür olduğu gösteriliyor.

select is(
  (select count(*) from public.student_attendance_counts(
     array['cc600000-0000-0000-0000-00000000cc60']::uuid[])),
  1::bigint,
  'with the lock off the attendance count is visible — the fixture really produces data'
);

select is(
  (select count(*) from public.student_latest_exam_scores(
     array['cc600000-0000-0000-0000-00000000cc60']::uuid[])),
  1::bigint,
  'with the lock off the latest exam score is visible'
);

select is(
  (select count(*) from public.student_homework_ratios(
     array['cc600000-0000-0000-0000-00000000cc60']::uuid[])),
  1::bigint,
  'with the lock off the homework ratio is visible'
);

select is(
  (select count(*) from public.report_exam_averages()),
  1::bigint,
  'with the lock off the exam average is visible'
);

select is(
  (select count(*) from public.payment_overview_counts()),
  1::bigint,
  'with the lock off the payment counters are visible'
);

-- ===========================================================================
-- 🔴 Kilit AÇIK: beşinin beşi de HİÇBİR ŞEY döndürmeli
-- ===========================================================================

reset role;
update public.profiles set must_change_password = true
where id = 'cc100000-0000-0000-0000-00000000cc10';

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'cc100000-0000-0000-0000-00000000cc10', true);

-- 6 · Referans: RLS doğrudan okumada kilidi ZATEN tutuyor. Bu satır düşerse
--     sorun fonksiyonlarda değil politikalardadır.
select is(
  (select count(*) from public.attendance_records),
  0::bigint,
  'the policies themselves hold the lock on a direct read — this is the reference the RPCs must match'
);

select is(
  (select count(*) from public.student_attendance_counts(
     array['cc600000-0000-0000-0000-00000000cc60']::uuid[])),
  0::bigint,
  'student_attendance_counts respects the password lock'
);

select is(
  (select count(*) from public.student_latest_exam_scores(
     array['cc600000-0000-0000-0000-00000000cc60']::uuid[])),
  0::bigint,
  'student_latest_exam_scores respects the password lock'
);

select is(
  (select count(*) from public.student_homework_ratios(
     array['cc600000-0000-0000-0000-00000000cc60']::uuid[])),
  0::bigint,
  'student_homework_ratios respects the password lock'
);

select is(
  (select count(*) from public.report_exam_averages()),
  0::bigint,
  'report_exam_averages respects the password lock'
);

select is(
  (select count(*) from public.payment_overview_counts()),
  0::bigint,
  'payment_overview_counts respects the password lock — not even zeros'
);

select * from finish();
rollback;
