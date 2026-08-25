-- Faz E4 — kurtarma ve iletişim sütunlarının doğrulanması.
--
-- En kritik iddia 5. testtir: kullanıcı kendi `recovery_email`'ini yazamaz.
-- Yazabilseydi doğrulama tamamen anlamsız kalır ve hesaba kısa süreliğine
-- erişen biri kalıcı bir arka kapı bırakabilirdi.

begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '70001000@orbit.invalid', 'hash', now(), now());

-- Şema --------------------------------------------------------------------

select has_column('public', 'profiles', 'phone', 'profiles has a phone column');

select has_column(
  'public', 'profiles', 'recovery_email',
  'profiles has a verified recovery address column'
);

-- Sütunlar bilinçli olarak nullable: kurtarma kanalı zorunlu değildir ve
-- kurum yöneticisi dışındaki roller onsuz da çalışabilir.
select col_is_null(
  'public', 'profiles', 'recovery_email',
  'the recovery address is optional; an account without one is a valid state'
);

-- Geçersiz adres reddedilmeli. Bu kontrol biçim doğrulaması değildir —
-- adresin sahibine ait olduğunu ancak doğrulama akışı kanıtlar — yalnızca
-- açıkça bozuk değerin sütuna girmesini engeller.
select throws_ok(
  $$update public.profiles
      set recovery_email = 'bu-bir-adres-degil'
    where id = 'b1000000-0000-0000-0000-000000000001'$$,
  '23514',
  null,
  'a malformed recovery address is rejected by the check constraint'
);

-- Yetkiler ----------------------------------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000001', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- 🔴 En kritik iddia. Kırılırsa doğrulama akışının tamamı anlamsızlaşır.
--
-- `profiles_update_self` politikası satırı güncellemeye izin veriyor; koruma
-- sütun düzeyi GRANT'tan geliyor. Politikaya güvenip GRANT gevşetilirse bu
-- test kırılır ve sebebi burada yazılıdır.
select throws_ok(
  $$update public.profiles
      set recovery_email = 'saldirgan@example.com'
    where id = 'b1000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'a user cannot write their own recovery address; only the verification flow can'
);

-- Telefon aksine açıktır: doğrulanmıyor, kurtarma kanalı değil ve yanlış
-- yazılması kimseye erişim kazandırmıyor.
select lives_ok(
  $$update public.profiles
      set phone = '05001112233'
    where id = 'b1000000-0000-0000-0000-000000000001'$$,
  'a user can write their own phone number'
);

-- Yardımcı fonksiyon ------------------------------------------------------

select is(
  public.current_user_has_recovery_channel(),
  false,
  'an account with no verified address reports having no recovery channel'
);

reset role;

-- Telefon dolu ama doğrulanmış adres yok: yardımcı hâlâ false demeli.
-- Aksi halde arayüz "kurtarma yolun var" der ve kullanıcı şifresini
-- unuttuğunda kimsenin ona ulaşamadığını fark eder.
select is(
  (select phone is not null from public.profiles
     where id = 'b1000000-0000-0000-0000-000000000001'),
  true,
  'the phone number was stored, and still does not count as a recovery channel'
);

select * from finish();

rollback;
