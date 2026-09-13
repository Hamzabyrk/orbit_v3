-- v1.4-12 — Duyuruyu yazan düzenler; pano iz bırakır (#288).
--
-- Bu testin ölçtüğü asıl şey bir **daralma**: eski kural sınıfın her
-- öğretmenine o sınıftaki her duyuruyu düzenleme izni veriyordu. Dolayısıyla
-- iddiaların yarısı "hâlâ çalışıyor mu", yarısı "artık çalışmıyor mu".
--
-- Kurgu: bir sınıf, o sınıfı okutan **iki** öğretmen, bir yönetici.
--
-- ⚠️ Satırlar `id` ile değil `class_id` ile tutuluyor. Sebebi kuralın kendisi:
-- `daily_feed_posts` üzerinde `authenticated` için INSERT yetkisi yalnız
-- `title`, `body`, `class_id`, `organization_id` sütunlarını kapsıyor —
-- `id` yüke konursa yazma `42501` ile reddediliyor. (Bu testin ilk hâli tam
-- oraya düştü; kimliği veritabanı üretir.)

begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('f1000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'akis-yonetici@example.test', '', now(), now()),
  ('f2000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'akis-ogretmen-a@example.test', '', now(), now()),
  ('f3000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'akis-ogretmen-b@example.test', '', now(), now());

insert into public.organizations (id, name, slug, code)
values ('ff000000-0000-0000-0000-0000000000ff', 'Kurum Akis', 'kurum-akis-v1412', 7941);

insert into public.branches (id, organization_id, name, is_default)
values ('ff100000-0000-0000-0000-000000000011', 'ff000000-0000-0000-0000-0000000000ff', 'Akis Merkez', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('5a000000-0000-0000-0000-000000000001', 'ff000000-0000-0000-0000-0000000000ff', null,
   'f1000000-0000-0000-0000-0000000000f1', 'admin', 'active', 1900),
  ('5a000000-0000-0000-0000-000000000002', 'ff000000-0000-0000-0000-0000000000ff',
   'ff100000-0000-0000-0000-000000000011', 'f2000000-0000-0000-0000-0000000000f2',
   'teacher', 'active', 1901),
  ('5a000000-0000-0000-0000-000000000003', 'ff000000-0000-0000-0000-0000000000ff',
   'ff100000-0000-0000-0000-000000000011', 'f3000000-0000-0000-0000-0000000000f3',
   'teacher', 'active', 1902);

insert into public.classes (id, organization_id, branch_id, name)
values ('fc000000-0000-0000-0000-0000000000fc', 'ff000000-0000-0000-0000-0000000000ff',
        'ff100000-0000-0000-0000-000000000011', '11-C');

insert into public.subjects (id, organization_id, name)
values ('f5000000-0000-0000-0000-0000000000f5', 'ff000000-0000-0000-0000-0000000000ff', 'Edebiyat');

-- İKİ öğretmen de aynı sınıfı okutuyor. Eski kural altında ikisi de birbirinin
-- duyurusunu düzenleyebilirdi; testin çekirdeği bu.
insert into public.class_teachers (id, organization_id, class_id, membership_id, subject_id)
values
  ('f7000000-0000-0000-0000-000000000001', 'ff000000-0000-0000-0000-0000000000ff',
   'fc000000-0000-0000-0000-0000000000fc', '5a000000-0000-0000-0000-000000000002',
   'f5000000-0000-0000-0000-0000000000f5'),
  ('f7000000-0000-0000-0000-000000000002', 'ff000000-0000-0000-0000-0000000000ff',
   'fc000000-0000-0000-0000-0000000000fc', '5a000000-0000-0000-0000-000000000003',
   'f5000000-0000-0000-0000-0000000000f5');

-- =========================================================================
-- 1. Öğretmen A kendi sınıfına duyuru yazıyor; yazar sunucuda atanıyor
-- =========================================================================

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f2000000-0000-0000-0000-0000000000f2', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $sql$insert into public.daily_feed_posts (organization_id, class_id, title, body)
       values ('ff000000-0000-0000-0000-0000000000ff',
               'fc000000-0000-0000-0000-0000000000fc',
               'Yarın deneme var', 'Kalem getirin.')$sql$,
  'a teacher can post to a class they teach'
);

select is(
  (select author_membership_id from public.daily_feed_posts
   where class_id = 'fc000000-0000-0000-0000-0000000000fc'),
  '5a000000-0000-0000-0000-000000000002'::uuid,
  'the author is set by the server, not by the client'
);

-- Kurum geneli duyuru öğretmene kapalı: `class_id is null` her iki dalı da düşürür.
select throws_ok(
  $sql$insert into public.daily_feed_posts (organization_id, class_id, title)
       values ('ff000000-0000-0000-0000-0000000000ff', null, 'Kuruma duyuru')$sql$,
  '42501',
  null,
  'a teacher cannot post an organization-wide notice'
);

-- Kendi duyurusunu düzenleyebiliyor.
select lives_ok(
  $sql$update public.daily_feed_posts set title = 'Yarın deneme var (saat 10:00)'
       where class_id = 'fc000000-0000-0000-0000-0000000000fc'$sql$,
  'and can edit their own notice'
);

-- =========================================================================
-- 2. 🔴 DARALMA — aynı sınıfı okutan DİĞER öğretmen artık dokunamıyor
-- =========================================================================
--
-- Eski kural altında bu UPDATE geçerdi: öğretmen B de bu sınıfı okutuyor.
-- Yeni kural yazarlık soruyor.

select set_config('request.jwt.claim.sub', 'f3000000-0000-0000-0000-0000000000f3', true);

select is(
  (select count(*) from public.daily_feed_posts
   where class_id = 'fc000000-0000-0000-0000-0000000000fc'),
  1::bigint,
  'the other teacher of the same class can still READ the notice'
);

with denemesi as (
  update public.daily_feed_posts set title = 'Ele geçirildi'
  where class_id = 'fc000000-0000-0000-0000-0000000000fc'
  returning 1
)
select is(
  (select count(*) from denemesi),
  0::bigint,
  'but cannot edit it — RLS hides the row from the write, zero rows affected'
);

select is(
  (select title from public.daily_feed_posts
   where class_id = 'fc000000-0000-0000-0000-0000000000fc'),
  'Yarın deneme var (saat 10:00)',
  'and the title is unchanged'
);

with arsiv_denemesi as (
  update public.daily_feed_posts set archived_at = now()
  where class_id = 'fc000000-0000-0000-0000-0000000000fc'
  returning 1
)
select is(
  (select count(*) from arsiv_denemesi),
  0::bigint,
  'nor archive it'
);

-- =========================================================================
-- 3. Yönetici hepsine dokunabiliyor — daralma onu kapsamıyor
-- =========================================================================

select set_config('request.jwt.claim.sub', 'f1000000-0000-0000-0000-0000000000f1', true);

with yonetici_duzenlemesi as (
  update public.daily_feed_posts set title = 'Yarın deneme var (saat 11:00)'
  where class_id = 'fc000000-0000-0000-0000-0000000000fc'
  returning 1
)
select is(
  (select count(*) from yonetici_duzenlemesi),
  1::bigint,
  'an administrator can still edit a notice written by a teacher'
);

select lives_ok(
  $sql$insert into public.daily_feed_posts (organization_id, class_id, title)
       values ('ff000000-0000-0000-0000-0000000000ff', null, 'Kurum geneli duyuru')$sql$,
  'and can post an organization-wide notice'
);

-- =========================================================================
-- 4. Pano iz bırakıyor — ama metin defterde durmuyor
-- =========================================================================

reset role;

select is(
  (select metadata ->> 'title' from public.audit_events
   where entity_type = 'feed_post'
   order by id desc limit 1),
  'Kurum geneli duyuru',
  'the ledger records the title of every write'
);

-- 🔴 Bu iddia kuralın SINIRINI çiviliyor: `body` bilerek izlenmiyor, çünkü
-- `audit_events` kalıcı ve duyuru metni kişisel bilgi taşıyabilir. İzlenseydi
-- bu anahtar dolu olurdu.
select is(
  (select count(*) from public.audit_events
   where entity_type = 'feed_post'
     and metadata ? 'body'),
  0::bigint,
  'but the notice BODY never enters the ledger — deliberate, the ledger is permanent'
);

select * from finish();
rollback;
