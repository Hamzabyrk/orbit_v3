-- v1.4 kapanış taraması — "başkası adımı değiştiremez" iddiasının zinciri.
--
-- v1.4-14, `profiles` için denetim izini **v1.4-17'ye erteledi** (K-12) ve
-- gerekçesini `every_write_leaves_a_trace.test.sql`'e yazdı. v1.4-17 geldiğinde
-- karar "evet, iz bıraksın" oldu — ama kapanış taramasında ölçüldü ki
-- **yazılacak bir iz yok**, çünkü izlenecek olay olamıyor.
--
-- Zincir üç ölçüme dayanıyor (2026-09-14):
--
--   1. `profiles`'a yazan YALNIZ ÜÇ fonksiyon var, üçü de `security definer`
--      ve hiçbiri `authenticated`'a açık değil.
--   2. `profiles_update_self` yalnız hesabın KENDİ sahibine UPDATE veriyor.
--   3. `internal_create_membership` üyeliği OLAN kullanıcıyı reddediyor — ve
--      guard `status` SÜZMÜYOR, yani askıya alınmış üyelik de engelliyor.
--      `internal_remove_member` de satırı silmiyor, `suspended` yapıyor.
--
-- Üçü birlikte şunu söylüyor: yerleşmiş bir hesabın adını **başkası
-- değiştiremez**. Geriye kalan tek yazma yolu kişinin kendisidir ve "adımı kim
-- değiştirdi" sorusunun cevabı her zaman "sen"dir.
--
-- ⚠️ **Bu test o gerekçenin kendisidir.** Zincirin üç halkasından biri
-- kırılırsa — guard'a `status = 'active'` eklenirse, kaldırma satırı silmeye
-- dönerse, ya da `profiles`'a yazan dördüncü bir fonksiyon eklenirse — sonuç
-- sessizce yanlış olur. Bir yorum bunu söyleyemez; kırmızıya dönen bir iddia
-- söyler (**K-24**: gerekçe kapıya taşınır).

begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('71000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '77010001@orbit.invalid', '', now(), now()),
  ('72000000-0000-0000-0000-000000000072', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '77010002@orbit.invalid', '', now(), now()),
  ('73000000-0000-0000-0000-000000000073', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '77010003@orbit.invalid', '', now(), now());

insert into public.organizations (id, name, slug, code)
values ('7a000000-0000-0000-0000-00000000007a', 'Tarama Kurumu', 'tarama-kurumu-v14', 7701);

insert into public.branches (id, organization_id, name, is_default)
values ('7b000000-0000-0000-0000-00000000007b', '7a000000-0000-0000-0000-00000000007a', 'Merkez', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  -- Yönetici: çağıran.
  ('7c100000-0000-0000-0000-0000000c1001', '7a000000-0000-0000-0000-00000000007a',
   '7b000000-0000-0000-0000-00000000007b', '71000000-0000-0000-0000-000000000071', 'admin', 'active', 7101),
  -- Aktif üyeliği olan öğretmen.
  ('7c200000-0000-0000-0000-0000000c2002', '7a000000-0000-0000-0000-00000000007a',
   '7b000000-0000-0000-0000-00000000007b', '72000000-0000-0000-0000-000000000072', 'teacher', 'active', 7102),
  -- ASKIYA ALINMIŞ üyelik. Zincirin en kırılgan halkası burada sınanıyor.
  ('7c300000-0000-0000-0000-0000000c3003', '7a000000-0000-0000-0000-00000000007a',
   '7b000000-0000-0000-0000-00000000007b', '73000000-0000-0000-0000-000000000073', 'parent', 'suspended', 7103);

-- 1 · ⛔ Aktif üyeliği olan kullanıcıya ikinci üyelik açılamıyor.
select throws_ok(
  $sql$select public.internal_create_membership(
    '71000000-0000-0000-0000-000000000071',
    '72000000-0000-0000-0000-000000000072',
    '7a000000-0000-0000-0000-00000000007a',
    '7b000000-0000-0000-0000-00000000007b',
    7104,
    'parent'::public.app_role,
    'Başka Bir Ad',
    '77017104',
    null
  )$sql$,
  '42501',
  null,
  'an account with an active membership cannot be renamed through membership creation'
);

-- 2 · ⛔ ASKIYA ALINMIŞ üyeliği olan kullanıcı da reddediliyor.
--     Guard `status` süzmüyor ve bu bir tercih: süzseydi, kurumdan çıkarılmış
--     bir kişinin adı başka bir kurumun yöneticisi tarafından değiştirilebilir
--     ve o kişi şifre değiştirmeye zorlanabilirdi.
select throws_ok(
  $sql$select public.internal_create_membership(
    '71000000-0000-0000-0000-000000000071',
    '73000000-0000-0000-0000-000000000073',
    '7a000000-0000-0000-0000-00000000007a',
    '7b000000-0000-0000-0000-00000000007b',
    7105,
    'parent'::public.app_role,
    'Başka Bir Ad',
    '77017105',
    null
  )$sql$,
  '42501',
  null,
  'a suspended membership still blocks it — the guard deliberately does not filter status'
);

-- 3 · Kurumdan çıkarma satırı SİLMİYOR, askıya alıyor.
--     Silseydi 2. iddianın koruduğu şey kendiliğinden ortadan kalkardı.
select public.internal_remove_member(
  '71000000-0000-0000-0000-000000000071',
  '7c200000-0000-0000-0000-0000000c2002'
);

select is(
  (select uyelik.status::text
     from public.organization_memberships as uyelik
    where uyelik.id = '7c200000-0000-0000-0000-0000000c2002'),
  'suspended',
  'removing a member suspends the row instead of deleting it — the block survives'
);

-- 4 · `profiles` üzerinde `authenticated`'ın yazabildiği sütunlar tam olarak üç.
--     Dördüncüsü sessizce açılırsa zincir kırılır.
select is(
  (select string_agg(distinct y.column_name, ',' order by y.column_name)
     from information_schema.role_column_grants as y
    where y.table_schema = 'public'
      and y.table_name = 'profiles'
      and y.grantee = 'authenticated'
      and y.privilege_type = 'UPDATE'),
  'avatar_url,display_name,phone',
  'the owner can write exactly three profile columns — nothing was widened quietly'
);

-- 5 · `display_name` YAZAN fonksiyon sayısı İKİ ve ikisi de `authenticated`'a
--     kapalı. Üçüncüsü eklenirse "başkası adımı değiştiremez" iddiası yeniden
--     ölçülmeli.
--
-- ⚠️ İddia önce "`profiles`'a yazan üç fonksiyon var" diye yazılmıştı ve **bu
-- test onu kırmızıya döndürdü**: dört tane çıktı ve biri `authenticated`'a
-- açıktı. Gerekçem bir dilim eskimişti — `link_accounts` (#300) `profiles`'a
-- yazıyor, ama yalnız `person_id`'ye. Yani zincir ayaktaydı, **ölçütüm fazla
-- kabaydı**: konu "profiles'a kim yazıyor" değil, "**adı** kim yazıyor".
--
-- Kayda değer olan şu: gerekçe bir yorum olarak kalsaydı bu fark hiç
-- görünmeyecekti. Kapıya taşındığı için ilk koşuşunda çıktı.
select is(
  (select count(*) || '/' || count(*) filter (
            where has_function_privilege('authenticated', p.oid, 'execute'))
     from pg_proc as p
     join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.prosrc ~* '(insert into public\.profiles|update public\.profiles)'
      and p.prosrc ~* 'display_name'),
  '2/0',
  'exactly two functions write display_name and neither is callable by authenticated'
);

select * from finish();
rollback;
