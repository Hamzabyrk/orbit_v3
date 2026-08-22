-- Issue #18 — Fonksiyon ve tablo yetkilerinin doğrulanması.
--
-- Negatif testler: anon ve authenticated rolleri ayrıcalıklı fonksiyonları
-- çağıramaz ve workspace_documents'a erişemez.
-- Pozitif testler: RLS'in bağımlı olduğu yardımcı fonksiyon ve auth trigger'ı
-- revoke sonrasında çalışmaya devam eder.

begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

-- Kurulum sahibi rolüyle yapılır. Bu insert `on_auth_user_created` trigger'ını
-- tetikler; trigger revoke sonrasında da profil oluşturmalıdır.
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
values (
  '30000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'grant-probe@example.test',
  '',
  now(),
  now()
);

select is(
  (
    select count(*)
    from public.profiles
    where id = '30000000-0000-0000-0000-000000000003'
  ),
  1::bigint,
  'handle_new_auth_user trigger still creates a profile after EXECUTE revoke'
);

-- anon rolü ------------------------------------------------------------------

set local role anon;

select throws_ok(
  $$select public.internal_bootstrap_organization(
      'Kurum', 'kurum', 'Sube',
      '30000000-0000-0000-0000-000000000003'::uuid,
      '30000000-0000-0000-0000-000000000003'::uuid
    )$$,
  '42501',
  null,
  'anon cannot execute internal_bootstrap_organization'
);

select throws_ok(
  $$select public.current_user_has_membership(
      '11000000-0000-0000-0000-000000000001'::uuid
    )$$,
  '42501',
  null,
  'anon cannot execute current_user_has_membership'
);

select throws_ok(
  $$select count(*) from public.workspace_documents$$,
  '42501',
  null,
  'anon cannot read workspace_documents'
);

reset role;

-- authenticated rolü ---------------------------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-0000-0000-000000000003',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$select public.internal_bootstrap_organization(
      'Kurum', 'kurum', 'Sube',
      '30000000-0000-0000-0000-000000000003'::uuid,
      '30000000-0000-0000-0000-000000000003'::uuid
    )$$,
  '42501',
  null,
  'authenticated cannot execute internal_bootstrap_organization'
);

select throws_ok(
  $$select count(*) from public.workspace_documents$$,
  '42501',
  null,
  'authenticated cannot read workspace_documents'
);

-- RLS politikaları bu fonksiyonu çağıran rolün ayrıcalıklarıyla değerlendirir;
-- yetkinin korunduğu doğrulanmazsa tüm tenant okuma akışı sessizce kırılır.
select lives_ok(
  $$select public.current_user_has_membership(
      '11000000-0000-0000-0000-000000000001'::uuid
    )$$,
  'authenticated can still execute current_user_has_membership (RLS depends on it)'
);

-- set_updated_at trigger'ı bu migration'da revoke edilmedi; yine de profil
-- güncellemesinin uçtan uca çalıştığı regresyon olarak doğrulanır.
select lives_ok(
  $$update public.profiles
      set display_name = 'Guncellenmis Ad'
    where id = '30000000-0000-0000-0000-000000000003'$$,
  'authenticated can still update own profile and fire the updated_at trigger'
);

reset role;

select * from finish();

rollback;
