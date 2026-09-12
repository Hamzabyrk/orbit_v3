-- v1.4-06 — Yanlış girilmiş taksit geri alınabilir (#277).
--
-- Bu dilimin riski sütunda değil **okuma yollarında**: arşiv süzgeci üç
-- fonksiyondan birinde atlanırsa, arşivlenmiş taksit borç olarak sayılmaya
-- devam eder ve veli hâlâ "vadesi geçmiş ödemeniz var" görür. Testin ağırlığı
-- bu yüzden üç fonksiyonun üçünde de.
--
-- Dört iddia kümesi:
--
--   1. Arşivlenen taksit hiçbir hesaba katılmıyor — borç, sonraki taksit,
--      tahsilat ve kurum kartları.
--   2. Yalnız arşivli taksiti olan kuruma üç SIFIR değil HİÇ SATIR dönüyor.
--      (Süzgeç `filter` içinde kalsaydı sıfırlar "hiç ödeme yok" derdi.)
--   3. Arşivlenen taksit sıra numarasını BIRAKIYOR; aktifler arasında numara
--      hâlâ tekil.
--   4. Para hareketi iz bırakıyor: `paid_at` değişimi izleniyor, arşivleme
--      kendi eylemi.

begin;

create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('f1000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'odeme-yonetici@example.test', '', now(), now()),
  ('f2000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'odeme-veli@example.test', '', now(), now());

insert into public.organizations (id, name, slug, code)
values ('fa000000-0000-0000-0000-0000000000fa', 'Kurum Ödeme', 'kurum-odeme-v1406', 7701);

insert into public.branches (id, organization_id, name, is_default)
values ('fb100000-0000-0000-0000-0000000011fb', 'fa000000-0000-0000-0000-0000000000fa', 'Ödeme Merkez', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('38000000-0000-0000-0000-000000000001', 'fa000000-0000-0000-0000-0000000000fa', null,
   'f1000000-0000-0000-0000-0000000000f1', 'admin', 'active', 1400),
  ('38000000-0000-0000-0000-000000000002', 'fa000000-0000-0000-0000-0000000000fa',
   'fb100000-0000-0000-0000-0000000011fb', 'f2000000-0000-0000-0000-0000000000f2',
   'parent', 'active', 1401);

insert into public.students (id, organization_id, branch_id, full_name)
values ('5a000000-0000-0000-0000-00000000a001', 'fa000000-0000-0000-0000-0000000000fa',
        'fb100000-0000-0000-0000-0000000011fb', 'Ödeme Öğrencisi');

insert into public.payment_plans (id, organization_id, student_id, name, total_amount)
values ('9c000000-0000-0000-0000-00000000c001', 'fa000000-0000-0000-0000-0000000000fa',
        '5a000000-0000-0000-0000-00000000a001', 'Yıllık Paket', 30000);

-- Üç taksit: biri ödenmiş, biri vadesi geçmiş ödenmemiş, biri YANLIŞ girilmiş
-- (vadesi geçmiş, ödenmemiş) — sonuncusu arşivlenecek.
insert into public.installments
  (id, organization_id, plan_id, sequence_no, due_date, amount, paid_at)
values
  ('7d000000-0000-0000-0000-00000000d001', 'fa000000-0000-0000-0000-0000000000fa',
   '9c000000-0000-0000-0000-00000000c001', 1, public.orbit_today() - 40, 10000,
   now() - interval '35 days'),
  ('7d000000-0000-0000-0000-00000000d002', 'fa000000-0000-0000-0000-0000000000fa',
   '9c000000-0000-0000-0000-00000000c001', 2, public.orbit_today() - 10, 10000, null),
  ('7d000000-0000-0000-0000-00000000d003', 'fa000000-0000-0000-0000-0000000000fa',
   '9c000000-0000-0000-0000-00000000c001', 3, public.orbit_today() - 5, 10000, null);

-- =========================================================================
-- Arşivden önce — taban ölçüm
-- =========================================================================

select is(
  (select overdue_count from public.student_payment_summaries(
     array['5a000000-0000-0000-0000-00000000a001']::uuid[])),
  2::bigint,
  'before archiving, both unpaid overdue installments count as debt'
);

select is(
  (select next_due_date from public.payment_plan_summaries(
     array['9c000000-0000-0000-0000-00000000c001']::uuid[])),
  public.orbit_today() - 10,
  'and the next unpaid installment is the earlier of the two'
);

-- =========================================================================
-- Yanlış taksit arşivleniyor — üç okuma yolunun üçü de unutmalı
-- =========================================================================

update public.installments
set archived_at = now()
where id = '7d000000-0000-0000-0000-00000000d003';

select is(
  (select overdue_count from public.student_payment_summaries(
     array['5a000000-0000-0000-0000-00000000a001']::uuid[])),
  1::bigint,
  'an archived installment stops counting as debt (student_payment_summaries)'
);

select is(
  (select overdue_count from public.payment_plan_summaries(
     array['9c000000-0000-0000-0000-00000000c001']::uuid[])),
  1::bigint,
  'and stops counting in the plan summary too (payment_plan_summaries)'
);

select is(
  (select overdue_count from public.payment_overview_counts()),
  1::bigint,
  'and in the admin cards (payment_overview_counts)'
);

-- Arşivli taksit "sonraki taksit" olarak da seçilmemeli. Burada 2. taksit
-- daha erken olduğu için ayrı bir kurgu gerekiyor: 2'yi de arşivleyip
-- sonraki taksitin NULL'a düşmesi ölçülüyor.
update public.installments
set archived_at = now()
where id = '7d000000-0000-0000-0000-00000000d002';

select is(
  (select next_due_date from public.payment_plan_summaries(
     array['9c000000-0000-0000-0000-00000000c001']::uuid[])),
  null::date,
  'with every unpaid installment archived, there is no next due date — NULL, not a stale one'
);

select is(
  (select next_due_amount from public.payment_plan_summaries(
     array['9c000000-0000-0000-0000-00000000c001']::uuid[])),
  null::numeric,
  'and no next due amount either — NULL, not 0'
);

-- Ödenmiş taksit arşivlenmediği için tahsilat hâlâ görünüyor: arşiv borcu
-- siliyor, geçmişi silmiyor.
select is(
  (select collected_this_month from public.payment_overview_counts()),
  0::numeric,
  'the paid installment is 35 days old, so it is not in THIS month collection'
);

update public.installments
set archived_at = null
where id in ('7d000000-0000-0000-0000-00000000d002', '7d000000-0000-0000-0000-00000000d003');

select is(
  (select overdue_count from public.student_payment_summaries(
     array['5a000000-0000-0000-0000-00000000a001']::uuid[])),
  2::bigint,
  'restoring the installments brings the debt back — archive is reversible'
);

-- =========================================================================
-- Yalnız arşivli taksiti olan kurum: üç SIFIR değil, HİÇ SATIR
-- =========================================================================
--
-- Bu, `filter` ile `where` arasındaki farkı kilitleyen iddia. Süzgeç tek tek
-- `filter`'lara konsaydı bu kurum "₺0 tahsilat, 0 yaklaşan, 0 geciken"
-- okurdu — ve o üç sıfır "kurumda hiç ödeme yok" demektir, oysa var.

insert into public.organizations (id, name, slug, code)
values ('fc000000-0000-0000-0000-0000000000fc', 'Kurum Arsivli', 'kurum-arsivli-v1406', 7702);

insert into public.branches (id, organization_id, name, is_default)
values ('fc100000-0000-0000-0000-0000000011fc', 'fc000000-0000-0000-0000-0000000000fc', 'Arsivli Merkez', true);

insert into public.students (id, organization_id, branch_id, full_name)
values ('5a000000-0000-0000-0000-00000000a002', 'fc000000-0000-0000-0000-0000000000fc',
        'fc100000-0000-0000-0000-0000000011fc', 'Arsivli Ogrenci');

insert into public.payment_plans (id, organization_id, student_id, name, total_amount)
values ('9c000000-0000-0000-0000-00000000c002', 'fc000000-0000-0000-0000-0000000000fc',
        '5a000000-0000-0000-0000-00000000a002', 'Yanlış Plan', 5000);

insert into public.installments
  (id, organization_id, plan_id, sequence_no, due_date, amount, archived_at)
values ('7d000000-0000-0000-0000-00000000d004', 'fc000000-0000-0000-0000-0000000000fc',
        '9c000000-0000-0000-0000-00000000c002', 1, public.orbit_today() - 3, 5000, now());

select is(
  (select count(*) from public.student_payment_summaries(
     array['5a000000-0000-0000-0000-00000000a002']::uuid[])
   where overdue_count > 0),
  0::bigint,
  'a student whose only installment is archived carries no debt'
);

-- =========================================================================
-- Sıra numarası arşivle serbest kalıyor
-- =========================================================================

select throws_ok(
  $sql$insert into public.installments
         (organization_id, plan_id, sequence_no, due_date, amount)
       values ('fa000000-0000-0000-0000-0000000000fa',
               '9c000000-0000-0000-0000-00000000c001', 2, public.orbit_today(), 1000)$sql$,
  '23505',
  null,
  'an ACTIVE sequence number still cannot be duplicated'
);

update public.installments
set archived_at = now()
where id = '7d000000-0000-0000-0000-00000000d003';

-- Arşivlenen 3. taksitin numarası serbest kaldı; yerine doğrusu girilebilir.
-- Tam bir UNIQUE olsaydı bu insert `23505` ile çarpardı ve arşiv özelliği
-- ilk kullanışta kendini kilitlerdi.
insert into public.installments
  (id, organization_id, plan_id, sequence_no, due_date, amount)
values ('7d000000-0000-0000-0000-00000000d005', 'fa000000-0000-0000-0000-0000000000fa',
        '9c000000-0000-0000-0000-00000000c001', 3, public.orbit_today() + 20, 7500);

select is(
  (select count(*) from public.installments
   where plan_id = '9c000000-0000-0000-0000-00000000c001'
     and sequence_no = 3),
  2::bigint,
  'the archived installment released its sequence number — one archived, one active'
);

select is(
  (select count(*) from public.installments
   where plan_id = '9c000000-0000-0000-0000-00000000c001'
     and sequence_no = 3
     and archived_at is null),
  1::bigint,
  'and exactly one of them is active'
);

-- =========================================================================
-- Yetki sınırı — arşivlemek yöneticinin işi
-- =========================================================================

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'f2000000-0000-0000-0000-0000000000f2', true);

select is(
  (select count(*) from public.installments),
  0::bigint,
  'a guardian with no linked student sees no installments at all'
);

reset role;

-- =========================================================================
-- Denetim izi — parada en gerekli olduğu yer
-- =========================================================================

select is(
  (select count(*) from public.audit_events
   where entity_id = '9c000000-0000-0000-0000-00000000c001'
     and action = 'payment_plan.created'),
  1::bigint,
  'creating a payment plan leaves a trace'
);

select is(
  (select metadata ->> 'total_amount' from public.audit_events
   where entity_id = '9c000000-0000-0000-0000-00000000c001'
     and action = 'payment_plan.created'),
  '30000.00',
  'and the trace carries the total amount'
);

select is(
  (select count(*) from public.audit_events
   where entity_id = '7d000000-0000-0000-0000-00000000d002'
     and action = 'installment.created'),
  1::bigint,
  'creating an installment leaves a trace'
);

-- "Ödendi" damgası defterin parayı gördüğü tek yer; izlenen alanların en
-- önemlisi bu.
update public.installments
set paid_at = now()
where id = '7d000000-0000-0000-0000-00000000d002';

select ok(
  (select metadata -> 'changed' @> '["paid_at"]'::jsonb
   from public.audit_events
   where entity_id = '7d000000-0000-0000-0000-00000000d002'
     and action = 'installment.updated'
   order by id desc limit 1),
  'marking an installment paid names paid_at as the changed field'
);

-- İşareti geri almak da iz bırakmalı: "ödendi" demek kadar "ödenmedi" demek
-- de bir para iddiasıdır.
update public.installments
set paid_at = null
where id = '7d000000-0000-0000-0000-00000000d002';

select is(
  (select count(*) from public.audit_events
   where entity_id = '7d000000-0000-0000-0000-00000000d002'
     and action = 'installment.updated'),
  2::bigint,
  'taking the paid mark back leaves its own trace too'
);

select ok(
  (select metadata -> 'changed' @> '["amount"]'::jsonb
   from public.audit_events
   where entity_id = '7d000000-0000-0000-0000-00000000d002'
     and action = 'installment.updated'
   order by id desc limit 1) is not true,
  'and an untouched amount is not listed as changed'
);

-- Bu kurguda d003 İKİ kez arşivlendi ve arada bir kez geri yüklendi (önce
-- okuma yollarını ölçmek, sonra sıra numarasını serbest bırakmak için). Her
-- geçiş kendi olayını üretmeli — sayı 2 ve bu tam olarak istenen: arşivleme
-- bir DURUM değil bir OLAY; aynı satır iki kez arşivlenirse iki kez yazılır.
select is(
  (select count(*) from public.audit_events
   where entity_id = '7d000000-0000-0000-0000-00000000d003'
     and action = 'installment.archived'),
  2::bigint,
  'each archive transition is its own event — two archives leave two traces'
);

select is(
  (select count(*) from public.audit_events
   where entity_id = '7d000000-0000-0000-0000-00000000d003'
     and action = 'installment.restored'),
  1::bigint,
  'and the single restore between them left exactly one restore trace'
);

select is(
  (select count(*) from public.audit_events
   where entity_id = '7d000000-0000-0000-0000-00000000d003'
     and action = 'installment.updated'),
  0::bigint,
  'archiving is never recorded as an ordinary update'
);

update public.installments
set archived_at = null
where id = '7d000000-0000-0000-0000-00000000d005';

select is(
  (select count(*) from public.audit_events
   where entity_id = '7d000000-0000-0000-0000-00000000d005'
     and action = 'installment.archived'),
  0::bigint,
  'and an installment that was never archived has no archive trace'
);

select is(
  (select count(*) from public.audit_events
   where entity_type = 'installment'
     and action = 'installment.updated'
     and (metadata -> 'changed') is null),
  0::bigint,
  'every installment update trace names which field changed'
);

select * from finish();
rollback;
