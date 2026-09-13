-- v1.4-13 — Kişisel kayıt kişisel kalır (#290).
--
-- 🔴 **Bu dosya bir davranışı değil, bir YOKLUĞU çiviliyor.**
--
-- v1.4-05'ten bu yana altı tabloya üst üste denetim ve yayın tetikleyicisi
-- eklendi (`homework_assignments`, `guardians`, `student_guardians`,
-- `installments`, `branches`, `class_teachers`, `schedule_entries`,
-- `subjects`, `daily_feed_posts`). Bu bir alışkanlık hâline geldi ve
-- alışkanlık tam olarak burada **yanlış** olur.
--
-- `tasks` ve `calendar_events` kesin kişisel: altı politikanın altısı da
-- `current_user_owns_membership(owner_membership_id)`. Kurum yöneticisi bile
-- başkasının görevini okuyamıyor.
--
--   **Denetim** (karar, 2026-09-13, Arda Bülent): `audit_events` kurum
--   yöneticisine açık. Bu tablolara denetim tetikleyicisi koymak, RLS'in
--   bilerek sakladığı şeyi deftere taşımak olurdu.
--
--   **Yayın** (denetleyen ölçümü): kanal `org:<kurum>` ve kurumun **her**
--   üyesi abone. Kişisel bir görevin değişimini oraya yazmak, herkese
--   "birinin görevi değişti" demek olurdu.
--
-- Sunucu yarısının çıktısı bu yüzden bir migration değil bu test. Bir gün biri
-- alışkanlıkla tetikleyici eklerse kırmızıya döner ve kararı hatırlatır.
--
-- İkinci yarısı kararın **dayanağını** ölçüyor: yönetici gerçekten okuyamıyor
-- mu? Dayanak çürürse karar da çürür.

begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('a1000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'plan-yonetici@example.test', '', now(), now()),
  ('a2000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'plan-ogretmen@example.test', '', now(), now());

insert into public.organizations (id, name, slug, code)
values ('aa000000-0000-0000-0000-0000000000aa', 'Kurum Plan', 'kurum-plan-v1413', 7951);

insert into public.branches (id, organization_id, name, is_default)
values ('aa100000-0000-0000-0000-000000000011', 'aa000000-0000-0000-0000-0000000000aa', 'Plan Merkez', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('6a000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-0000000000aa', null,
   'a1000000-0000-0000-0000-0000000000a1', 'admin', 'active', 2000),
  ('6a000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-0000000000aa',
   'aa100000-0000-0000-0000-000000000011', 'a2000000-0000-0000-0000-0000000000a2',
   'teacher', 'active', 2001);

-- =========================================================================
-- 1. Yokluğun kendisi — alışkanlıkla eklenmiş tetikleyici yok
-- =========================================================================

select is(
  (select count(*) from pg_trigger as tg
   join pg_class as rel on rel.oid = tg.tgrelid
   join pg_namespace as ns on ns.oid = rel.relnamespace
   where ns.nspname = 'public' and rel.relname = 'tasks'
     and not tg.tgisinternal and tg.tgname like '%audit%'),
  0::bigint,
  'tasks has NO audit trigger — deliberate: the ledger is admin-readable, these rows are not'
);

select is(
  (select count(*) from pg_trigger as tg
   join pg_class as rel on rel.oid = tg.tgrelid
   join pg_namespace as ns on ns.oid = rel.relnamespace
   where ns.nspname = 'public' and rel.relname = 'tasks'
     and not tg.tgisinternal and tg.tgname like '%broadcast%'),
  0::bigint,
  'and NO broadcast trigger — the channel is org-wide and every member subscribes'
);

select is(
  (select count(*) from pg_trigger as tg
   join pg_class as rel on rel.oid = tg.tgrelid
   join pg_namespace as ns on ns.oid = rel.relnamespace
   where ns.nspname = 'public' and rel.relname = 'calendar_events'
     and not tg.tgisinternal and tg.tgname like '%audit%'),
  0::bigint,
  'calendar_events has NO audit trigger either'
);

select is(
  (select count(*) from pg_trigger as tg
   join pg_class as rel on rel.oid = tg.tgrelid
   join pg_namespace as ns on ns.oid = rel.relnamespace
   where ns.nspname = 'public' and rel.relname = 'calendar_events'
     and not tg.tgisinternal and tg.tgname like '%broadcast%'),
  0::bigint,
  'nor a broadcast trigger'
);

-- Ama `set_updated_at` DURUYOR: yokluk seçici, toptan değil.
select is(
  (select count(*) from pg_trigger as tg
   join pg_class as rel on rel.oid = tg.tgrelid
   join pg_namespace as ns on ns.oid = rel.relnamespace
   where ns.nspname = 'public' and rel.relname in ('tasks', 'calendar_events')
     and not tg.tgisinternal and tg.tgname like '%updated_at%'),
  2::bigint,
  'but set_updated_at remains on both — the absence is selective, not blanket'
);

-- =========================================================================
-- 2. Kararın dayanağı — yönetici gerçekten okuyamıyor
-- =========================================================================

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2000000-0000-0000-0000-0000000000a2', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $sql$insert into public.tasks (organization_id, owner_membership_id, title, detail)
       values ('aa000000-0000-0000-0000-0000000000aa',
               '6a000000-0000-0000-0000-000000000002',
               'Veli görüşmesi notlarını yaz', 'Ayşe''nin ailesiyle')$sql$,
  'a teacher can create a task owned by themselves'
);

-- 🔴 Başkası adına görev açılamıyor: INSERT politikası sahipliği şart koşuyor.
select throws_ok(
  $sql$insert into public.tasks (organization_id, owner_membership_id, title)
       values ('aa000000-0000-0000-0000-0000000000aa',
               '6a000000-0000-0000-0000-000000000001',
               'Müdüre görev')$sql$,
  '42501',
  null,
  'but canNOT create one owned by someone else — no task assignment exists in this schema'
);

select is(
  (select count(*) from public.tasks),
  1::bigint,
  'the teacher sees their own task'
);

-- 🔴 KARARIN DAYANAĞI: yönetici bu görevi göremiyor.
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-0000000000a1', true);

select is(
  (select count(*) from public.tasks),
  0::bigint,
  'an ADMINISTRATOR of the same organization sees nothing — this is what the no-audit decision rests on'
);

select is(
  (select count(*) from public.calendar_events),
  0::bigint,
  'the same holds for calendar events'
);

-- Ve defterde de bir şey yok: tetikleyici olmadığı için yazılmadı.
reset role;

select is(
  (select count(*) from public.audit_events
   where entity_type in ('task', 'calendar_event')),
  0::bigint,
  'and the ledger carries nothing about them — because nothing wrote there'
);

select * from finish();
rollback;
