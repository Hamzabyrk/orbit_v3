-- Issue #106 -- kurum yöneticisinin üye oluşturma RPC'leri.
--
-- İki fonksiyonlu akış zorunludur: sentetik adres giriş numarasını içerir,
-- giriş numarası person_code'a, auth kullanıcısı da üyeliğin foreign key'ine
-- ihtiyaç duyar. Önce kod hesaplanır, auth kullanıcısı yaratılır, sonra üyelik
-- ve denetim kaydı tek işlemde yazılır.
--
-- Fonksiyonlar SECURITY DEFINER'dır çünkü Edge Function service_role ile
-- çalışır ve RLS'i baypas eder. Yetki sınırı bu nedenle politika katmanında
-- değil, pgTAP ile sınanabilir SQL fonksiyonlarının içindedir.

create or replace function public.internal_allocate_member_slot(
  caller_user_id uuid,
  target_branch_id uuid
)
returns table (
  organization_id uuid,
  organization_code integer,
  person_code integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_organization_id uuid;
begin
  -- Yetkisiz durumlar boş döner; hata ayrımı deneme-yanılmayla kurum veya şube
  -- varlığının öğrenilmesini engeller.
  select membership.organization_id
    into caller_organization_id
  from public.organization_memberships as membership
  where membership.user_id = caller_user_id
    and membership.role = 'admin'
    and membership.status = 'active'
    and (
      target_branch_id is null
      or exists (
        select 1
        from public.branches as branch
        where branch.id = target_branch_id
          and branch.organization_id = membership.organization_id
      )
    )
  limit 1;

  if caller_organization_id is null then
    return;
  end if;

  return query
  select
    caller_organization_id,
    organization.code,
    public.internal_next_person_code(caller_organization_id)
  from public.organizations as organization
  where organization.id = caller_organization_id;
end;
$$;

create or replace function public.internal_create_membership(
  caller_user_id uuid,
  member_user_id uuid,
  organization_id uuid,
  branch_id uuid,
  person_code integer,
  member_role public.app_role,
  member_full_name text,
  login_number text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_membership_id uuid;
begin
  -- İki RPC ayrı HTTP çağrılarıdır; ikinci çağrı tek başına yapılabileceği için
  -- çağıran yönetici, kurum ve şube burada yeniden doğrulanır.
  if not exists (
    select 1
    from public.organization_memberships as administrator
    where administrator.user_id = caller_user_id
      and administrator.organization_id = internal_create_membership.organization_id
      and administrator.role = 'admin'
      and administrator.status = 'active'
  ) then
    raise exception 'caller is not an active organization administrator'
      using errcode = '42501';
  end if;

  if internal_create_membership.branch_id is not null
     and not exists (
       select 1
       from public.branches as branch
       where branch.id = internal_create_membership.branch_id
         and branch.organization_id = internal_create_membership.organization_id
     ) then
    raise exception 'branch does not belong to organization'
      using errcode = '42501';
  end if;

  -- Mevcut kullanıcıyı bağlamak, görünen adını sessizce değiştirebilir ve
  -- başka bir kurumun kimliğini bu kuruma taşıyabilir. Meşru akışta auth
  -- kullanıcısı yenidir ve hiçbir üyeliği yoktur.
  if exists (
    select 1
    from public.organization_memberships as existing_membership
    where existing_membership.user_id = internal_create_membership.member_user_id
  ) then
    raise exception 'member user already has a membership'
      using errcode = '42501';
  end if;

  -- Yönetici oluşturma kararı bu RPC'nin kapsamı değildir; yalnızca üye rolleri
  -- Edge Function şemasında değil, güvenlik sınırı olan SQL'de de engellenir.
  if member_role = 'admin' then
    raise exception 'admin membership cannot be created here'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from auth.users where id = internal_create_membership.member_user_id
  ) then
    raise exception 'member user does not exist' using errcode = '23503';
  end if;

  insert into public.profiles (id, display_name)
  values (member_user_id, trim(member_full_name))
  on conflict (id) do update set display_name = excluded.display_name;

  insert into public.organization_memberships (
    organization_id, branch_id, user_id, role, status, person_code
  )
  values (
    organization_id, branch_id, member_user_id, member_role, 'active', person_code
  )
  returning id into new_membership_id;

  insert into public.audit_events (
    organization_id, branch_id, actor_user_id, action, entity_type, entity_id, metadata
  )
  values (
    organization_id,
    branch_id,
    caller_user_id,
    'membership.created',
    'organization_membership',
    new_membership_id,
    jsonb_build_object('login_number', login_number, 'role', member_role::text)
  );

  return new_membership_id;
end;
$$;

revoke all on function public.internal_allocate_member_slot(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.internal_create_membership(
  uuid, uuid, uuid, uuid, integer, public.app_role, text, text
) from public, anon, authenticated;

grant execute on function public.internal_allocate_member_slot(uuid, uuid)
  to service_role;
grant execute on function public.internal_create_membership(
  uuid, uuid, uuid, uuid, integer, public.app_role, text, text
) to service_role;
