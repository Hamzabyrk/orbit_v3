-- v1.5-18 · 2/3 (#312) — Reddedilen denetim okumasının sınırları.
--
-- Bu dosya iki farklı şeyi sınıyor ve ikisinin de sebebi yazılı:
--
--   1. DAVRANIŞ — politika yeniden yazıldı, görünürlük değişMEDİ. Özellikle
--      **şube kapsamı**: bir şubeye bağlanmış admin yalnız o şubenin (ve
--      şubesiz) denetim satırlarını görüyor. Kurum düzeyi dizi o sınırı
--      taşımıyor, `current_user_has_membership` taşıyor.
--
--   2. YAPI — eklenen kurum düzeyi ön süzgeç **mantıksal olarak gereksizdir**
--      (`has_membership` doğruysa kurum zaten dizide). Yani kaldırıldığında
--      hiçbir davranışsal iddia kırılmaz, yalnız reddedilen okuma tekrar
--      ~1 saniyeye çıkar. Davranışla pinlenemeyen bir değişikliği pinlemenin
--      tek yolu şemaya bakmaktır; son iddia bunu yapıyor.
--
--      ⚠️ Bu bir "kapının kendisini sınamak" vakasıdır (K-23). Emsal:
--      `calendarDayHasOneSource` üç gerçek ihlalde yeşil kalmıştı. Burada
--      davranışsal kapı **kurulamıyor** ve bu dosya bunu saklamıyor.

begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('d1000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'red-kurum-yonetici@example.test', '', now(), now()),
  ('d2000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'red-sube-yonetici@example.test', '', now(), now()),
  ('d3000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'red-ogretmen@example.test', '', now(), now()),
  ('d4000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'red-komsu-yonetici@example.test', '', now(), now()),
  ('d5000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'red-askiya-alinmis@example.test', '', now(), now());

insert into public.organizations (id, name, slug, code)
values
  ('da000000-0000-0000-0000-0000000000da', 'Red Dershanesi', 'red-dershanesi', 7601),
  ('db000000-0000-0000-0000-0000000000db', 'Red Komşusu', 'red-komsusu', 7602);

insert into public.branches (id, organization_id, name, is_default)
values
  ('e1000000-0000-0000-0000-0000000000e1', 'da000000-0000-0000-0000-0000000000da', 'Merkez', true),
  ('e2000000-0000-0000-0000-0000000000e2', 'da000000-0000-0000-0000-0000000000da', 'İkinci Şube', false);

insert into public.organization_memberships (id, organization_id, branch_id, user_id, role, status)
values
  -- Kurum geneli yönetici: şubesi yok
  ('f1000000-0000-0000-0000-0000000000f1', 'da000000-0000-0000-0000-0000000000da',
   null, 'd1000000-0000-0000-0000-0000000000d1', 'admin', 'active'),
  -- 🔴 ŞUBEYE BAĞLI yönetici: yalnız Merkez'i görmeli
  ('f2000000-0000-0000-0000-0000000000f2', 'da000000-0000-0000-0000-0000000000da',
   'e1000000-0000-0000-0000-0000000000e1', 'd2000000-0000-0000-0000-0000000000d2', 'admin', 'active'),
  ('f3000000-0000-0000-0000-0000000000f3', 'da000000-0000-0000-0000-0000000000da',
   null, 'd3000000-0000-0000-0000-0000000000d3', 'teacher', 'active'),
  ('f4000000-0000-0000-0000-0000000000f4', 'db000000-0000-0000-0000-0000000000db',
   null, 'd4000000-0000-0000-0000-0000000000d4', 'admin', 'active'),
  -- Askıya alınmış yönetici: dizi `active` istediği için hiçbir şey görmemeli
  ('f5000000-0000-0000-0000-0000000000f5', 'da000000-0000-0000-0000-0000000000da',
   null, 'd5000000-0000-0000-0000-0000000000d5', 'admin', 'suspended');

-- Denetim satırları: biri şubesiz, biri Merkez, biri İkinci Şube, biri komşuda.
--
-- ⚠️ `entity_type = 'red_testi'` ayırt edici olarak konuyor ve aşağıdaki
-- sayımların hepsi ona süzülüyor. Sebebi ölçüldü: yukarıdaki `branches`
-- eklemeleri denetim tetikleyicisini çalıştırıp fazladan `branch.created`
-- satırları yazıyor (şubesiz). `count(*)` kullanılsaydı bu dosya tetikleyici
-- kapsamı her değiştiğinde kırılırdı — kendi kurgusunu ölçmeyen bir test,
-- başkasının izini ölçer.
insert into public.audit_events (organization_id, branch_id, actor_user_id, action, entity_type, metadata)
values
  ('da000000-0000-0000-0000-0000000000da', null,
   'd1000000-0000-0000-0000-0000000000d1', 'organization.update', 'red_testi', '{}'::jsonb),
  ('da000000-0000-0000-0000-0000000000da', 'e1000000-0000-0000-0000-0000000000e1',
   'd1000000-0000-0000-0000-0000000000d1', 'student.create', 'red_testi', '{}'::jsonb),
  ('da000000-0000-0000-0000-0000000000da', 'e2000000-0000-0000-0000-0000000000e2',
   'd1000000-0000-0000-0000-0000000000d1', 'student.create', 'red_testi', '{}'::jsonb),
  ('db000000-0000-0000-0000-0000000000db', null,
   'd4000000-0000-0000-0000-0000000000d4', 'organization.update', 'red_testi', '{}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

-- ===========================================================================
-- Davranış: görünürlük değişmedi
-- ===========================================================================

select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-0000000000d1', true);

-- 1 · Kurum geneli yönetici kendi kurumunun üç satırını görür.
select is(
  (select count(*) from public.audit_events
   where organization_id = 'da000000-0000-0000-0000-0000000000da'
     and entity_type = 'red_testi'),
  3::bigint,
  'an org-wide admin sees every audit row of their own institution'
);

-- 2 · ⛔ Komşu kurumun satırını görmez.
select is(
  (select count(*) from public.audit_events
   where organization_id = 'db000000-0000-0000-0000-0000000000db'
     and entity_type = 'red_testi'),
  0::bigint,
  'an org-wide admin sees nothing from the neighbouring institution'
);

select set_config('request.jwt.claim.sub', 'd2000000-0000-0000-0000-0000000000d2', true);

-- 3 · 🔴 ŞUBE KAPSAMI. Merkez'e bağlı yönetici: şubesiz satır + Merkez satırı
--     = 2. İkinci Şube'nin satırını GÖRMEZ. Bu sınırı kurum düzeyi dizi değil
--     `current_user_has_membership` taşıyor; dizi onun yerine geçseydi burada
--     3 dönerdi ve şube sınırı sessizce kalkmış olurdu.
select is(
  (select count(*) from public.audit_events
   where organization_id = 'da000000-0000-0000-0000-0000000000da'
     and entity_type = 'red_testi'),
  2::bigint,
  'a branch-scoped admin sees only their branch and the branchless rows — the org-level array does not carry branch scope'
);

-- 4 · Aynı yöneticinin görmediği satır gerçekten var (3. madde boş kümeyi
--     doğru saymasın diye).
select is(
  (select count(*) from public.audit_events
   where organization_id = 'da000000-0000-0000-0000-0000000000da'
     and branch_id = 'e2000000-0000-0000-0000-0000000000e2'
     and entity_type = 'red_testi'),
  0::bigint,
  'the row the branch-scoped admin cannot see does exist and stays invisible'
);

select set_config('request.jwt.claim.sub', 'd3000000-0000-0000-0000-0000000000d3', true);

-- 5 · ⛔ Öğretmen kendi kurumunun denetim kaydını görmez.
select is(
  (select count(*) from public.audit_events),
  0::bigint,
  'a teacher sees no audit row at all, not even in their own institution'
);

select set_config('request.jwt.claim.sub', 'd4000000-0000-0000-0000-0000000000d4', true);

-- 6 · ⛔ Komşu kurumun YÖNETİCİSİ de göremez — ölçümdeki pahalı vaka buydu.
select is(
  (select count(*) from public.audit_events
   where organization_id = 'da000000-0000-0000-0000-0000000000da'
     and entity_type = 'red_testi'),
  0::bigint,
  'an admin of a different institution sees nothing — this was the 1.5 second case'
);

-- 7 · Ama kendi kurumunu görür: 2. madde tüm tabloyu kapatmış olmasın.
select is(
  (select count(*) from public.audit_events
   where organization_id = 'db000000-0000-0000-0000-0000000000db'
     and entity_type = 'red_testi'),
  1::bigint,
  'the neighbouring admin still sees their own institution'
);

select set_config('request.jwt.claim.sub', 'd5000000-0000-0000-0000-0000000000d5', true);

-- 8 · ⛔ Askıya alınmış yönetici hiçbir şey görmez (dizi `active` istiyor).
select is(
  (select count(*) from public.audit_events),
  0::bigint,
  'a suspended admin sees nothing — the array requires an active membership'
);

-- ===========================================================================
-- Yapı: davranışla pinlenemeyen değişikliğin tek kapısı
-- ===========================================================================

reset role;

-- 9 · 🔴 Kurum düzeyi ön süzgeç politikada DURUYOR mu.
--
--     Neden davranışsal bir iddia yetmiyor: konjonksiyon mantıksal olarak
--     gereksiz (`has_membership` doğruysa kurum zaten dizide). Kaldırıldığında
--     yukarıdaki sekiz iddianın hiçbiri kırılmaz — yalnız reddedilen okuma
--     0,28 ms'den ~1.500 ms'ye döner ve bunu kimse fark etmez.
--
--     Bu iddia kırıldığında bakılacak yer: migration 20260923000000 ve
--     ROADMAP §4.18'deki ölçüm.
select ok(
  pg_get_expr(polqual, polrelid) like '%current_user_admin_org_ids%',
  'the org-level prefilter is still in the policy — behaviour cannot detect its removal, only this can'
) from pg_policy
where polrelid = 'public.audit_events'::regclass
  and polname = 'audit_events_select_admin';

select * from finish();
rollback;
