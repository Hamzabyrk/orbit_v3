-- v1.5-07 (#319) — Hesap bağının üç sınırı: B1 · B2 · B3.
--
-- B1  Kodu ÜRETEN tarafta da şifre kilidi şartı var mı. Şart yalnız tüketen
--     tarafta olduğu sürece, kâğıt fişteki geçici şifreyi eline geçiren biri
--     o hesabı bağlanmaya açıp kendine KALICI ve SESSİZ bir oturum verebiliyor.
-- B2  Bağ koparılabiliyor mu, ve yalnız KİŞİNİN KENDİSİ tarafından mı.
-- B3  Kilitli bir hesap menüde görünmüyor ve ona geçiş reddediliyor mu.
--
-- Kurgu: tek kurum, aynı kişiye ait ÜÇ hesap (yönetici, öğretmen, kilitli
-- öğrenci) ve bağı olmayan dördüncü bir hesap.

begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('f1100000-0000-0000-0000-00000000f110', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'bag-yonetici@example.test', '', now(), now()),
  ('f1200000-0000-0000-0000-00000000f120', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'bag-ogretmen@example.test', '', now(), now()),
  ('f1300000-0000-0000-0000-00000000f130', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'bag-kilitli@example.test', '', now(), now()),
  ('f1400000-0000-0000-0000-00000000f140', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'bag-bagsiz@example.test', '', now(), now());

insert into public.organizations (id, name, slug, code)
values ('f2000000-0000-0000-0000-00000000f200', 'Bağ Dershanesi', 'bag-dershanesi', 8001);

insert into public.organization_memberships (id, organization_id, user_id, role, status)
values
  ('f3100000-0000-0000-0000-00000000f310', 'f2000000-0000-0000-0000-00000000f200',
   'f1100000-0000-0000-0000-00000000f110', 'admin', 'active'),
  ('f3200000-0000-0000-0000-00000000f320', 'f2000000-0000-0000-0000-00000000f200',
   'f1200000-0000-0000-0000-00000000f120', 'teacher', 'active'),
  ('f3300000-0000-0000-0000-00000000f330', 'f2000000-0000-0000-0000-00000000f200',
   'f1300000-0000-0000-0000-00000000f130', 'student', 'active'),
  ('f3400000-0000-0000-0000-00000000f340', 'f2000000-0000-0000-0000-00000000f200',
   'f1400000-0000-0000-0000-00000000f140', 'teacher', 'active');

-- Üç hesap AYNI kişi kaydına bağlanıyor. Bağ doğrudan kuruluyor: bu dosyanın
-- derdi bağın nasıl kurulduğu değil (onu `link_person_accounts` sınıyor),
-- kurulduktan sonraki üç sınır.
insert into public.people (id) values ('f4000000-0000-0000-0000-00000000f400');

update public.profiles set person_id = 'f4000000-0000-0000-0000-00000000f400'
where id in (
  'f1100000-0000-0000-0000-00000000f110',
  'f1200000-0000-0000-0000-00000000f120',
  'f1300000-0000-0000-0000-00000000f130'
);

-- 🔴 Üçüncü hesap KİLİTLİ: geçici şifresini devralmamış.
update public.profiles set must_change_password = true
where id = 'f1300000-0000-0000-0000-00000000f130';

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

-- ===========================================================================
-- B1 · Kodu üreten tarafta kilit
-- ===========================================================================

select set_config('request.jwt.claim.sub', 'f1300000-0000-0000-0000-00000000f130', true);

-- 1 · 🔴 Saldırının kendisi. Kilitli hesap bağlama kodu ÜRETEMEZ.
--     Bu iddia düşerse: kâğıt fişteki şifreyi eline geçiren biri o hesabı
--     bağlanmaya açar, kodu kendi hesabında tüketir ve `switch-account` ona
--     kalıcı, sessiz bir oturum verir. Şifre sıfırlamaktan farkı: sıfırlama
--     gürültülüdür, üye giriş yapamayınca fark eder.
select throws_ok(
  $sql$select public.issue_account_link_code()$sql$,
  'ORB03',
  null,
  'a locked account cannot issue a link code — this is the silent takeover path (B1)'
);

select set_config('request.jwt.claim.sub', 'f1100000-0000-0000-0000-00000000f110', true);

-- 2 · Kilidi olmayan hesap üretebiliyor: 1. iddia her şeyi kapatmış olmasın.
select lives_ok(
  $sql$select public.issue_account_link_code()$sql$,
  'an unlocked account still issues a link code — the gate is the lock, not the function'
);

-- ===========================================================================
-- B3 · Kilitli hedef: menüde yok, kapıda da yok
-- ===========================================================================

-- 3 · Menü iki hesap gösteriyor (yönetici + öğretmen), kilitli olan YOK.
select is(
  (select string_agg(role::text, ',' order by role::text)
   from public.my_linked_accounts()),
  'admin,teacher',
  'the locked sibling account is filtered out of the switch menu (B3)'
);

-- 4 · Kilitli hesap gerçekten aynı kişiye bağlı — 3. iddia onu "bağlı değil"
--     diye atlamış olmasın.
reset role;
select is(
  (select count(*) from public.profiles
   where person_id = 'f4000000-0000-0000-0000-00000000f400'),
  3::bigint,
  'all three accounts really share one person record, so the filter is about the lock'
);

-- 5 · 🔴 ASIL KAPI. Menü süzgeci görünen kısım; `switch-account` doğrudan
--     çağrılabildiği için kapı fonksiyonda olmak zorunda.
select throws_ok(
  $sql$select public.internal_begin_account_switch(
    'f1100000-0000-0000-0000-00000000f110',
    'f1300000-0000-0000-0000-00000000f130'
  )$sql$,
  '42501',
  null,
  'switching INTO a locked account is refused at the gate, not only hidden in the menu (B3)'
);

-- 6 · Kilitli olmayan kardeşe geçiş çalışıyor.
select lives_ok(
  $sql$select public.internal_begin_account_switch(
    'f1100000-0000-0000-0000-00000000f110',
    'f1200000-0000-0000-0000-00000000f120'
  )$sql$,
  'switching to an unlocked sibling still works'
);

-- 7 · ⚠️ Süresi dolmuş şifre de kilittir. Eskiden yalnız
--     `must_change_password`'e bakılıyordu; o hesap hiçbir şey okuyamadığı
--     hâlde geçiş yapabiliyordu.
update public.profiles
   set must_change_password = false,
       password_expires_at = now() - interval '1 day'
 where id = 'f1200000-0000-0000-0000-00000000f120';

select throws_ok(
  $sql$select public.internal_begin_account_switch(
    'f1100000-0000-0000-0000-00000000f110',
    'f1200000-0000-0000-0000-00000000f120'
  )$sql$,
  '42501',
  null,
  'an expired password is a lock too — the expression is aligned with the helper'
);

update public.profiles set password_expires_at = null
 where id = 'f1200000-0000-0000-0000-00000000f120';

-- ===========================================================================
-- B2 · Bağ koparılabiliyor
-- ===========================================================================

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'f1400000-0000-0000-0000-00000000f140', true);

-- 8 · ⛔ Bağı olmayan hesap koparamaz: yokluğu "başarı" diye dönmek, kullanıcıya
--     olmayan bir şeyi yaptığını söylemek olurdu (K-22).
select throws_ok(
  $sql$select public.unlink_accounts()$sql$,
  'ORB03',
  null,
  'an account with no link cannot sever one — absence is not reported as success'
);

select set_config('request.jwt.claim.sub', 'f1200000-0000-0000-0000-00000000f120', true);

-- 9 · 🔴 B2'nin kendisi. Öğretmen hesabı kendi bağını koparıyor ve geriye kalan
--     bağlı hesap sayısını döndürüyor (yönetici + kilitli öğrenci = 2).
select is(
  (select public.unlink_accounts()),
  2::bigint,
  'the person severs their own link and learns how many accounts remain linked (B2)'
);

reset role;

-- 10 · Koparan hesabın bağı gerçekten çözüldü.
select is(
  (select person_id from public.profiles
   where id = 'f1200000-0000-0000-0000-00000000f120'),
  null::uuid,
  'the caller person_id is now null'
);

-- 11 · ⛔ Ama DİĞER hesaplara dokunulmadı: koparma kişinin kendi bağını
--      koparır, grubu dağıtmaz.
select is(
  (select count(*) from public.profiles
   where person_id = 'f4000000-0000-0000-0000-00000000f400'),
  2::bigint,
  'the other two accounts stay linked — severing is about the caller, not the group'
);

-- 12 · Denetim izi yazıldı ve ETKİLENEN her hesap için bir satır var.
select is(
  (select count(*) from public.audit_events
   where action = 'account_link.severed'),
  3::bigint,
  'one audit row per affected account — every institution sees the event about its own member'
);

-- 13 · İzde koparanın kendisi işaretli.
select is(
  (select metadata ->> 'severed_by_self' from public.audit_events
   where action = 'account_link.severed'
     and entity_id = 'f1200000-0000-0000-0000-00000000f120'),
  'true',
  'the audit row of the caller is marked as severed by self'
);

-- 14 · Menü artık tek hesap gösteriyor, yani hiç çizilmiyor (istemci < 2'de
--      render etmiyor). Kilitli hesap hâlâ süzülü.
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'f1100000-0000-0000-0000-00000000f110', true);

select is(
  (select count(*) from public.my_linked_accounts()),
  1::bigint,
  'the admin now sees only itself — the switch menu disappears'
);

-- ===========================================================================
-- B2 · Grup tek hesaba düştüğünde bağ TAMAMEN çözülür
-- ===========================================================================

-- 15 · Yönetici de koparıyor. Geriye kilitli öğrenci tek başına kalacaktı;
--      yarım kalmış bir grup aynı kişi kaydına yeniden bağlanmanın yolu
--      olurdu, o yüzden bağ tamamen çözülüyor ve 0 dönüyor.
select is(
  (select public.unlink_accounts()),
  0::bigint,
  'when the group would drop to one account the link dissolves entirely — a half link is a way back in'
);

reset role;

-- 16 · Hiçbir hesap o kişi kaydına bağlı değil.
select is(
  (select count(*) from public.profiles
   where person_id = 'f4000000-0000-0000-0000-00000000f400'),
  0::bigint,
  'no account points at the person record any more'
);

-- 17 · ⚠️ `people` satırı DURUYOR ve bu bilinçli. İlk yazımda siliniyordu;
--      **Yıkıcı Migration Kontrolü** o `delete`'i yakaladı ve kaçış yolu
--      kullanılmadı çünkü silmeye gerek yoktu: güvenlik özelliği "o kişi
--      kaydına bağlı hesap kalmaması" ve onu 16. iddia ölçüyor. Sahipsiz
--      satır opak bir kimlikten başka bir şey taşımıyor ve kimse ona
--      bakmıyor — `my_linked_accounts` da geçiş kapısı da `person_id`
--      üzerinden çalışıyor.
--
--      Bu iddia o kararın kaydı: satır silinmeye başlarsa burası düşer ve
--      soran kişi gerekçeyi bulur.
select is(
  (select count(*) from public.people
   where id = 'f4000000-0000-0000-0000-00000000f400'),
  1::bigint,
  'the orphaned person row is deliberately left behind — severing the link is the security property, deleting the row is not'
);

select * from finish();
rollback;
