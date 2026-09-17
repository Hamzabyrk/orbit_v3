-- Reddedilen okuma, izinli okumadan pahalı olmamalı (v1.5-18 · 2/3, #312).
--
-- =========================================================================
-- Ölçüm
-- =========================================================================
--
-- ROADMAP §4.17, bir dershane-yılı tohumuyla. `audit_events`'ten imleçli bir
-- sayfa (`order by id desc limit 50`), kurum 1000:
--
--     admin (izinli)                     0,98 ms        0 satır atıldı
--     aynı kurumun öğretmeni (red)     971    ms  150.000 satır atıldı
--     başka kurumun öğretmeni (red)    880    ms  150.000 satır atıldı
--
-- Tablodaki tek politika admin'e açık ve satırın `organization_id`'sini
-- **argüman** alıyor. İzinli çağıran ilk 50 satırda duruyor; reddedilen
-- çağıran o kuruma ait tabloyu baştan sona tarayıp her satırda üyelik
-- sorgusu koşuyor.
--
-- 🔴 **Kiracı sınırı tutuyor — sızan veri değil, CPU.** Dönen satır sayısı 0.
-- Ama sistemdeki herhangi bir kimliği doğrulanmış kullanıcı, **başka bir
-- kurumun** denetim tablosuna istek atarak istek başına ~1 s veritabanı CPU'su
-- yakabiliyor. Ve maliyet `audit_events` büyüdükçe artıyor: ölçülen disk
-- faturasının **%59'u** bu tablo.
--
-- =========================================================================
-- ⛔ §4.17'de reddedilen yol — ve o kaydın DÜZELTİLMESİ
-- =========================================================================
--
-- §4.17 politikayı tümüyle InitPlan biçimine çevirmeyi denedi: reddedilen yol
-- 37× ucuzladı ama **izinli yol 13× pahalılaştı** (0,98 → 12,6 ms), çünkü
-- planlayıcı `(organization_id, id desc)` birleşik indeksini bırakıp birincil
-- anahtarı ters taradı. İki yazım biçimi denendi, ikisi de indeksi kaybetti ve
-- o turun sonucu şuydu: _"cevap politika değil RPC"_.
--
-- ✅ **O sonuç fazla kötümserdi ve bu dosya onu düzeltiyor.** Farkı yapan şey
-- konjonksiyonun `has_membership`'in **yerine** mi yoksa **yanına** mı
-- konduğu. §4.17'de yerine konmuştu; o zaman istemcinin kendi açık
-- `organization_id = <sabit>` süzgeci de `Filter`'a düşüyordu. Yanına
-- konduğunda planlayıcı ikisini birleştirip **`Index Cond`** üretiyor:
--
--     Index Cond: ((organization_id = ANY ((InitPlan 1).col1))
--                  AND (organization_id = '…'::uuid))
--
-- Yani reddedilen çağıran için indekste eşleşen giriş yok ve tarama hiç
-- başlamıyor. Ölçülen (aynı tohum, aynı sorgu):
--
--                                    bugün        sonra
--     admin (izinli)                0,98 ms     1,79 ms   (indeks korundu)
--     aynı kurumun öğretmeni      971    ms     0,28 ms   ~3.500×
--     başka kurumun admini      1.503    ms     0,19 ms   ~7.900×
--
-- =========================================================================
-- Neden bu konjonksiyon YETKİYİ DEĞİŞTİRMİYOR
-- =========================================================================
--
--     current_user_admin_org_ids()
--       = { kurum : çağıranın o kurumda AKTİF admin üyeliği var }
--
--     current_user_has_membership(org, branch, ['admin'])
--       = o kurumda aktif admin üyeliği var  VE  şube eşleşiyor
--
-- İkincisi doğruysa birincisi zorunlu olarak doğrudur. Yani yeni konjonksiyon
-- **mantıksal olarak gereksizdir**: hiçbir satırı açmaz, hiçbir satırı
-- kapatmaz. Tek işi planlayıcıya indeksle durabileceğini söylemek.
--
-- 🔴 **`has_membership` KALDIRILAMAZ, çünkü şube kapsamını o taşıyor.**
-- İfadesi: `target_branch_id is null or membership.branch_id is null or
-- membership.branch_id = target_branch_id`. Yani bir şubeye bağlanmış admin,
-- yalnız o şubenin (ve şubesiz) denetim satırlarını görüyor. Dizi kurum
-- düzeyinde çalıştığı için onun yerine geçseydi **şube sınırı sessizce
-- kalkardı** ve bu bir yetki genişlemesi olurdu. Testte karşılığı var.
--
-- ⚠️ **Ve aynı sebeple davranışsal bir test bu değişikliği PİNLEYEMEZ.**
-- Konjonksiyon mantıksal olarak gereksiz olduğu için kaldırıldığında hiçbir
-- iddia kırılmaz — yalnız performans geri gelir. Karşılığı bu yüzden
-- **yapısal** bir kapı: politika metninin diziyi taşıdığı sınanıyor
-- (`refused_read_stays_cheap.test.sql`). K-23 burada davranışla değil şemayla
-- karşılanıyor ve sebebi yazılı.
--
-- =========================================================================
-- Kapsam dışı — aynı turda ölçülen, bu dosyada ÇÖZÜLMEYEN
-- =========================================================================
--
-- Aynı ölçümde daha geniş bir yüzey göründü. Filtre koymadan yapılan
-- reddedilen okumalar (istemci yapmıyor, ama PostgREST herkese açık):
--
--     öğretmen → select count(*) from installments          11.270 ms
--     öğretmen → select count(*) from attendance_records    30 s+ (zaman aşımı)
--     öğretmen → select count(*) from payment_plans             67 ms
--
-- Bunların politikaları kurum düzeyinde DEĞİL (`installments`:
-- `current_user_can_see_payment_plan(plan_id)`), dolayısıyla buradaki dizi
-- hilesi doğrudan uygulanamaz; her tablo kendi üst kümesini gerektirir.
-- Kaydı `ROADMAP` §4.18'e düşüldü, karşılığı ayrı bir dilim. Burada
-- çözülmemesi bilinçli: ölçülen tek tablo düzeltiliyor, gerisi tahmin olurdu.

create or replace function public.current_user_admin_org_ids()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(uyelik.organization_id), '{}'::uuid[])
  from public.organization_memberships as uyelik
  where uyelik.user_id = (select auth.uid())
    and uyelik.status = 'active'
    and uyelik.role = 'admin';
$$;

comment on function public.current_user_admin_org_ids() is
  'Çağıranın AKTİF admin üyeliği olan kurumların kimlikleri. Argüman almaz, bu yüzden `(select …)` ile sarıldığında sorgu başına BİR KEZ hesaplanıyor ve planlayıcı sonucu indeks koşuluna çevirebiliyor. Yetki kararı DEĞİL, yetki kararının kurum düzeyindeki üst kümesi: `current_user_has_membership(org, branch, admin)` doğruysa kurum zorunlu olarak bu dizidedir. Şube kapsamı bu fonksiyonda YOKTUR.';

revoke all on function public.current_user_admin_org_ids() from public, anon;
grant execute on function public.current_user_admin_org_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- Politika: dizi ÖN süzgeç olarak eklenir, `has_membership` yerinde kalır
-- ---------------------------------------------------------------------------
drop policy audit_events_select_admin on public.audit_events;

create policy audit_events_select_admin on public.audit_events
  for select
  to authenticated
  using (
    -- Kurum düzeyi ön süzgeç: InitPlan, sorgu başına bir kez, indekse iner.
    organization_id = any((select public.current_user_admin_org_ids())::uuid[])
    -- Gerçek yetki kararı — şube kapsamı burada. KALDIRILAMAZ.
    and public.current_user_has_membership(
      organization_id, branch_id, array['admin']::public.app_role[]
    )
    and not (select public.current_user_must_change_password())
  );
