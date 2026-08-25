-- Kurum yöneticisinin üye şifresi sıfırlama yetkisi.
--
-- Bu dosya, `service_role` ile çalışan bir Edge Function'ın verdiği kararı
-- sınıyor. Karar SQL'e **tam olarak bunun için** taşındı: `service_role` RLS'i
-- baypas ettiği için sınır hiçbir politikadan geçmiyor ve fonksiyonun içinde
-- kalsaydı hiçbir testin ulaşamayacağı bir güvenlik sınırı olurdu.
--
-- En kritik iddia 2. testtir: bir kurumun yöneticisi, başka kurumun üyesine
-- ulaşamaz. Kırılırsa kiracı yalıtımı tamamen ortadan kalkar.

begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  -- Kurum A: yönetici, öğretmen, askıya alınmış üye
  ('c1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '80001000@orbit.invalid', 'hash', now(), now()),
  ('c1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '80001001@orbit.invalid', 'hash', now(), now()),
  ('c1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '80001002@orbit.invalid', 'hash', now(), now()),
  -- Kurum B: yönetici ve üye
  ('c2000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '80011000@orbit.invalid', 'hash', now(), now()),
  ('c2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '80011001@orbit.invalid', 'hash', now(), now());

insert into public.organizations (id, name, slug, code)
values
  ('c1a00000-0000-0000-0000-000000000001', 'Kurum A', 'kurum-a', 8000),
  ('c2a00000-0000-0000-0000-000000000002', 'Kurum B', 'kurum-b', 8001);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('aa000000-0000-0000-0000-000000000001',
   'c1a00000-0000-0000-0000-000000000001', null,
   'c1000000-0000-0000-0000-000000000001', 'admin', 'active', 1000),
  ('aa000000-0000-0000-0000-000000000002',
   'c1a00000-0000-0000-0000-000000000001', null,
   'c1000000-0000-0000-0000-000000000002', 'teacher', 'active', 1001),
  ('aa000000-0000-0000-0000-000000000003',
   'c1a00000-0000-0000-0000-000000000001', null,
   'c1000000-0000-0000-0000-000000000003', 'student', 'suspended', 1002),
  ('bb000000-0000-0000-0000-000000000001',
   'c2a00000-0000-0000-0000-000000000002', null,
   'c2000000-0000-0000-0000-000000000001', 'admin', 'active', 1000),
  ('bb000000-0000-0000-0000-000000000002',
   'c2a00000-0000-0000-0000-000000000002', null,
   'c2000000-0000-0000-0000-000000000002', 'student', 'active', 1001);

-- İzin verilen tek durum -----------------------------------------------------

select is(
  (select count(*)::int from public.internal_resolve_member_for_reset(
     'c1000000-0000-0000-0000-000000000001',
     'aa000000-0000-0000-0000-000000000002')),
  1,
  'an organisation admin can reset a member of their own organisation'
);

-- 🔴 En kritik iddia. Kırılırsa kiracı yalıtımı biter.

select is(
  (select count(*)::int from public.internal_resolve_member_for_reset(
     'c1000000-0000-0000-0000-000000000001',
     'bb000000-0000-0000-0000-000000000002')),
  0,
  'an admin cannot reach a member of a different organisation'
);

-- Yetki --------------------------------------------------------------------

select is(
  (select count(*)::int from public.internal_resolve_member_for_reset(
     'c1000000-0000-0000-0000-000000000002',
     'aa000000-0000-0000-0000-000000000003')),
  0,
  'a teacher cannot reset anyone, not even in their own organisation'
);

-- Kendi kaydını sıfırlamak işe yaramaz: yeni şifre kilitli gelir ve kişi
-- kendini bir sonraki girişte şifre değiştirmeye mahkûm eder.
select is(
  (select count(*)::int from public.internal_resolve_member_for_reset(
     'c1000000-0000-0000-0000-000000000001',
     'aa000000-0000-0000-0000-000000000001')),
  0,
  'nobody can reset their own password through this path'
);

-- Askıya alınmış üyeye şifre üretmek, erişimi kapatılmış birine erişim
-- vermek olurdu.
select is(
  (select count(*)::int from public.internal_resolve_member_for_reset(
     'c1000000-0000-0000-0000-000000000001',
     'aa000000-0000-0000-0000-000000000003')),
  0,
  'a suspended membership cannot be given a new password'
);

-- Var olmayan üyelik, yetkisiz erişimle **aynı** sonucu vermeli. Ayırt
-- edilebilseydi çağıran taraf rastgele kimlik deneyerek hangi üyeliklerin
-- var olduğunu öğrenebilirdi.
select is(
  (select count(*)::int from public.internal_resolve_member_for_reset(
     'c1000000-0000-0000-0000-000000000001',
     'aa000000-0000-0000-0000-0000000000ff')),
  0,
  'an unknown membership is indistinguishable from an unauthorised one'
);

-- Döndürülen içerik ---------------------------------------------------------

select is(
  (select login_number from public.internal_resolve_member_for_reset(
     'c1000000-0000-0000-0000-000000000001',
     'aa000000-0000-0000-0000-000000000002')),
  '80001001',
  'the login number is the organisation code followed by the person code'
);

-- Yetkiler ------------------------------------------------------------------
--
-- Fonksiyon istemciye açık olsaydı, kurum yöneticisi olmayan biri de kurumdaki
-- üyelikleri ve giriş numaralarını numaralandırabilirdi.
select ok(
  not has_function_privilege(
    'authenticated',
    'public.internal_resolve_member_for_reset(uuid, uuid)',
    'execute'
  ),
  'authenticated cannot call the authorization resolver directly'
);

select * from finish();

rollback;
