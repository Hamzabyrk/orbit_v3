-- Issue #53 — Kurum kurulumu davet yerine giriş numarası + geçici şifre.
--
-- Eski akış kurum yöneticisini `inviteUserByEmail` ile, yani şifresiz
-- yaratıyordu. Davet bağlantısı `type=invite` ile dönüyor ve istemci yalnızca
-- `type=recovery` biliyor; davetle gelen kullanıcı şifresini hiç belirlemeden
-- panele düşüyor ve o oturum kapandığında bir daha giremiyordu. Yani akış
-- uçtan uca kırıktı ve ilk gerçek kurumda kilitlenirdi.
--
-- Yeni akış: herkes gibi kurum yöneticisi de giriş numarası ve kişiye özel
-- geçici şifreyle açılır. Bkz. `.ai/DECISION_LOG.md` — "Hesaplar davet
-- e-postasıyla değil, doğrudan geçici şifreyle açılır".

-- Eski imza kaldırılıyor. `create or replace` yeni parametrelerle bir aşırı
-- yükleme (overload) üretirdi ve iki sürüm yan yana kalırdı; Edge Function
-- hangisini çağırdığını sessizce şaşırabilirdi.
drop function if exists public.internal_bootstrap_organization(
  text, text, text, uuid, uuid
);

create or replace function public.internal_bootstrap_organization(
  organization_name text,
  organization_slug text,
  organization_code integer,
  branch_name text,
  admin_user_id uuid,
  admin_person_code integer,
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
  expected_person_code integer;
begin
  if not exists (select 1 from auth.users where id = admin_user_id) then
    raise exception 'admin user does not exist' using errcode = '23503';
  end if;

  insert into public.organizations (name, slug, code)
  values (
    trim(organization_name),
    lower(trim(organization_slug)),
    organization_code
  )
  returning id into new_organization_id;

  insert into public.branches (organization_id, name, is_default)
  values (new_organization_id, trim(branch_name), true)
  returning id into new_branch_id;

  -- Kişi kodunun tek doğruluk kaynağı veritabanıdır. Çağıran taraf da bir
  -- değer hesaplıyor (sentetik adresi kurabilmek için kullanıcıyı bu
  -- fonksiyondan ÖNCE yaratmak zorunda) ve iki hesap birbirini tutmalı.
  -- Tutmuyorsa sessizce devam etmek, kullanıcının giriş yapamayacağı bir
  -- hesap üretmek demektir: adres bir numaraya, üyelik başka bir numaraya
  -- işaret ederdi.
  expected_person_code := public.internal_next_person_code(new_organization_id);

  if expected_person_code is distinct from admin_person_code then
    raise exception
      'person code mismatch: caller sent %, database expects %',
      admin_person_code, expected_person_code
      using errcode = '23514';
  end if;

  insert into public.organization_memberships (
    organization_id,
    branch_id,
    user_id,
    role,
    status,
    person_code
  )
  values (
    new_organization_id,
    null,
    admin_user_id,
    'admin',
    'active',
    admin_person_code
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
    'organization_code', organization_code,
    'branch_id', new_branch_id,
    'membership_id', new_membership_id,
    'person_code', admin_person_code,
    'login_number', organization_code::text || admin_person_code::text
  );
end;
$$;

-- İstemciden çağrılamaz. Issue #18'de bu fonksiyonun `anon` tarafından
-- çağrılabildiği bulunmuştu; Supabase'in default grant'ları `from public`
-- revoke'uyla kalkmadığı için her iki rol de ayrıca kaldırılıyor.
revoke all on function public.internal_bootstrap_organization(
  text, text, integer, text, uuid, integer, uuid
) from public, anon, authenticated;

grant execute on function public.internal_bootstrap_organization(
  text, text, integer, text, uuid, integer, uuid
) to service_role;
