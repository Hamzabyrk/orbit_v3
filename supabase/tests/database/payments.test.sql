-- v1.2-06 — Ödeme planı ve taksitlerin sınırları.
--
-- Bu dosyanın ayırt edici testleri **görmeyen** rolleri ölçenler. Öğretmen ve
-- öğrencinin ödeme verisine erişemediği, diğer dilimlerdeki gibi "henüz kapsamı
-- yok" değil — ikisi de bilinçli kapatıldı ve öyle kalacak. Bir gün biri
-- kapsamı genişletmeye kalkarsa bu testler kırmızıya döner ve kararı hatırlatır.
--
-- Bir test de durumun SAKLANMADIĞINI kanıtlıyor: "gecikmiş taksit" sorusu
-- `paid_at` ve `due_date`'ten türetiliyor, bir sütundan okunmuyor.

begin;

create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('d1000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'kurum-yoneticisi@example.test', '', now(), now()),
  ('d2000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogretmen@example.test', '', now(), now()),
  ('d3000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogrenci@example.test', '', now(), now()),
  ('d4000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'birinci-veli@example.test', '', now(), now()),
  ('d5000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ikinci-veli@example.test', '', now(), now()),
  ('d6000000-0000-0000-0000-0000000000d6', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'diger-kurum-yoneticisi@example.test', '', now(), now()),
  ('0a000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'platform-operatoru@example.test', '', now(), now());

insert into public.platform_operators (user_id, role, status)
values ('0a000000-0000-0000-0000-00000000000a', 'owner', 'active');

insert into public.organizations (id, name, slug, code)
values
  ('2a000000-0000-0000-0000-00000000002a', 'Kurum A', 'kurum-a-v1206', 7501),
  ('2b000000-0000-0000-0000-00000000002b', 'Kurum B', 'kurum-b-v1206', 7502);

insert into public.branches (id, organization_id, name, is_default)
values
  ('2aa00000-0000-0000-0000-0000000002aa', '2a000000-0000-0000-0000-00000000002a', 'A Merkez', true),
  ('2bb00000-0000-0000-0000-0000000002bb', '2b000000-0000-0000-0000-00000000002b', 'B Merkez', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('b1100000-0000-0000-0000-0000000011b1', '2a000000-0000-0000-0000-00000000002a', null,
   'd1000000-0000-0000-0000-0000000000d1', 'admin', 'active', 1000),
  ('b2200000-0000-0000-0000-0000000022b2', '2a000000-0000-0000-0000-00000000002a', '2aa00000-0000-0000-0000-0000000002aa',
   'd2000000-0000-0000-0000-0000000000d2', 'teacher', 'active', 1001),
  ('b3300000-0000-0000-0000-0000000033b3', '2a000000-0000-0000-0000-00000000002a', '2aa00000-0000-0000-0000-0000000002aa',
   'd3000000-0000-0000-0000-0000000000d3', 'student', 'active', 1002),
  ('b4400000-0000-0000-0000-0000000044b4', '2a000000-0000-0000-0000-00000000002a', '2aa00000-0000-0000-0000-0000000002aa',
   'd4000000-0000-0000-0000-0000000000d4', 'parent', 'active', 1003),
  ('b5500000-0000-0000-0000-0000000055b5', '2a000000-0000-0000-0000-00000000002a', '2aa00000-0000-0000-0000-0000000002aa',
   'd5000000-0000-0000-0000-0000000000d5', 'parent', 'active', 1004),
  ('b6600000-0000-0000-0000-0000000066b6', '2b000000-0000-0000-0000-00000000002b', '2bb00000-0000-0000-0000-0000000002bb',
   'd6000000-0000-0000-0000-0000000000d6', 'admin', 'active', 1000);

insert into public.subjects (id, organization_id, name)
values ('6a000000-0000-0000-0000-00000000006a', '2a000000-0000-0000-0000-00000000002a', 'Matematik');

insert into public.classes (id, organization_id, branch_id, name, program)
values ('c9000000-0000-0000-0000-0000000000c9', '2a000000-0000-0000-0000-00000000002a',
        '2aa00000-0000-0000-0000-0000000002aa', 'YKS 12-A', 'YKS');

-- Öğretmen bu sınıfa ATANMIŞ; yani öğrenciyi okutuyor. Ödemeyi yine de
-- görmemeli — testin anlamı buradan geliyor.
insert into public.class_teachers (organization_id, class_id, membership_id, subject_id)
values ('2a000000-0000-0000-0000-00000000002a', 'c9000000-0000-0000-0000-0000000000c9',
        'b2200000-0000-0000-0000-0000000022b2', '6a000000-0000-0000-0000-00000000006a');

insert into public.students (id, organization_id, branch_id, auth_user_id, full_name)
values
  ('70000000-0000-0000-0000-000000000701', '2a000000-0000-0000-0000-00000000002a',
   '2aa00000-0000-0000-0000-0000000002aa', 'd3000000-0000-0000-0000-0000000000d3', 'Birinci Öğrenci'),
  ('70000000-0000-0000-0000-000000000702', '2a000000-0000-0000-0000-00000000002a',
   '2aa00000-0000-0000-0000-0000000002aa', null, 'İkinci Öğrenci'),
  ('70000000-0000-0000-0000-000000000709', '2b000000-0000-0000-0000-00000000002b',
   '2bb00000-0000-0000-0000-0000000002bb', null, 'Diğer Kurumun Öğrencisi');

insert into public.class_enrollments (organization_id, class_id, student_id)
values ('2a000000-0000-0000-0000-00000000002a', 'c9000000-0000-0000-0000-0000000000c9',
        '70000000-0000-0000-0000-000000000701');

insert into public.guardians (id, organization_id, auth_user_id, full_name)
values
  ('80000000-0000-0000-0000-000000000801', '2a000000-0000-0000-0000-00000000002a',
   'd4000000-0000-0000-0000-0000000000d4', 'Birinci Veli'),
  ('80000000-0000-0000-0000-000000000802', '2a000000-0000-0000-0000-00000000002a',
   'd5000000-0000-0000-0000-0000000000d5', 'İkinci Veli');

insert into public.student_guardians (organization_id, student_id, guardian_id)
values
  ('2a000000-0000-0000-0000-00000000002a', '70000000-0000-0000-0000-000000000701',
   '80000000-0000-0000-0000-000000000801'),
  ('2a000000-0000-0000-0000-00000000002a', '70000000-0000-0000-0000-000000000702',
   '80000000-0000-0000-0000-000000000802');

insert into public.payment_plans (id, organization_id, student_id, name, total_amount)
values
  ('90000000-0000-0000-0000-000000000901', '2a000000-0000-0000-0000-00000000002a',
   '70000000-0000-0000-0000-000000000701', '2026-2027 Eğitim Ücreti', 30000.00),
  ('90000000-0000-0000-0000-000000000902', '2a000000-0000-0000-0000-00000000002a',
   '70000000-0000-0000-0000-000000000702', '2026-2027 Eğitim Ücreti', 20000.00);

-- Birinci taksit vadesi GEÇMİŞ ve ödenmemiş: "gecikmiş" durumunun türetilebildiği
-- test bu satıra dayanıyor.
insert into public.installments (organization_id, plan_id, sequence_no, due_date, amount, paid_at)
values
  ('2a000000-0000-0000-0000-00000000002a', '90000000-0000-0000-0000-000000000901', 1,
   current_date - 30, 10000.00, null),
  ('2a000000-0000-0000-0000-00000000002a', '90000000-0000-0000-0000-000000000901', 2,
   current_date + 30, 10000.00, null),
  ('2a000000-0000-0000-0000-00000000002a', '90000000-0000-0000-0000-000000000901', 3,
   current_date + 60, 10000.00, null);

-- Veri düzeyi -------------------------------------------------------------------

select throws_ok(
  $sql$insert into public.payment_plans (organization_id, student_id, name, total_amount)
    values (
      '2a000000-0000-0000-0000-00000000002a',
      '70000000-0000-0000-0000-000000000709',
      'Sızdırılan Plan',
      1000.00
    )$sql$,
  '23503',
  null,
  'a payment plan cannot be opened for another organization student'
);

select throws_ok(
  $sql$insert into public.installments (organization_id, plan_id, sequence_no, due_date, amount)
    values (
      '2a000000-0000-0000-0000-00000000002a',
      '90000000-0000-0000-0000-000000000901',
      1,
      current_date,
      5000.00
    )$sql$,
  '23505',
  null,
  'a plan cannot hold two installments with the same sequence number'
);

select throws_ok(
  $sql$insert into public.installments (organization_id, plan_id, sequence_no, due_date, amount)
    values (
      '2a000000-0000-0000-0000-00000000002a',
      '90000000-0000-0000-0000-000000000901',
      9,
      current_date,
      0.00
    )$sql$,
  '23514',
  null,
  'an installment of zero is not a record — unlike an exam net, the amount has a floor'
);

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
    '2a000000-0000-0000-0000-00000000002a',
    '0a000000-0000-0000-0000-00000000000a'
  )::jsonb @> '[{"table": "payment_plans", "rows": 2}, {"table": "installments", "rows": 3}]'::jsonb,
  'the deletion guard counts payment plans and installments without being told about them'
);

-- Kurum yöneticisi ----------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-0000000000d1', true);

select is(
  (select count(*) from public.payment_plans),
  2::bigint,
  'an admin sees every payment plan in their organization'
);

select lives_ok(
  $sql$insert into public.payment_plans (organization_id, student_id, name, total_amount)
    values (
      '2a000000-0000-0000-0000-00000000002a',
      '70000000-0000-0000-0000-000000000701',
      'Yaz Kampı',
      5000.00
    )$sql$,
  'an admin can open a payment plan'
);

select lives_ok(
  $sql$update public.installments set paid_at = now()
      where plan_id = '90000000-0000-0000-0000-000000000901' and sequence_no = 1$sql$,
  'an admin records that an installment was paid'
);

select throws_ok(
  $sql$update public.payment_plans
      set student_id = '70000000-0000-0000-0000-000000000702'
      where id = '90000000-0000-0000-0000-000000000901'$sql$,
  '42501',
  null,
  'a plan cannot be moved to another student — that changes who owes the money'
);

select throws_ok(
  $sql$delete from public.payment_plans$sql$,
  '42501',
  null,
  'nobody deletes a payment plan through the API'
);

-- Öğretmen — öğrenciyi okutuyor ama ödemeyi görmüyor ------------------------------------

select set_config('request.jwt.claim.sub', 'd2000000-0000-0000-0000-0000000000d2', true);

select is(
  (select count(*) from public.students),
  1::bigint,
  'the teacher really does teach this student — the next two assertions are not vacuous'
);

select is(
  (select count(*) from public.payment_plans),
  0::bigint,
  'a teacher sees no payment plans, even for a student they teach'
);

select is(
  (select count(*) from public.installments),
  0::bigint,
  'a teacher sees no installments either'
);

-- Öğrenci — kendi planını görmüyor (2026-09-04 kararı) ------------------------------------

select set_config('request.jwt.claim.sub', 'd3000000-0000-0000-0000-0000000000d3', true);

select is(
  (select count(*) from public.students),
  1::bigint,
  'the student can read their own record — so the payment assertions below are not vacuous'
);

select is(
  (select count(*) from public.payment_plans),
  0::bigint,
  'a student does not see their own payment plan — the family debt is not on the child screen'
);

select is(
  (select count(*) from public.installments),
  0::bigint,
  'a student sees no installments'
);

-- Birinci veli -----------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'd4000000-0000-0000-0000-0000000000d4', true);

select is(
  (select count(*) from public.payment_plans),
  2::bigint,
  'a guardian sees the plans of their own child — both of them'
);

select is(
  (select count(*) from public.payment_plans
     where student_id = '70000000-0000-0000-0000-000000000702'),
  0::bigint,
  'a guardian sees nothing belonging to another family'
);

select is(
  (select count(*) from public.installments),
  3::bigint,
  'a guardian sees the installments of their child plan'
);

-- Durum SAKLANMIYOR, türetiliyor: bir sütuna bakmadan "gecikmiş" bulunabiliyor.
select is(
  (select count(*) from public.installments
     where paid_at is null and due_date < current_date),
  0::bigint,
  'the overdue installment disappears once the admin marks it paid — status is derived, never stored'
);

select throws_ok(
  $sql$insert into public.installments (organization_id, plan_id, sequence_no, due_date, amount)
    values (
      '2a000000-0000-0000-0000-00000000002a',
      '90000000-0000-0000-0000-000000000901',
      4,
      current_date,
      1000.00
    )$sql$,
  '42501',
  null,
  'a guardian cannot add an installment to their own plan'
);

-- K-13: bu engel `using` tarafından geldiği için UPDATE hata fırlatmaz,
-- sessizce sıfır satır günceller. Ölçülen şey hata kodu değil, sonucun kendisi.
update public.installments set paid_at = now()
where plan_id = '90000000-0000-0000-0000-000000000901' and sequence_no = 2;

select is(
  (select paid_at from public.installments
     where plan_id = '90000000-0000-0000-0000-000000000901' and sequence_no = 2),
  null::timestamptz,
  'a guardian cannot mark their own installment paid — the update silently changes nothing'
);

-- İkinci veli — izolasyon ---------------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'd5000000-0000-0000-0000-0000000000d5', true);

select is(
  (select student_id from public.payment_plans),
  '70000000-0000-0000-0000-000000000702'::uuid,
  'the second guardian sees their own child plan and nothing else'
);

-- Kilit ve anon ----------------------------------------------------------------------------------

reset role;
update public.profiles set must_change_password = true
where id = 'd1000000-0000-0000-0000-0000000000d1';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-0000000000d1', true);

select is(
  (select count(*) from public.payment_plans),
  0::bigint,
  'an admin who must change their password reads no payment plans'
);

reset role;
set local role anon;

select throws_ok(
  $sql$select * from public.payment_plans$sql$,
  '42501',
  null,
  'anon cannot read payment plans'
);

select throws_ok(
  $sql$select * from public.installments$sql$,
  '42501',
  null,
  'anon cannot read installments'
);

select * from finish();
rollback;
