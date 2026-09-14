-- v1.4-17 — Geçiş menüsünün listesi (`my_linked_accounts`).
--
-- Bu fonksiyon bir yetki vermiyor; **bir liste** veriyor. Ama listenin yanlış
-- olması iki ayrı yoldan zarar verir:
--
--   - Fazla listelerse: başkasının hesabı menüde görünür. Basılınca
--     `internal_begin_account_switch` reddeder, yani güvenlik açığı olmaz —
--     ama ekran var olmayan bir yetkiyi var gibi göstermiş olur (**K-22**).
--   - Eksik listelerse: kişi kendi hesabına geçemez ve sebebi hiçbir yerde
--     görünmez.
--
-- Sekiz iddia:
--
--   1. Bağlı iki hesap listeleniyor ve biri `is_current`.
--   2. Rol ve kurum adı geliyor — menü ikisini ayırt edebiliyor.
--   3. ⛔ Kişi kaydı OLMAYAN çağıran kendini bile görmüyor (bugün üretimdeki
--      herkesin durumu; menü hiç çizilmemeli).
--   4. ⛔ Aktif üyeliği olmayan bağlı hesap listelenmiyor.
--   5. ⛔ Başka kişinin hesabı listelenmiyor.
--   6. ⛔ Şifre kilidi açıkken liste boş.
--   7. ⛔ `anon` fonksiyonu hiç çağıramıyor.
--   8. ⛔ PASİF üyeliği olan bağlı hesap da listelenmiyor.
--
-- Dördüncüsü listenin **geçişin kabul edeceği kümeyle aynı** olmasını
-- sabitliyor: `internal_begin_account_switch` üyeliksiz hedefi reddediyor
-- (#301). İki taraf ayrışırsa ekran basılınca reddedilen bir düğme çizer.

begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('61000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '76190001@orbit.invalid', '', now(), now()),
  ('62000000-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '76190002@orbit.invalid', '', now(), now()),
  ('63000000-0000-0000-0000-000000000063', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '76190003@orbit.invalid', '', now(), now()),
  ('64000000-0000-0000-0000-000000000064', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '76190004@orbit.invalid', '', now(), now()),
  ('65000000-0000-0000-0000-000000000065', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '76190005@orbit.invalid', '', now(), now()),
  ('66000000-0000-0000-0000-000000000066', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '76190006@orbit.invalid', '', now(), now());

insert into public.organizations (id, name, slug, code)
values ('6a000000-0000-0000-0000-00000000006a', 'Menü Kurumu', 'menu-kurumu-v1417', 7619);

insert into public.branches (id, organization_id, name, is_default)
values ('6b000000-0000-0000-0000-00000000006b', '6a000000-0000-0000-0000-00000000006a', 'Merkez', true);

-- `64…` bağlı ama ÜYELİKSİZ; `65…` üyelikli ama BAŞKA kişiye ait.
insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('6c100000-0000-0000-0000-0000000c1001', '6a000000-0000-0000-0000-00000000006a',
   '6b000000-0000-0000-0000-00000000006b', '61000000-0000-0000-0000-000000000061', 'teacher', 'active', 6101),
  ('6c200000-0000-0000-0000-0000000c2002', '6a000000-0000-0000-0000-00000000006a',
   '6b000000-0000-0000-0000-00000000006b', '62000000-0000-0000-0000-000000000062', 'parent', 'active', 6102),
  ('6c300000-0000-0000-0000-0000000c3003', '6a000000-0000-0000-0000-00000000006a',
   '6b000000-0000-0000-0000-00000000006b', '63000000-0000-0000-0000-000000000063', 'parent', 'active', 6103),
  ('6c500000-0000-0000-0000-0000000c5005', '6a000000-0000-0000-0000-00000000006a',
   '6b000000-0000-0000-0000-00000000006b', '65000000-0000-0000-0000-000000000065', 'teacher', 'active', 6105),
  -- `66…` bağlı ve üyeliği VAR ama PASİF. Üyeliksiz olandan farkı önemli:
  -- üyeliksiz hesabı `join` zaten eliyor, pasif olanı ancak `status` süzgeci
  -- eliyor. İlk yazımda bu kurgu yoktu ve süzgeç mutasyonda kırmızıya
  -- dönmedi — koşul ölü değildi, TESTİM kördü.
  ('6c600000-0000-0000-0000-0000000c6006', '6a000000-0000-0000-0000-00000000006a',
   '6b000000-0000-0000-0000-00000000006b', '66000000-0000-0000-0000-000000000066', 'parent', 'suspended', 6106);

insert into public.people (id)
values
  ('6d100000-0000-0000-0000-0000000d1001'),
  ('6d200000-0000-0000-0000-0000000d2002');

-- Birinci kişi: 61 (öğretmen), 62 (veli) ve 64 (üyeliksiz).
update public.profiles
   set person_id = '6d100000-0000-0000-0000-0000000d1001'
 where id in (
   '61000000-0000-0000-0000-000000000061',
   '62000000-0000-0000-0000-000000000062',
   '64000000-0000-0000-0000-000000000064',
   '66000000-0000-0000-0000-000000000066'
 );

-- İkinci kişi: 65. Birinci kişinin menüsünde görünmemeli.
update public.profiles
   set person_id = '6d200000-0000-0000-0000-0000000d2002'
 where id = '65000000-0000-0000-0000-000000000065';

-- 63 hiçbir kişiye bağlı değil (bugün üretimdeki herkes gibi).

update public.profiles set display_name = 'Ayşe Yılmaz'
 where id in (
   '61000000-0000-0000-0000-000000000061',
   '62000000-0000-0000-0000-000000000062'
 );

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

select set_config('request.jwt.claim.sub', '61000000-0000-0000-0000-000000000061', true);

-- 1 · İki hesap listeleniyor ve tam biri `is_current`.
select is(
  (select count(*) || '/' || count(*) filter (where hesap.is_current)
     from public.my_linked_accounts() as hesap),
  '2/1',
  'both accounts are listed and exactly one is marked as the current session'
);

-- 2 · Rol ve kurum adı geliyor — iki hesap AYNI adı taşıdığı hâlde menü
--     onları ayırt edebiliyor. Ayırt eden şey ad değil rol.
select is(
  (select string_agg(hesap.role::text, ',' order by hesap.role::text)
          || ' @ ' ||
          (select distinct hesap2.organization_name
             from public.my_linked_accounts() as hesap2)
     from public.my_linked_accounts() as hesap),
  'parent,teacher @ Menü Kurumu',
  'the menu gets role and organization — the display name is identical on both'
);

-- 3 · ⛔ Kişi kaydı olmayan çağıran KENDİNİ bile görmüyor.
select set_config('request.jwt.claim.sub', '63000000-0000-0000-0000-000000000063', true);

select is(
  (select count(*) from public.my_linked_accounts()),
  0::bigint,
  'an account that belongs to no person sees nothing — not even itself'
);

-- 4 · ⛔ Bağlı ama aktif üyeliği olmayan hesap listelenmiyor.
--     Liste, geçişin kabul edeceği kümenin aynısı olmak zorunda (#301).
select set_config('request.jwt.claim.sub', '61000000-0000-0000-0000-000000000061', true);

select is(
  (select count(*) from public.my_linked_accounts() as hesap
    where hesap.user_id = '64000000-0000-0000-0000-000000000064'),
  0::bigint,
  'a linked account without an active membership is not offered — the switch would refuse it'
);

-- 5 · ⛔ Başka kişinin hesabı listelenmiyor.
select is(
  (select count(*) from public.my_linked_accounts() as hesap
    where hesap.user_id = '65000000-0000-0000-0000-000000000065'),
  0::bigint,
  'another person''s account never appears in the menu'
);

-- 6 · ⛔ Şifre kilidi açıkken liste boş.
set local role postgres;
update public.profiles
   set must_change_password = true
 where id = '61000000-0000-0000-0000-000000000061';
set local role authenticated;

select is(
  (select count(*) from public.my_linked_accounts()),
  0::bigint,
  'a locked account gets an empty list — the switch would refuse it too'
);

-- 7 · ⛔ `anon` fonksiyonu hiç çağıramıyor.
select is(
  (select has_function_privilege('anon', 'public.my_linked_accounts()', 'execute')),
  false,
  'anon can never ask who is linked to whom'
);

-- 8 · ⛔ PASİF üyeliği olan bağlı hesap listelenmiyor.
--      Dördüncü iddiadan farkı: orada üyelik HİÇ yok ve `join` zaten eliyor.
--      Burada üyelik var, yalnız `status` pasif — onu eleyen tek şey süzgeç.
select set_config('request.jwt.claim.sub', '62000000-0000-0000-0000-000000000062', true);

select is(
  (select count(*) from public.my_linked_accounts() as hesap
    where hesap.user_id = '66000000-0000-0000-0000-000000000066'),
  0::bigint,
  'a suspended membership is not offered either — only the join would miss this one'
);

select * from finish();
rollback;
