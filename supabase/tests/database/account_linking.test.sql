-- v1.4-17 — Hesap bağlama (`issue_account_link_code`, `link_accounts`,
-- `current_user_shares_person`) ve kişi kaydı (`people`).
--
-- Bu dilimin sınadığı şey bir liste ya da bir sayı değil, bir **yetki**:
-- bağlanan hesaba geçiş düğmesiyle **girilir**. Yani yanlış kurulan bir bağ,
-- bir veri hatası değil bir hesap ele geçirmesidir.
--
-- Bu yüzden iddiaların çoğu olumsuz — bir şeyin OLMADIĞINI sınıyor:
--
--   Kodun kendisi:
--     1. Kod üretiliyor ve tabloda HAM hâli yok, yalnız hash''i var.
--     2. ⛔ Üyeliği olmayan hesap kod üretemiyor.
--     3. ⛔ Yeni kod üretmek eskisini KULLANILAMAZ yapıyor (bilinmeyen bir
--        sır açık kalmaz).
--
--   Bağlamanın reddettikleri:
--     4. ⛔ Kendi kodunu kendi tüketemiyor.
--     5. ⛔ Geçici şifresini değiştirmemiş hesap bağlanamıyor.
--     6. ⛔ Bilinmeyen kod reddediliyor.
--     7. ⛔ Süresi dolmuş kod reddediliyor.
--     8. ⛔ Tüketilmiş kod ikinci kez kullanılamıyor.
--     9. ⛔ Zaten BAŞKA bir kişiye bağlı hesap için kayıtlar birleşmiyor.
--
--   Bağın kendisi:
--    10. Bağlanan iki hesabın kişi kaydı aynı ve NULL değil.
--    11. İz, ilgili kuruma yazılıyor.
--
--   Bağın açtığı görüş alanı — ve açmadıkları:
--    12. ⛔ `authenticated` `profiles.person_id`''ye YAZAMIYOR.
--    13. Bağlı hesabın profili görünüyor.
--    14. ⛔ Bağlı OLMAYAN hesabın profili görünmüyor.
--    15. ⛔ Başkasının kişi kaydı `people`''da görünmüyor.
--    16. ⛔ Kişi kaydı OLMAYAN iki hesap birbirini göremiyor — bugün
--        üretimdeki herkesin durumu.
--
-- On ikincisi hepsinin en önemlisi. `profiles_update_self` hesabın sahibine
-- UPDATE veriyor; `person_id` yazılabilir olsaydı kullanıcı kendi kişi
-- kaydını başkasınınkiyle eşitler ve o hesaba **girerdi**. Bugün bunu
-- engelleyen şey `profiles` yetkilerinin tablo geneli değil **sütun bazlı**
-- olması — yani bir tesadüf değil ama yazılı da değildi. Artık sabitlendi.

begin;

create extension if not exists pgtap with schema extensions;
select plan(18);

-- Kod değerlerini iddialara taşıyacak geçici tablo. Rol değiştirmeden önce
-- kuruluyor; `authenticated` de yazabilsin diye yetki veriliyor.
create temporary table kodlar (ad text primary key, deger text);
grant all on kodlar to authenticated;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('41000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'baglama-a@example.test', '', now(), now()),
  ('42000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'baglama-b@example.test', '', now(), now()),
  ('43000000-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'baglama-c@example.test', '', now(), now()),
  ('44000000-0000-0000-0000-000000000044', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'baglama-kilitli@example.test', '', now(), now()),
  ('45000000-0000-0000-0000-000000000045', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'baglama-uyeliksiz@example.test', '', now(), now()),
  ('46000000-0000-0000-0000-000000000046', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'baglama-f@example.test', '', now(), now());

insert into public.organizations (id, name, slug, code)
values ('4a000000-0000-0000-0000-00000000004a', 'Bağlama Kurumu', 'baglama-kurumu-v1417', 7617);

insert into public.branches (id, organization_id, name, is_default)
values ('4b000000-0000-0000-0000-00000000004b', '4a000000-0000-0000-0000-00000000004a', 'Merkez', true);

-- Beş üyelik. `45…` BİLEREK üyeliksiz: kod üretemediğini sınıyoruz.
insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('4c100000-0000-0000-0000-0000000c1001', '4a000000-0000-0000-0000-00000000004a',
   '4b000000-0000-0000-0000-00000000004b', '41000000-0000-0000-0000-000000000041', 'teacher', 'active', 4101),
  ('4c200000-0000-0000-0000-0000000c2002', '4a000000-0000-0000-0000-00000000004a',
   '4b000000-0000-0000-0000-00000000004b', '42000000-0000-0000-0000-000000000042', 'parent', 'active', 4102),
  ('4c300000-0000-0000-0000-0000000c3003', '4a000000-0000-0000-0000-00000000004a',
   '4b000000-0000-0000-0000-00000000004b', '43000000-0000-0000-0000-000000000043', 'teacher', 'active', 4103),
  ('4c400000-0000-0000-0000-0000000c4004', '4a000000-0000-0000-0000-00000000004a',
   '4b000000-0000-0000-0000-00000000004b', '44000000-0000-0000-0000-000000000044', 'parent', 'active', 4104),
  ('4c600000-0000-0000-0000-0000000c6006', '4a000000-0000-0000-0000-00000000004a',
   '4b000000-0000-0000-0000-00000000004b', '46000000-0000-0000-0000-000000000046', 'parent', 'active', 4106);

-- Kilitli hesap: geçici şifresini henüz değiştirmemiş.
update public.profiles
   set must_change_password = true
 where id = '44000000-0000-0000-0000-000000000044';

-- Süresi dolmuş bir kod doğrudan yazılıyor: `issue_account_link_code` her
-- zaman 10 dakikalık kod üretiyor, geçmişe tarihli bir kodu ancak böyle
-- kurabiliriz.
insert into public.account_link_codes (code_hash, issuer_user_id, expires_at)
values (
  encode(sha256(convert_to('SURESIDOLMUS', 'utf8')), 'hex'),
  '43000000-0000-0000-0000-000000000043',
  now() - interval '1 minute'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

-- ===========================================================================
-- Kodun üretilmesi
-- ===========================================================================

select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000041', true);

insert into kodlar (ad, deger) values ('A1', public.issue_account_link_code());

-- 1 · Kod üretildi ve tabloda HAM hâli yok; yalnız hash'i var.
-- ⚠️ Okuma yükseltilmiş rolle yapılıyor ve sebebi tasarımın kendisi:
-- `account_link_codes`'un RLS'i açık ve **hiçbir politikası yok**, yani
-- `authenticated` bu tabloyu göremiyor. İlk yazımda iddia `authenticated`
-- olarak okuyordu ve `0/0` gördü — yani "hash de yok" diyordu. Testin
-- yanlış yerden bakması, korumanın yokluğu gibi görünüyordu.
set local role postgres;

select is(
  (select count(*) from public.account_link_codes as kod
    where kod.code_hash = (select deger from kodlar where ad = 'A1'))
  || '/' ||
  (select count(*) from public.account_link_codes as kod
    where kod.code_hash = encode(
      sha256(convert_to((select deger from kodlar where ad = 'A1'), 'utf8')), 'hex')),
  '0/1',
  'the raw code is nowhere in the table — only its hash is stored'
);

set local role authenticated;

-- 2 · ⛔ Üyeliği olmayan hesap kod üretemiyor.
select set_config('request.jwt.claim.sub', '45000000-0000-0000-0000-000000000045', true);

select throws_ok(
  'select public.issue_account_link_code()',
  'ORB03',
  null,
  'an account with no active membership cannot issue a link code'
);

-- 3 · ⛔ Yeni kod üretmek eskisini siler.
select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000041', true);

insert into kodlar (ad, deger) values ('A2', public.issue_account_link_code());

-- Eski kodun durumunu tabloda saymak yerine **davranışını** sınıyoruz: A1
-- artık kabul ediliyor mu? İlk yazımda iddia satır sayıyordu ve o hâliyle
-- yalnız "silindi"yi doğrulayabilirdi; oysa önemli olan kodun çalışmaması.
select set_config('request.jwt.claim.sub', '42000000-0000-0000-0000-000000000042', true);

select throws_ok(
  format('select public.link_accounts(%L)', (select deger from kodlar where ad = 'A1')),
  'ORB03',
  null,
  'issuing a new code kills the previous one — no secret stays alive unseen'
);

select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000041', true);

-- ===========================================================================
-- Bağlamanın reddettikleri
-- ===========================================================================

-- 4 · ⛔ Kendi kodunu kendi tüketemiyor.
select throws_ok(
  format('select public.link_accounts(%L)', (select deger from kodlar where ad = 'A2')),
  'ORB03',
  null,
  'an account cannot link to itself'
);

-- 5 · ⛔ Geçici şifresini değiştirmemiş hesap bağlanamıyor.
select set_config('request.jwt.claim.sub', '44000000-0000-0000-0000-000000000044', true);

select throws_ok(
  format('select public.link_accounts(%L)', (select deger from kodlar where ad = 'A2')),
  'ORB03',
  null,
  'an account still holding its temporary password cannot be linked'
);

-- 6 · ⛔ Bilinmeyen kod.
select set_config('request.jwt.claim.sub', '42000000-0000-0000-0000-000000000042', true);

select throws_ok(
  'select public.link_accounts(''BOYLEBIRKOD'')',
  'ORB03',
  null,
  'an unknown code is refused'
);

-- 7 · ⛔ Süresi dolmuş kod.
select throws_ok(
  'select public.link_accounts(''SURESIDOLMUS'')',
  'ORB03',
  null,
  'an expired code is refused'
);

-- ===========================================================================
-- Bağın kurulması
-- ===========================================================================

select lives_ok(
  format('select public.link_accounts(%L)', (select deger from kodlar where ad = 'A2')),
  'a valid code links the two accounts'
);

-- 8 · Bağlanan iki hesabın kişi kaydı aynı ve NULL değil.
select set_config('request.jwt.claim.sub', null, true);
set local role postgres;

select is(
  (select case
            when a.person_id is not null and a.person_id = b.person_id
            then 'ayni' else 'farkli' end
     from public.profiles as a, public.profiles as b
    where a.id = '41000000-0000-0000-0000-000000000041'
      and b.id = '42000000-0000-0000-0000-000000000042'),
  'ayni',
  'both accounts now point at the same person record'
);

-- 9 · İz ilgili kuruma yazıldı.
select is(
  (select count(*) from public.audit_events as iz
    where iz.action = 'person.accounts_linked'
      and iz.organization_id = '4a000000-0000-0000-0000-00000000004a'),
  1::bigint,
  'linking leaves a trace in the organization both accounts belong to'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

-- 10 · ⛔ Tüketilmiş kod ikinci kez kullanılamıyor.
select set_config('request.jwt.claim.sub', '43000000-0000-0000-0000-000000000043', true);

select throws_ok(
  format('select public.link_accounts(%L)', (select deger from kodlar where ad = 'A2')),
  'ORB03',
  null,
  'a consumed code cannot be used a second time'
);

-- 11 · ⛔ Zaten başka bir kişiye bağlı hesap birleştirilmiyor.
--      Önce C ile F kendi aralarında bağlanıyor (ikinci kişi kaydı), sonra C
--      A'nın kişisine katılmayı deniyor.
insert into kodlar (ad, deger) values ('C1', public.issue_account_link_code());

select set_config('request.jwt.claim.sub', '46000000-0000-0000-0000-000000000046', true);
select lives_ok(
  format('select public.link_accounts(%L)', (select deger from kodlar where ad = 'C1')),
  'a second, independent person record can be created'
);

select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000041', true);
insert into kodlar (ad, deger) values ('A3', public.issue_account_link_code());

select set_config('request.jwt.claim.sub', '46000000-0000-0000-0000-000000000046', true);
select throws_ok(
  format('select public.link_accounts(%L)', (select deger from kodlar where ad = 'A3')),
  'ORB04',
  null,
  'an account already belonging to another person is not merged'
);

-- ===========================================================================
-- Bağın açtığı görüş alanı — ve açmadıkları
-- ===========================================================================

-- 12 · ⛔ `authenticated` `profiles.person_id`'ye YAZAMIYOR.
--      Bu dilimin en önemli iddiası: yazabilseydi kullanıcı kendi kişi
--      kaydını başkasınınkiyle eşitler ve o hesaba GİRERDİ.
select is(
  (select count(*)
     from information_schema.role_column_grants
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'person_id'
      and grantee = 'authenticated'
      and privilege_type in ('UPDATE', 'INSERT')),
  0::bigint,
  'authenticated can never write profiles.person_id — the switch would follow it'
);

-- 13 · Bağlı hesabın profili görünüyor.
select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000041', true);

select is(
  (select count(*) from public.profiles as p
    where p.id = '42000000-0000-0000-0000-000000000042'),
  1::bigint,
  'a linked sibling account is readable — the switch needs its name'
);

-- 14 · ⛔ Bağlı OLMAYAN hesabın profili görünmüyor.
select is(
  (select count(*) from public.profiles as p
    where p.id = '43000000-0000-0000-0000-000000000043'),
  0::bigint,
  'an unlinked account stays invisible — the new read path is narrow'
);

-- 15 · ⛔ Başkasının kişi kaydı `people`'da görünmüyor.
select is(
  (select count(*) from public.people),
  1::bigint,
  'a person sees exactly one person record: their own'
);

-- 18 · ⛔ Kişi kaydı OLMAYAN iki hesap birbirini göremiyor.
--      Bugün üretimdeki herkesin durumu bu (`person_id` her satırda NULL) ve
--      gövdedeki `is not null` koşulu kaldırıldığında hiçbir test kırmızıya
--      dönmemişti. Koruma artık burada duruyor.
select set_config('request.jwt.claim.sub', '44000000-0000-0000-0000-000000000044', true);

select is(
  (select count(*) from public.profiles as p
    where p.id = '45000000-0000-0000-0000-000000000045')
  || '/' ||
  (select public.current_user_shares_person(
     '45000000-0000-0000-0000-000000000045')::text),
  '0/false',
  'two accounts that belong to no person cannot see each other'
);

select * from finish();
rollback;
