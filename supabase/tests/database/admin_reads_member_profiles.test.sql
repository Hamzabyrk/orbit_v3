-- Kurum yöneticisinin kendi kurumundaki profilleri okuması.
--
-- En kritik iddia 2. testtir: bir kurumun yöneticisi **başka kurumun** üyesinin
-- adını okuyamaz. Kırılırsa politika kurum sınırını değil sistem sınırını
-- açmış olur ve her yönetici tüm kurumların kişi listesini görür.

begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  -- Kurum A: yönetici, öğretmen, askıya alınmış öğrenci
  ('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '90001000@orbit.invalid', 'hash', now(), now()),
  ('d1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '90001001@orbit.invalid', 'hash', now(), now()),
  ('d1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '90001002@orbit.invalid', 'hash', now(), now()),
  -- Kurum B: yönetici ve öğrenci
  ('d2000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '90011000@orbit.invalid', 'hash', now(), now()),
  ('d2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '90011001@orbit.invalid', 'hash', now(), now());

insert into public.organizations (id, name, slug, code)
values
  ('d1a00000-0000-0000-0000-000000000001', 'Kurum C', 'kurum-c', 9000),
  ('d2a00000-0000-0000-0000-000000000002', 'Kurum D', 'kurum-d', 9001);

insert into public.organization_memberships
  (organization_id, branch_id, user_id, role, status, person_code)
values
  ('d1a00000-0000-0000-0000-000000000001', null,
   'd1000000-0000-0000-0000-000000000001', 'admin', 'active', 1000),
  ('d1a00000-0000-0000-0000-000000000001', null,
   'd1000000-0000-0000-0000-000000000002', 'teacher', 'active', 1001),
  ('d1a00000-0000-0000-0000-000000000001', null,
   'd1000000-0000-0000-0000-000000000003', 'student', 'suspended', 1002),
  ('d2a00000-0000-0000-0000-000000000002', null,
   'd2000000-0000-0000-0000-000000000001', 'admin', 'active', 1000),
  ('d2a00000-0000-0000-0000-000000000002', null,
   'd2000000-0000-0000-0000-000000000002', 'student', 'active', 1001);

-- Kurum A yöneticisi olarak -------------------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Boşluğun kendisi: bu olmadan üye tablosu UUID listesi olurdu.
select is(
  (select count(*)::int from public.profiles
     where id = 'd1000000-0000-0000-0000-000000000002'),
  1,
  'an admin can read the profile of a member of their own organisation'
);

-- 🔴 En kritik iddia. Kırılırsa politika kurum sınırını değil sistem sınırını
-- açmış olur.
select is(
  (select count(*)::int from public.profiles
     where id = 'd2000000-0000-0000-0000-000000000002'),
  0,
  'an admin cannot read the profile of another organisation member'
);

-- Askıya alınmış üye görünür kalmalı: aksi halde yönetici kurumdan çıkardığı
-- kişinin adını göremez ve listede boş bir satır kalır.
select is(
  (select count(*)::int from public.profiles
     where id = 'd1000000-0000-0000-0000-000000000003'),
  1,
  'a suspended member stays visible to their admin'
);

-- Kurum A öğretmeni olarak --------------------------------------------------

select set_config(
  'request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000002', true
);

select is(
  (select count(*)::int from public.profiles
     where id = 'd1000000-0000-0000-0000-000000000001'),
  0,
  'a teacher cannot read another person profile, not even their admin'
);

select is(
  (select count(*)::int from public.profiles
     where id = 'd1000000-0000-0000-0000-000000000002'),
  1,
  'a teacher can still read their own profile'
);

-- Kurum B yöneticisi olarak -------------------------------------------------

select set_config(
  'request.jwt.claim.sub', 'd2000000-0000-0000-0000-000000000001', true
);

select is(
  (select count(*)::int from public.profiles
     where id = 'd2000000-0000-0000-0000-000000000002'),
  1,
  'the other organisation admin reads their own member, and only theirs'
);

select is(
  (select count(*)::int from public.profiles
     where id = 'd1000000-0000-0000-0000-000000000002'),
  0,
  'the boundary holds in both directions'
);

reset role;

select * from finish();

rollback;
