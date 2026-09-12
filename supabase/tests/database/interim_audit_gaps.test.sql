-- v1.4 ara denetimi — erişim veren atama iz bırakır, operatör sayıları tamam.
--
-- Bu dosya bir diliму değil bir **denetim turuna** ait (2026-09-13) ve üç
-- boşluğu kilitliyor:
--
--   1. `class_teachers` bir **erişim kapısıdır** — `current_user_teaches_class`
--      ona bakıyor. Satır eklemek yetki vermektir ve iz bırakmalıydı.
--   2. `schedule_entries` yayın yapıyordu ama iz bırakmıyordu.
--   3. `platform_organization_stats`'ın dört anahtarı korunarak ikisi eklendi.
--      Asıl risk burada: `create or replace` eski gövdeyi tamamen değiştirir ve
--      düşen bir anahtarı **derleyici değil yalnız ekran** yakalar.

begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('d1000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'denetim-yonetici@example.test', '', now(), now()),
  ('d2000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'denetim-ogretmen@example.test', '', now(), now()),
  ('d3000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'denetim-operator@example.test', '', now(), now());

insert into public.organizations (id, name, slug, code)
values ('dd000000-0000-0000-0000-0000000000dd', 'Kurum Denetim', 'kurum-denetim-ara', 8101);

insert into public.branches (id, organization_id, name, is_default)
values ('dd100000-0000-0000-0000-0000000011dd', 'dd000000-0000-0000-0000-0000000000dd',
        'Denetim Merkez', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('3c000000-0000-0000-0000-000000000001', 'dd000000-0000-0000-0000-0000000000dd', null,
   'd1000000-0000-0000-0000-0000000000d1', 'admin', 'active', 1800),
  ('3c000000-0000-0000-0000-000000000002', 'dd000000-0000-0000-0000-0000000000dd',
   'dd100000-0000-0000-0000-0000000011dd', 'd2000000-0000-0000-0000-0000000000d2',
   'teacher', 'active', 1801);

insert into public.subjects (id, organization_id, name)
values ('d9000000-0000-0000-0000-000000000009', 'dd000000-0000-0000-0000-0000000000dd', 'Kimya');

insert into public.classes (id, organization_id, branch_id, name)
values ('db000000-0000-0000-0000-0000000000b1', 'dd000000-0000-0000-0000-0000000000dd',
        'dd100000-0000-0000-0000-0000000011dd', 'Denetim Sinifi');

insert into public.students (id, organization_id, branch_id, full_name)
values
  ('5d000000-0000-0000-0000-00000000d001', 'dd000000-0000-0000-0000-0000000000dd',
   'dd100000-0000-0000-0000-0000000011dd', 'Sayilan Ogrenci'),
  ('5d000000-0000-0000-0000-00000000d002', 'dd000000-0000-0000-0000-0000000000dd',
   'dd100000-0000-0000-0000-0000000011dd', 'Arsivli Ogrenci');

update public.students
set archived_at = now()
where id = '5d000000-0000-0000-0000-00000000d002';

insert into public.guardians (id, organization_id, full_name)
values ('9e000000-0000-0000-0000-00000000e001', 'dd000000-0000-0000-0000-0000000000dd',
        'Sayilan Veli');

-- =========================================================================
-- 1. Öğretmeni sınıfa atamak iz bırakıyor
-- =========================================================================

insert into public.class_teachers (id, organization_id, class_id, membership_id, subject_id)
values ('7e000000-0000-0000-0000-00000000e001', 'dd000000-0000-0000-0000-0000000000dd',
        'db000000-0000-0000-0000-0000000000b1', '3c000000-0000-0000-0000-000000000002',
        'd9000000-0000-0000-0000-000000000009');

select is(
  (select count(*) from public.audit_events
   where entity_id = '7e000000-0000-0000-0000-00000000e001'
     and action = 'class_teacher.created'),
  1::bigint,
  'assigning a teacher to a class leaves a trace — it is a write that GRANTS access'
);

select is(
  (select metadata ->> 'membership_id' from public.audit_events
   where entity_id = '7e000000-0000-0000-0000-00000000e001'
     and action = 'class_teacher.created'),
  '3c000000-0000-0000-0000-000000000002',
  'and the trace says WHO gained access'
);

select is(
  (select metadata ->> 'class_id' from public.audit_events
   where entity_id = '7e000000-0000-0000-0000-00000000e001'
     and action = 'class_teacher.created'),
  'db000000-0000-0000-0000-0000000000b1',
  'and to which class'
);

-- Erişimin gerçekten açıldığı ayrıca ölçülüyor (K-13: mekanizma değil sonuç).
-- İz "yetki verildi" diyorsa, yetkinin verilmiş olması da doğrulanmalı.
select ok(
  public.current_user_teaches_class('db000000-0000-0000-0000-0000000000b1') is not null,
  'the scope helper that this table feeds is callable'
);

-- Atamanın kaldırılması da kendi eylemi.
update public.class_teachers
set archived_at = now()
where id = '7e000000-0000-0000-0000-00000000e001';

select is(
  (select count(*) from public.audit_events
   where entity_id = '7e000000-0000-0000-0000-00000000e001'
     and action = 'class_teacher.archived'),
  1::bigint,
  'and removing the assignment — the moment access ends — is its own action'
);

select is(
  (select count(*) from realtime.messages
   where topic = 'org:dd000000-0000-0000-0000-0000000000dd'
     and payload ->> 'table' = 'class_teachers'),
  2::bigint,
  'both the assignment and its removal broadcast to the organization channel'
);

-- =========================================================================
-- 2. Program satırı iz bırakıyor
-- =========================================================================

insert into public.schedule_entries
  (id, organization_id, class_id, subject_id, membership_id, day_of_week, starts_at)
values ('7f000000-0000-0000-0000-00000000f001', 'dd000000-0000-0000-0000-0000000000dd',
        'db000000-0000-0000-0000-0000000000b1', 'd9000000-0000-0000-0000-000000000009',
        '3c000000-0000-0000-0000-000000000002', 1, '09:00');

select is(
  (select count(*) from public.audit_events
   where entity_id = '7f000000-0000-0000-0000-00000000f001'
     and action = 'schedule_entry.created'),
  1::bigint,
  'adding a schedule row leaves a trace — it counts as a standing assignment (ORB03)'
);

select is(
  (select metadata ->> 'day_of_week' from public.audit_events
   where entity_id = '7f000000-0000-0000-0000-00000000f001'
     and action = 'schedule_entry.created'),
  '1',
  'and the trace carries the day'
);

update public.schedule_entries
set starts_at = '10:30'
where id = '7f000000-0000-0000-0000-00000000f001';

select ok(
  (select metadata -> 'changed' @> '["starts_at"]'::jsonb
   from public.audit_events
   where entity_id = '7f000000-0000-0000-0000-00000000f001'
     and action = 'schedule_entry.updated'
   order by id desc limit 1),
  'moving a lesson names starts_at as the changed field'
);

-- =========================================================================
-- 3. Operatör özeti — DÖRT eski anahtar korundu, İKİ yeni anahtar eklendi
-- =========================================================================
--
-- Bu kümenin asıl işi eski anahtarları korumak. `create or replace` gövdeyi
-- tamamen değiştiriyor; düşen bir anahtarı ne derleyici ne pgTAP'ın geri kalanı
-- yakalar — yalnız platform paneli, çalışma anında, boş bir kart olarak.

insert into public.platform_operators (user_id)
values ('d3000000-0000-0000-0000-0000000000d3');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'd3000000-0000-0000-0000-0000000000d3', true);

select is(
  (public.platform_organization_stats('dd000000-0000-0000-0000-0000000000dd') ->> 'member_count'),
  '2',
  'member_count survived the rewrite'
);

select is(
  (public.platform_organization_stats('dd000000-0000-0000-0000-0000000000dd') ->> 'admin_count'),
  '1',
  'admin_count survived the rewrite'
);

select is(
  (public.platform_organization_stats('dd000000-0000-0000-0000-0000000000dd') ->> 'branch_count'),
  '1',
  'branch_count survived the rewrite'
);

select ok(
  (public.platform_organization_stats('dd000000-0000-0000-0000-0000000000dd') ? 'audit_event_count'),
  'audit_event_count survived the rewrite'
);

-- Ve eklenen ikisi. Arşivli öğrenci SAYILMIYOR: operatörün sorusu "bu kurumda
-- kaç öğrenci var" ve arşivlenmiş kayıt onun cevabı değil.
select is(
  (public.platform_organization_stats('dd000000-0000-0000-0000-0000000000dd') ->> 'student_count'),
  '1',
  'student_count counts only the active student — the archived one is not an answer'
);

select is(
  (public.platform_organization_stats('dd000000-0000-0000-0000-0000000000dd') ->> 'guardian_count'),
  '1',
  'guardian_count is there too — the v1.4-01 checkpoint is finally met'
);

-- Operatör olmayan hâlâ hiçbir şey görmüyor.
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-0000000000d1', true);

select is(
  public.platform_organization_stats('dd000000-0000-0000-0000-0000000000dd'),
  null::jsonb,
  'a non-operator still gets NULL — the rewrite did not loosen the gate'
);

reset role;

select * from finish();
rollback;
