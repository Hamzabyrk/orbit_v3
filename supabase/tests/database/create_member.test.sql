-- Issue #106 — üye tahsisi, atomik oluşturma ve yetki sınırı.
begin;

create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '81001000@orbit.invalid', 'hash', now(), now()),
  ('d1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '81001001@orbit.invalid', 'hash', now(), now()),
  ('d2000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '82001000@orbit.invalid', 'hash', now(), now()),
  ('d2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '82001001@orbit.invalid', 'hash', now(), now()),
  ('d3000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '83001000@orbit.invalid', 'hash', now(), now()),
  ('d4000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '84001000@orbit.invalid', 'hash', now(), now());

insert into public.organizations (id, name, slug, code)
values
  ('d1a00000-0000-0000-0000-000000000001', 'Uye Test A', 'uye-test-a', 8100),
  ('d2a00000-0000-0000-0000-000000000002', 'Uye Test B', 'uye-test-b', 8200);

insert into public.branches (id, organization_id, name, is_default)
values
  ('d1b00000-0000-0000-0000-000000000001', 'd1a00000-0000-0000-0000-000000000001', 'Merkez', true),
  ('d2b00000-0000-0000-0000-000000000002', 'd2a00000-0000-0000-0000-000000000002', 'Diger', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('d1c00000-0000-0000-0000-000000000001', 'd1a00000-0000-0000-0000-000000000001', null, 'd1000000-0000-0000-0000-000000000001', 'admin', 'active', 1000),
  ('d1c00000-0000-0000-0000-000000000002', 'd1a00000-0000-0000-0000-000000000001', null, 'd1000000-0000-0000-0000-000000000002', 'teacher', 'active', 1001),
  ('d2c00000-0000-0000-0000-000000000001', 'd2a00000-0000-0000-0000-000000000002', null, 'd2000000-0000-0000-0000-000000000001', 'admin', 'suspended', 1000),
  ('d2c00000-0000-0000-0000-000000000002', 'd2a00000-0000-0000-0000-000000000002', null, 'd2000000-0000-0000-0000-000000000002', 'admin', 'active', 1001);

select is(
  (select count(*)::int from public.internal_allocate_member_slot('d1000000-0000-0000-0000-000000000001', null)),
  1, 'active admin receives a slot'
);
select is(
  (select person_code from public.internal_allocate_member_slot('d1000000-0000-0000-0000-000000000001', 'd1b00000-0000-0000-0000-000000000001')),
  1002, 'admin receives the next person code for its branch'
);
select is(
  (select count(*)::int from public.internal_allocate_member_slot('d1000000-0000-0000-0000-000000000002', null)),
  0, 'teacher receives no slot'
);
select is(
  (select count(*)::int from public.internal_allocate_member_slot('d2000000-0000-0000-0000-000000000001', null)),
  0, 'suspended admin receives no slot'
);
select is(
  (select count(*)::int from public.internal_allocate_member_slot('d2000000-0000-0000-0000-000000000002', null)),
  1, 'an admin in another organisation receives only its own slot'
);
select is(
  (select count(*)::int from public.internal_allocate_member_slot('d1000000-0000-0000-0000-000000000001', 'd2b00000-0000-0000-0000-000000000002')),
  0, 'foreign branch receives no slot'
);

select lives_ok($$select public.internal_create_membership(
  'd1000000-0000-0000-0000-000000000001',
  'd3000000-0000-0000-0000-000000000001',
  'd1a00000-0000-0000-0000-000000000001',
  'd1b00000-0000-0000-0000-000000000001',
  1002, 'teacher', 'Yeni Ogretmen', '81001002',
  timestamptz '2026-09-13 00:00:00+00'
)$$, 'active admin can create a membership');

select is(
  (select count(*)::int from public.organization_memberships where user_id = 'd3000000-0000-0000-0000-000000000001' and person_code = 1002),
  1, 'successful creation inserts membership'
);
select is(
  (select person_code from public.internal_allocate_member_slot('d1000000-0000-0000-0000-000000000001', null)),
  1003, 'the next allocation increases after membership creation'
);
select is(
  (select display_name from public.profiles where id = 'd3000000-0000-0000-0000-000000000001'),
  'Yeni Ogretmen', 'successful creation writes profile name'
);

-- v1.2-16: kilit ARTIK bu işlemin içinde yazılıyor. Öncesinde `create-member`
-- üyelikten sonra ayrı bir UPDATE atıyordu; o UPDATE başarısız olduğunda üye
-- geçici şifresiyle süresiz kalıyor ve şifresini değiştirmesi hiç
-- gerekmiyordu. Ölçülen şey Edge Function'ın ne yaptığı değil, üyelik
-- oluştuğunda kilidin **zorunlu olarak** var olması.
select is(
  (select must_change_password from public.profiles where id = 'd3000000-0000-0000-0000-000000000001'),
  true, 'the membership and its password lock are written in one transaction'
);
select is(
  (select password_expires_at from public.profiles where id = 'd3000000-0000-0000-0000-000000000001'),
  timestamptz '2026-09-13 00:00:00+00', 'the expiry travels with the membership, not in a second call'
);

-- Parametre `default null` ile eklendi: sözleşmeyi genişletirken eski çağrı
-- biçimi de çözülmeli ve o durumda bile kilit KONULMALI. Süre bilinmiyorsa
-- boş kalır; "değiştirmek zorunda" kısmı asla kaybolmaz.
select lives_ok($$select public.internal_create_membership(
  'd1000000-0000-0000-0000-000000000001',
  'd4000000-0000-0000-0000-000000000001',
  'd1a00000-0000-0000-0000-000000000001',
  'd1b00000-0000-0000-0000-000000000001',
  1003, 'student', 'Sureli Olmayan', '81001003'
)$$, 'the older eight-argument call still resolves');
select is(
  (select must_change_password from public.profiles where id = 'd4000000-0000-0000-0000-000000000001'),
  true, 'even without an expiry the account still must change its password'
);
select is(
  (select count(*)::int from public.audit_events where action = 'membership.created' and entity_type = 'organization_membership' and metadata->>'login_number' = '81001002' and (metadata ? 'temporary_password') = false),
  1, 'creation writes audit without a password'
);
select ok(
  not has_function_privilege('anon', 'public.internal_create_membership(uuid, uuid, uuid, uuid, integer, public.app_role, text, text, timestamptz)', 'execute')
  and not has_function_privilege('authenticated', 'public.internal_create_membership(uuid, uuid, uuid, uuid, integer, public.app_role, text, text, timestamptz)', 'execute'),
  'client roles cannot execute membership creation'
);
select throws_ok(
  $$select public.internal_create_membership(
    'd1000000-0000-0000-0000-000000000002',
    'd3000000-0000-0000-0000-000000000001',
    'd1a00000-0000-0000-0000-000000000001',
    null, 1003, 'student', 'Yetkisiz', '81001003'
  )$$,
  '42501', null, 'non-admin caller is rejected'
);
select throws_ok(
  $$select public.internal_create_membership(
    'd1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000002',
    'd1a00000-0000-0000-0000-000000000001',
    null, 1003, 'teacher', 'Mevcut Kullanici', '81001003'
  )$$,
  '42501', null, 'a user with an existing membership is rejected'
);
select throws_ok(
  $$select public.internal_create_membership(
    'd1000000-0000-0000-0000-000000000001',
    'd4000000-0000-0000-0000-000000000001',
    'd1a00000-0000-0000-0000-000000000001',
    null, 1003, 'admin', 'Yonetici', '81001003'
  )$$,
  '42501', null, 'admin role creation is rejected'
);

select * from finish();
rollback;
