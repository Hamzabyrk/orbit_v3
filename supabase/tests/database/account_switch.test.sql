-- v1.4-17 — Hesaplar arası geçişin güvenlik kararı
-- (`internal_begin_account_switch`).
--
-- Bu fonksiyonun döndürdüğü şey bir e-posta adresi gibi görünüyor ama
-- gerçekte **başka bir hesabın oturumunu açma izni**: Edge Function o adresle
-- tek kullanımlık bir jeton üretip oturuma çeviriyor. Yanlış bir "evet", veli
-- hesabının yönetici paneline girmesi demek.
--
-- Kural neden burada, Edge Function'da değil: `service_role` RLS'i baypas
-- ediyor, dolayısıyla o sınır **hiçbir politikadan geçmiyor**. Politikadan
-- geçmeyen bir sınırın tek sınanabilir hâli SQL'dir (ev kuralı, v1.4-07).
--
-- Altı iddianın beşi olumsuz:
--
--   1. Bağlı iki hesapta hedefin giriş adresi dönüyor.
--   2. ⛔ Bağlı OLMAYAN hesap reddediliyor — asıl kapı.
--   3. ⛔ Kendine geçiş reddediliyor.
--   4. ⛔ Aktif üyeliği olmayan hedef reddediliyor.
--   5. ⛔ Geçici şifresini değiştirmemiş ÇAĞIRAN reddediliyor.
--   6. ⛔ `authenticated` bu fonksiyonu hiç çağıramıyor.
--
-- Beşincisi ilk bakışta fazladan görünebilir: kilitli hesap zaten hiçbir şey
-- okuyamıyor (politikaların tamamı `current_user_must_change_password` ile
-- kapalı). Ama oturum açmak o politikaların **etrafından dolaşmak** olurdu —
-- yeni oturum başka bir kimliğin ve o kimlik kilitli değil.
--
-- Ve iz: "bu hesaba kim, ne zaman girdi" hedefin kurumunun sorusudur.

begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('51000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '76010001@orbit.invalid', '', now(), now()),
  ('52000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '76010002@orbit.invalid', '', now(), now()),
  ('53000000-0000-0000-0000-000000000053', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '76010003@orbit.invalid', '', now(), now()),
  ('54000000-0000-0000-0000-000000000054', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '76010004@orbit.invalid', '', now(), now());

insert into public.organizations (id, name, slug, code)
values ('5a000000-0000-0000-0000-00000000005a', 'Geçiş Kurumu', 'gecis-kurumu-v1417', 7618);

insert into public.branches (id, organization_id, name, is_default)
values ('5b000000-0000-0000-0000-00000000005b', '5a000000-0000-0000-0000-00000000005a', 'Merkez', true);

-- `54…` BİLEREK üyeliksiz: geçilecek paneli olmayan hedef reddediliyor.
insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('5c100000-0000-0000-0000-0000000c1001', '5a000000-0000-0000-0000-00000000005a',
   '5b000000-0000-0000-0000-00000000005b', '51000000-0000-0000-0000-000000000051', 'teacher', 'active', 5101),
  ('5c200000-0000-0000-0000-0000000c2002', '5a000000-0000-0000-0000-00000000005a',
   '5b000000-0000-0000-0000-00000000005b', '52000000-0000-0000-0000-000000000052', 'parent', 'active', 5102),
  ('5c300000-0000-0000-0000-0000000c3003', '5a000000-0000-0000-0000-00000000005a',
   '5b000000-0000-0000-0000-00000000005b', '53000000-0000-0000-0000-000000000053', 'parent', 'active', 5103);

-- İki hesap aynı kişiye bağlanıyor. Bağın nasıl kurulduğu bu testin konusu
-- değil (o `account_linking.test.sql`'de); burada bağın NE AÇTIĞI sınanıyor.
insert into public.people (id) values ('5d000000-0000-0000-0000-00000000005d');

update public.profiles
   set person_id = '5d000000-0000-0000-0000-00000000005d'
 where id in (
   '51000000-0000-0000-0000-000000000051',
   '52000000-0000-0000-0000-000000000052'
 );

-- Dördüncü hesap da aynı kişiye bağlı ama üyeliği yok.
update public.profiles
   set person_id = '5d000000-0000-0000-0000-00000000005d'
 where id = '54000000-0000-0000-0000-000000000054';

-- 1 · Bağlı iki hesapta hedefin giriş adresi dönüyor.
select is(
  public.internal_begin_account_switch(
    '51000000-0000-0000-0000-000000000051',
    '52000000-0000-0000-0000-000000000052'
  ),
  '76010002@orbit.invalid',
  'a linked account hands back the target login address'
);

-- 2 · İz hedefin kurumuna yazıldı.
select is(
  (select count(*) from public.audit_events as iz
    where iz.action = 'person.account_switched'
      and iz.entity_id = '52000000-0000-0000-0000-000000000052'
      and iz.actor_user_id = '51000000-0000-0000-0000-000000000051'
      and iz.organization_id = '5a000000-0000-0000-0000-00000000005a'),
  1::bigint,
  'the switch leaves a trace in the target account''s organization'
);

-- 3 · ⛔ Bağlı OLMAYAN hesap reddediliyor. **Asıl kapı.**
select throws_ok(
  $sql$select public.internal_begin_account_switch(
    '51000000-0000-0000-0000-000000000051',
    '53000000-0000-0000-0000-000000000053'
  )$sql$,
  '42501',
  null,
  'an account that belongs to another person cannot be entered'
);

-- 4 · ⛔ Kendine geçiş reddediliyor.
select throws_ok(
  $sql$select public.internal_begin_account_switch(
    '51000000-0000-0000-0000-000000000051',
    '51000000-0000-0000-0000-000000000051'
  )$sql$,
  '42501',
  null,
  'switching to the same account is refused, not silently accepted'
);

-- 5 · ⛔ Aktif üyeliği olmayan hedef reddediliyor — bağlı olsa bile.
select throws_ok(
  $sql$select public.internal_begin_account_switch(
    '51000000-0000-0000-0000-000000000051',
    '54000000-0000-0000-0000-000000000054'
  )$sql$,
  '42501',
  null,
  'a linked account with no active membership has no panel to enter'
);

-- 6 · ⛔ Geçici şifresini değiştirmemiş çağıran reddediliyor.
update public.profiles
   set must_change_password = true
 where id = '51000000-0000-0000-0000-000000000051';

select throws_ok(
  $sql$select public.internal_begin_account_switch(
    '51000000-0000-0000-0000-000000000051',
    '52000000-0000-0000-0000-000000000052'
  )$sql$,
  '42501',
  null,
  'a caller still holding its temporary password cannot open another session'
);

-- 7 · ⛔ `authenticated` bu fonksiyonu hiç çağıramıyor.
select is(
  (select has_function_privilege(
     'authenticated',
     'public.internal_begin_account_switch(uuid, uuid)',
     'execute'
   )),
  false,
  'authenticated can never call the switch decision directly'
);

select * from finish();
rollback;
