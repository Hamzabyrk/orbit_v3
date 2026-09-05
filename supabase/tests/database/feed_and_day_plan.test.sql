-- v1.2-09 — Günlük Akış ve Gün Planı sınırları.
--
-- Bu dosyanın en ayırt edici testi, **kurum yöneticisinin göremediği** ilk
-- tabloları ölçenidir. Yönetici bugüne kadar her tabloda en geniş kapsama
-- sahipti; kişisel çalışma alanında değil. Test boş çıkmasın diye önce
-- yöneticinin kapsamının gerçekten var olduğu ölçülüyor (duyuruları görüyor),
-- sonra kişisel kayıtlarda sıfır satır gördüğü.
--
-- İkinci grup, iki modelin **karışmadığını** ölçüyor: duyuru hedefine göre
-- yayılıyor, kişisel kayıt hiçbir yere yayılmıyor.

begin;

create extension if not exists pgtap with schema extensions;
select plan(27);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('a1100000-0000-0000-0000-00000000a110', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'kurum-yoneticisi@example.test', '', now(), now()),
  ('a2200000-0000-0000-0000-00000000a220', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'birinci-ogretmen@example.test', '', now(), now()),
  ('a3300000-0000-0000-0000-00000000a330', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ikinci-ogretmen@example.test', '', now(), now()),
  ('a4400000-0000-0000-0000-00000000a440', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogrenci@example.test', '', now(), now()),
  ('a5500000-0000-0000-0000-00000000a550', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'veli@example.test', '', now(), now()),
  ('07000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'platform-operatoru@example.test', '', now(), now());

insert into public.platform_operators (user_id, role, status)
values ('07000000-0000-0000-0000-000000000007', 'owner', 'active');

insert into public.organizations (id, name, slug, code)
values ('5a000000-0000-0000-0000-00000000005a', 'Kurum A', 'kurum-a-v1209', 7801);

insert into public.branches (id, organization_id, name, is_default)
values ('5aa00000-0000-0000-0000-0000000005aa', '5a000000-0000-0000-0000-00000000005a', 'A Merkez', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('11000000-0000-0000-0000-000000000011', '5a000000-0000-0000-0000-00000000005a', null,
   'a1100000-0000-0000-0000-00000000a110', 'admin', 'active', 1000),
  ('22000000-0000-0000-0000-000000000022', '5a000000-0000-0000-0000-00000000005a', '5aa00000-0000-0000-0000-0000000005aa',
   'a2200000-0000-0000-0000-00000000a220', 'teacher', 'active', 1001),
  ('33000000-0000-0000-0000-000000000033', '5a000000-0000-0000-0000-00000000005a', '5aa00000-0000-0000-0000-0000000005aa',
   'a3300000-0000-0000-0000-00000000a330', 'teacher', 'active', 1002),
  ('44000000-0000-0000-0000-000000000044', '5a000000-0000-0000-0000-00000000005a', '5aa00000-0000-0000-0000-0000000005aa',
   'a4400000-0000-0000-0000-00000000a440', 'student', 'active', 1003),
  ('55000000-0000-0000-0000-000000000055', '5a000000-0000-0000-0000-00000000005a', '5aa00000-0000-0000-0000-0000000005aa',
   'a5500000-0000-0000-0000-00000000a550', 'parent', 'active', 1004);

insert into public.subjects (id, organization_id, name)
values ('9a000000-0000-0000-0000-00000000009a', '5a000000-0000-0000-0000-00000000005a', 'Matematik');

insert into public.classes (id, organization_id, branch_id, name, program)
values
  ('e1000000-0000-0000-0000-0000000000f1', '5a000000-0000-0000-0000-00000000005a',
   '5aa00000-0000-0000-0000-0000000005aa', 'YKS 12-A', 'YKS'),
  ('e2000000-0000-0000-0000-0000000000f2', '5a000000-0000-0000-0000-00000000005a',
   '5aa00000-0000-0000-0000-0000000005aa', 'YKS 12-B', 'YKS');

insert into public.class_teachers (organization_id, class_id, membership_id, subject_id)
values ('5a000000-0000-0000-0000-00000000005a', 'e1000000-0000-0000-0000-0000000000f1',
        '22000000-0000-0000-0000-000000000022', '9a000000-0000-0000-0000-00000000009a');

insert into public.students (id, organization_id, branch_id, auth_user_id, full_name)
values ('66000000-0000-0000-0000-000000000066', '5a000000-0000-0000-0000-00000000005a',
        '5aa00000-0000-0000-0000-0000000005aa', 'a4400000-0000-0000-0000-00000000a440', 'Birinci Öğrenci');

insert into public.guardians (id, organization_id, auth_user_id, full_name)
values ('77000000-0000-0000-0000-000000000077', '5a000000-0000-0000-0000-00000000005a',
        'a5500000-0000-0000-0000-00000000a550', 'Birinci Veli');

insert into public.student_guardians (organization_id, student_id, guardian_id)
values ('5a000000-0000-0000-0000-00000000005a', '66000000-0000-0000-0000-000000000066',
        '77000000-0000-0000-0000-000000000077');

insert into public.class_enrollments (organization_id, class_id, student_id)
values ('5a000000-0000-0000-0000-00000000005a', 'e1000000-0000-0000-0000-0000000000f1',
        '66000000-0000-0000-0000-000000000066');

-- Bir kurum geneli, bir de 12-A hedefli duyuru.
insert into public.daily_feed_posts (id, organization_id, class_id, title, body)
values
  ('d1000000-0000-0000-0000-0000000000a1', '5a000000-0000-0000-0000-00000000005a',
   null, 'Kurum Geneli Duyuru', 'Yarın kurum kapalıdır.'),
  ('d2000000-0000-0000-0000-0000000000a2', '5a000000-0000-0000-0000-00000000005a',
   'e1000000-0000-0000-0000-0000000000f1', '12-A Duyurusu', 'Deneme sınavı Cumartesi.'),
  ('d3000000-0000-0000-0000-0000000000a3', '5a000000-0000-0000-0000-00000000005a',
   'e2000000-0000-0000-0000-0000000000f2', '12-B Duyurusu', 'Sadece 12-B için.');

-- İki öğretmenin kişisel kayıtları.
insert into public.tasks (id, organization_id, owner_membership_id, title, due_on)
values
  ('11100000-0000-0000-0000-000000000111', '5a000000-0000-0000-0000-00000000005a',
   '22000000-0000-0000-0000-000000000022', 'Veli görüşmesine hazırlan', current_date + 1),
  ('22200000-0000-0000-0000-000000000222', '5a000000-0000-0000-0000-00000000005a',
   '33000000-0000-0000-0000-000000000033', 'Sınav sorusu yaz', current_date + 2);

insert into public.calendar_events
  (id, organization_id, owner_membership_id, title, starts_at, ends_at)
values
  ('33300000-0000-0000-0000-000000000333', '5a000000-0000-0000-0000-00000000005a',
   '22000000-0000-0000-0000-000000000022', 'Zümre toplantısı',
   now() + interval '1 day', now() + interval '1 day 1 hour');

-- Veri düzeyi --------------------------------------------------------------------

select throws_ok(
  $sql$insert into public.calendar_events
      (organization_id, owner_membership_id, title, starts_at, ends_at)
    values ('5a000000-0000-0000-0000-00000000005a', '22000000-0000-0000-0000-000000000022',
            'Ters Saat', now() + interval '2 hours', now() + interval '1 hour')$sql$,
  '23514',
  null,
  'a calendar event cannot end before it starts'
);

select throws_ok(
  $sql$insert into public.tasks (organization_id, owner_membership_id, title)
    values ('5a000000-0000-0000-0000-00000000005a', null, 'Sahipsiz Görev')$sql$,
  '23502',
  null,
  'a personal task without an owner is not a record'
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
    '5a000000-0000-0000-0000-00000000005a',
    '07000000-0000-0000-0000-000000000007'
  )::jsonb @> '[{"table": "daily_feed_posts", "rows": 3},
                {"table": "tasks", "rows": 2},
                {"table": "calendar_events", "rows": 1}]'::jsonb,
  'the deletion guard counts all three new tables — personal records included'
);

-- Kurum yöneticisi: duyuruları görür, kişisel kayıtları GÖRMEZ -----------------------

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'a1100000-0000-0000-0000-00000000a110', true);

select is(
  (select count(*) from public.daily_feed_posts),
  3::bigint,
  'an admin sees every announcement — so the next two assertions are not vacuous'
);

select is(
  (select count(*) from public.tasks),
  0::bigint,
  'an admin cannot see anyone personal tasks — not even in their own organization'
);

select is(
  (select count(*) from public.calendar_events),
  0::bigint,
  'an admin cannot see anyone personal calendar either'
);

select lives_ok(
  $sql$insert into public.daily_feed_posts (organization_id, title, body)
    values ('5a000000-0000-0000-0000-00000000005a', 'İkinci Kurum Duyurusu', 'Metin')$sql$,
  'an admin can publish an organization-wide announcement'
);

select is(
  (select author_membership_id from public.daily_feed_posts
     where title = 'İkinci Kurum Duyurusu'),
  '11000000-0000-0000-0000-000000000011'::uuid,
  'the author is filled from the caller identity, not from what the client sent'
);

select throws_ok(
  $sql$delete from public.daily_feed_posts$sql$,
  '42501',
  null,
  'nobody deletes an announcement through the API'
);

-- Birinci öğretmen: 12-A'yı okutuyor, kendi kişisel kayıtları var ---------------------

select set_config('request.jwt.claim.sub', 'a2200000-0000-0000-0000-00000000a220', true);

select is(
  (select count(*) from public.daily_feed_posts),
  3::bigint,
  'a teacher sees organization-wide announcements plus their own class one, but not another class'
);

select is(
  (select count(*) from public.daily_feed_posts
     where class_id = 'e2000000-0000-0000-0000-0000000000f2'),
  0::bigint,
  'and the other class announcement stays invisible'
);

select is(
  (select count(*) from public.tasks),
  1::bigint,
  'a teacher sees exactly one task — their own'
);

select is(
  (select title from public.tasks),
  'Veli görüşmesine hazırlan',
  'and it is the one they wrote, not their colleague''s'
);

select is(
  (select count(*) from public.calendar_events),
  1::bigint,
  'the same for the personal calendar'
);

select lives_ok(
  $sql$insert into public.tasks (organization_id, owner_membership_id, title)
    values ('5a000000-0000-0000-0000-00000000005a',
            '22000000-0000-0000-0000-000000000022', 'Kendi Görevim')$sql$,
  'a user can create a task for themselves'
);

-- Sahiplik anahtarı: başkası adına kayıt açmak `with check` tarafından reddedilir.
select throws_ok(
  $sql$insert into public.tasks (organization_id, owner_membership_id, title)
    values ('5a000000-0000-0000-0000-00000000005a',
            '33000000-0000-0000-0000-000000000033', 'Meslektaşımın Adına Görev')$sql$,
  '42501',
  null,
  'a user cannot create a task owned by someone else'
);

select lives_ok(
  $sql$insert into public.daily_feed_posts (organization_id, class_id, title)
    values ('5a000000-0000-0000-0000-00000000005a',
            'e1000000-0000-0000-0000-0000000000f1', 'Öğretmenin Sınıf Duyurusu')$sql$,
  'a teacher can announce to the class they teach'
);

select throws_ok(
  $sql$insert into public.daily_feed_posts (organization_id, title)
    values ('5a000000-0000-0000-0000-00000000005a', 'Öğretmenin Kurum Duyurusu')$sql$,
  '42501',
  null,
  'a teacher cannot publish an organization-wide announcement'
);

select throws_ok(
  $sql$insert into public.daily_feed_posts (organization_id, class_id, title)
    values ('5a000000-0000-0000-0000-00000000005a',
            'e2000000-0000-0000-0000-0000000000f2', 'Başka Sınıfa Duyuru')$sql$,
  '42501',
  null,
  'a teacher cannot announce to a class they do not teach'
);

-- İkinci öğretmen: izolasyon --------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'a3300000-0000-0000-0000-00000000a330', true);

select is(
  (select title from public.tasks),
  'Sınav sorusu yaz',
  'the second teacher sees only their own task — the colleague note never leaked'
);

-- K-13: meslektaşın görevini güncellemek hata FIRLATMAZ, sessizce sıfır satır
-- günceller. Ölçülen şey sonucun kendisi.
update public.tasks set title = 'Değiştirildi'
where id = '11100000-0000-0000-0000-000000000111';

select is(
  (select title from public.tasks where id = '11100000-0000-0000-0000-000000000111'),
  null::text,
  'and cannot change it either — the row stays invisible and unchanged'
);

-- Öğrenci ve veli: duyuruları görür, kişisel alan yok --------------------------------------

select set_config('request.jwt.claim.sub', 'a4400000-0000-0000-0000-00000000a440', true);

select is(
  (select count(*) from public.daily_feed_posts),
  4::bigint,
  'a student sees organization-wide announcements and their own class ones'
);

select is(
  (select count(*) from public.tasks),
  0::bigint,
  'a student sees no personal tasks — they have none, and nobody else''s either'
);

select set_config('request.jwt.claim.sub', 'a5500000-0000-0000-0000-00000000a550', true);

select is(
  (select count(*) from public.daily_feed_posts),
  4::bigint,
  'a guardian sees the same set through their child class'
);

-- Kilit ve anon ------------------------------------------------------------------------------

reset role;
update public.profiles set must_change_password = true
where id = 'a2200000-0000-0000-0000-00000000a220';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2200000-0000-0000-0000-00000000a220', true);

select is(
  (select count(*) from public.tasks),
  0::bigint,
  'even your own personal tasks close while you must change your password'
);

reset role;
set local role anon;

select throws_ok(
  $sql$select * from public.tasks$sql$,
  '42501',
  null,
  'anon cannot read personal tasks'
);

select throws_ok(
  $sql$select * from public.daily_feed_posts$sql$,
  '42501',
  null,
  'anon cannot read announcements'
);

select * from finish();
rollback;
