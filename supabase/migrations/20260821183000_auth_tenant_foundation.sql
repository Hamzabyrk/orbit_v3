-- ORBIT v1.1: authenticated identity, organization/branch tenancy and RLS.
-- Business-domain tables intentionally remain out of scope until v1.2.

create type public.app_role as enum ('admin', 'teacher', 'student', 'parent');
create type public.membership_status as enum ('invited', 'active', 'suspended');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_key unique (slug)
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 120),
  is_default boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branches_organization_name_key unique (organization_id, name),
  constraint branches_id_organization_key unique (id, organization_id)
);

create unique index branches_one_default_per_organization_idx
  on public.branches (organization_id)
  where is_default and archived_at is null;

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  branch_id uuid,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  status public.membership_status not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_memberships_branch_organization_fkey
    foreign key (branch_id, organization_id)
    references public.branches (id, organization_id)
    on delete restrict
);

create unique index organization_memberships_org_wide_user_idx
  on public.organization_memberships (organization_id, user_id)
  where branch_id is null;

create unique index organization_memberships_branch_user_idx
  on public.organization_memberships (organization_id, branch_id, user_id)
  where branch_id is not null;

create index organization_memberships_user_status_idx
  on public.organization_memberships (user_id, status, created_at);

create index organization_memberships_org_branch_role_idx
  on public.organization_memberships (organization_id, branch_id, role, status);

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  branch_id uuid,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(trim(action)) between 3 and 100),
  entity_type text not null check (char_length(trim(entity_type)) between 2 and 80),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_events_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint audit_events_branch_organization_fkey
    foreign key (branch_id, organization_id)
    references public.branches (id, organization_id)
    on delete restrict
);

create index audit_events_org_created_at_idx
  on public.audit_events (organization_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger branches_set_updated_at
before update on public.branches
for each row execute function public.set_updated_at();

create trigger organization_memberships_set_updated_at
before update on public.organization_memberships
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'ORBIT Kullanıcısı'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.profiles (id, display_name)
select
  users.id,
  coalesce(
    nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
    'ORBIT Kullanıcısı'
  )
from auth.users as users
on conflict (id) do nothing;

create or replace function public.current_user_has_membership(
  target_organization_id uuid,
  target_branch_id uuid default null,
  allowed_roles public.app_role[] default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships as membership
    where membership.user_id = (select auth.uid())
      and membership.organization_id = target_organization_id
      and membership.status = 'active'
      and (
        target_branch_id is null
        or membership.branch_id is null
        or membership.branch_id = target_branch_id
      )
      and (allowed_roles is null or membership.role = any(allowed_roles))
  );
$$;

create or replace function public.internal_bootstrap_organization(
  organization_name text,
  organization_slug text,
  branch_name text,
  admin_user_id uuid,
  actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_organization_id uuid;
  new_branch_id uuid;
  new_membership_id uuid;
begin
  if not exists (select 1 from auth.users where id = admin_user_id) then
    raise exception 'invited admin user does not exist' using errcode = '23503';
  end if;

  insert into public.organizations (name, slug)
  values (trim(organization_name), lower(trim(organization_slug)))
  returning id into new_organization_id;

  insert into public.branches (organization_id, name, is_default)
  values (new_organization_id, trim(branch_name), true)
  returning id into new_branch_id;

  insert into public.organization_memberships (
    organization_id,
    branch_id,
    user_id,
    role,
    status
  )
  values (
    new_organization_id,
    null,
    admin_user_id,
    'admin',
    'active'
  )
  returning id into new_membership_id;

  insert into public.audit_events (
    organization_id,
    branch_id,
    actor_user_id,
    action,
    entity_type,
    entity_id
  )
  values (
    new_organization_id,
    new_branch_id,
    actor_user_id,
    'organization.bootstrap',
    'organization',
    new_organization_id
  );

  return jsonb_build_object(
    'organization_id', new_organization_id,
    'branch_id', new_branch_id,
    'membership_id', new_membership_id
  );
end;
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.branches enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_select_self
on public.profiles for select
to authenticated
using (id = (select auth.uid()));

create policy profiles_update_self
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy organizations_select_member
on public.organizations for select
to authenticated
using (public.current_user_has_membership(id));

create policy branches_select_member
on public.branches for select
to authenticated
using (public.current_user_has_membership(organization_id, id));

create policy memberships_select_self_or_admin
on public.organization_memberships for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.current_user_has_membership(
    organization_id,
    branch_id,
    array['admin']::public.app_role[]
  )
);

create policy audit_events_select_admin
on public.audit_events for select
to authenticated
using (
  public.current_user_has_membership(
    organization_id,
    branch_id,
    array['admin']::public.app_role[]
  )
);

revoke all on public.profiles from anon, authenticated;
revoke all on public.organizations from anon, authenticated;
revoke all on public.branches from anon, authenticated;
revoke all on public.organization_memberships from anon, authenticated;
revoke all on public.audit_events from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
grant select on public.organizations to authenticated;
grant select on public.branches to authenticated;
grant select on public.organization_memberships to authenticated;
grant select on public.audit_events to authenticated;

grant all on public.profiles to service_role;
grant all on public.organizations to service_role;
grant all on public.branches to service_role;
grant all on public.organization_memberships to service_role;
grant all on public.audit_events to service_role;
grant usage, select on sequence public.audit_events_id_seq to service_role;

revoke all on function public.set_updated_at() from public;
revoke all on function public.handle_new_auth_user() from public;
revoke all on function public.current_user_has_membership(uuid, uuid, public.app_role[]) from public;
revoke all on function public.internal_bootstrap_organization(text, text, text, uuid, uuid) from public;

grant execute on function public.current_user_has_membership(uuid, uuid, public.app_role[]) to authenticated;
grant execute on function public.internal_bootstrap_organization(text, text, text, uuid, uuid) to service_role;
