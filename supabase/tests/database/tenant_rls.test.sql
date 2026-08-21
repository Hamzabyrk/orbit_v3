begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  created_at,
  updated_at
)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-a@example.test', '', now(), now()),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-b@example.test', '', now(), now());

insert into public.organizations (id, name, slug)
values
  ('11000000-0000-0000-0000-000000000001', 'Kurum A', 'kurum-a'),
  ('22000000-0000-0000-0000-000000000002', 'Kurum B', 'kurum-b');

insert into public.branches (id, organization_id, name, is_default)
values
  ('11100000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'A Şubesi', true),
  ('22200000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', 'B Şubesi', true);

insert into public.organization_memberships (
  organization_id,
  branch_id,
  user_id,
  role,
  status
)
values
  ('11000000-0000-0000-0000-000000000001', '11100000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'admin', 'active'),
  ('22000000-0000-0000-0000-000000000002', '22200000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'admin', 'active');

insert into public.audit_events (
  organization_id,
  branch_id,
  action,
  entity_type
)
values
  ('11000000-0000-0000-0000-000000000001', '11100000-0000-0000-0000-000000000001', 'test.created', 'test'),
  ('22000000-0000-0000-0000-000000000002', '22200000-0000-0000-0000-000000000002', 'test.created', 'test');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*) from public.organizations),
  1::bigint,
  'user A sees only organization A'
);

select is(
  (select count(*) from public.branches),
  1::bigint,
  'user A sees only branches in organization A'
);

select is(
  (select count(*) from public.organization_memberships),
  1::bigint,
  'user A cannot read organization B memberships'
);

select is(
  (select count(*) from public.audit_events),
  1::bigint,
  'admin A cannot read organization B audit events'
);

select is(
  (select count(*) from public.profiles),
  1::bigint,
  'user A sees only their own profile'
);

select ok(
  public.current_user_has_membership(
    '11000000-0000-0000-0000-000000000001',
    '11100000-0000-0000-0000-000000000001',
    array['admin']::public.app_role[]
  ),
  'user A has the expected admin membership'
);

select isnt(
  public.current_user_has_membership(
    '22000000-0000-0000-0000-000000000002'
  ),
  true,
  'user A has no membership in organization B'
);

select throws_ok(
  $$insert into public.organization_memberships (
      organization_id, branch_id, user_id, role, status
    ) values (
      '22000000-0000-0000-0000-000000000002',
      '22200000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000001',
      'admin',
      'active'
    )$$,
  '42501',
  null,
  'authenticated clients cannot create memberships'
);

select throws_ok(
  $$insert into public.audit_events (
      organization_id, branch_id, action, entity_type
    ) values (
      '11000000-0000-0000-0000-000000000001',
      '11100000-0000-0000-0000-000000000001',
      'forged.event',
      'test'
    )$$,
  '42501',
  null,
  'authenticated clients cannot forge audit events'
);

select * from finish();
rollback;
