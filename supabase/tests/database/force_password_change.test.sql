-- Issue #69 — Zorunlu ilk şifre değişiminin doğrulanması.
--
-- İki iddia diğerlerinden önemli:
--
--   1. Kullanıcı bayrağı kendi eliyle düşüremez. Düşürebilseydi kilit tek bir
--      istekle atlanır ve geçici şifre kalıcı şifreye dönerdi.
--   2. Şifre gerçekten değiştiğinde bayrak kendiliğinden düşer. Düşmeseydi
--      kullanıcı şifresini değiştirse bile kilit ekranında kalırdı.

begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('a9000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '60001000@orbit.invalid', 'eski-hash', now(), now()),
  ('a9000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '60001001@orbit.invalid', 'eski-hash', now(), now());

-- Şema --------------------------------------------------------------------

select has_column(
  'public', 'profiles', 'must_change_password',
  'profiles has the lock flag'
);

select has_column(
  'public', 'profiles', 'password_expires_at',
  'profiles has the expiry column'
);

select col_not_null(
  'public', 'profiles', 'must_change_password',
  'the lock flag is never null; an unknown lock state would fail open'
);

select is(
  (select must_change_password from public.profiles
     where id = 'a9000000-0000-0000-0000-000000000001'),
  false,
  'a new profile starts unlocked'
);

-- Bayrağı service_role kurar -----------------------------------------------

update public.profiles
set must_change_password = true,
    password_expires_at = now() + interval '7 days'
where id = 'a9000000-0000-0000-0000-000000000001';

select is(
  (select must_change_password from public.profiles
     where id = 'a9000000-0000-0000-0000-000000000001'),
  true,
  'service_role can set the lock flag'
);

-- Yardımcı fonksiyon --------------------------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', 'a9000000-0000-0000-0000-000000000001', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select ok(
  public.current_user_must_change_password(),
  'a locked user is reported as locked'
);

-- 🔴 En kritik iddia. Kırılırsa kilit tek bir istekle atlanır.
--
-- `profiles_update_self` politikası satır düzeyinde izin veriyor; koruma
-- sütun düzeyi GRANT'tan geliyor. Politikaya güvenip GRANT kaldırılırsa bu
-- test kırılır.
select throws_ok(
  $$update public.profiles
      set must_change_password = false
    where id = 'a9000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'a user cannot clear their own lock flag'
);

select throws_ok(
  $$update public.profiles
      set password_expires_at = null
    where id = 'a9000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'a user cannot extend their own temporary password'
);

-- Kullanıcı kendi adını hâlâ değiştirebilmeli: koruma bayrağa özgüdür,
-- profilin tamamını dondurmaz.
select lives_ok(
  $$update public.profiles
      set display_name = 'Yeni Ad'
    where id = 'a9000000-0000-0000-0000-000000000001'$$,
  'a user can still update their own display name'
);

reset role;

-- 🔴 İkinci kritik iddia: şifre değişince bayrak kendiliğinden düşer --------

update auth.users
set encrypted_password = 'yeni-hash'
where id = 'a9000000-0000-0000-0000-000000000001';

select is(
  (select must_change_password from public.profiles
     where id = 'a9000000-0000-0000-0000-000000000001'),
  false,
  'changing the password clears the lock flag'
);

select is(
  (select password_expires_at from public.profiles
     where id = 'a9000000-0000-0000-0000-000000000001'),
  null,
  'changing the password clears the expiry'
);

-- Tetikleyici yalnızca şifre değiştiğinde çalışmalı. Her `auth.users`
-- güncellemesinde çalışsaydı, ilgisiz bir alan değiştiğinde kilit sessizce
-- düşerdi.
update public.profiles
set must_change_password = true
where id = 'a9000000-0000-0000-0000-000000000002';

update auth.users
set updated_at = now()
where id = 'a9000000-0000-0000-0000-000000000002';

select is(
  (select must_change_password from public.profiles
     where id = 'a9000000-0000-0000-0000-000000000002'),
  true,
  'an unrelated auth.users update does not clear the lock'
);

select * from finish();

rollback;
