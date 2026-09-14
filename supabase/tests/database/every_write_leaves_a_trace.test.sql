-- v1.4-14 — Yazılabilir her tablo iz bırakır (#292).
--
-- 🔴 **Bu kural on iki dilim boyunca ELLE hatırlandı.**
--
-- §4'ün "v1.4'ün her CRUD dilimi izini `audit_row_change` ile bırakır" cümlesi
-- doğru uygulandı — ama her seferinde biri hatırladığı için. İki kez
-- hatırlanmadı ve ikisi de sonradan yakalandı:
--
--   `class_teachers` ve `schedule_entries` .... v1.4 ara denetiminde (2026-09-13)
--   `subjects` ................................ v1.4-11'de, ara denetim ONLARI
--                                               düzeltirken bunu atlamıştı
--
-- K-24: bir kural iki kez elle yakalandıysa kapıya taşınır. Bu dosya o kapı.
--
-- =========================================================================
-- Kapsam (K-19) ve istisnalar
-- =========================================================================
--
-- "Yazılabilir" = `authenticated` rolünün INSERT veya UPDATE **sütun yetkisi**
-- taşıdığı `public` tablosu. Yetkiyi tablo değil **sütun** düzeyinde sormak
-- zorunlu: bu depo yetkileri sütun bazında veriyor ve
-- `information_schema.role_table_grants` onları göstermiyor (v1.4-11'de bu
-- ölçümü yanlış yapıp neredeyse "politikalar ölü" diye yazacaktım).
--
-- Üç istisna var ve üçü de **karar**, ihmal değil:
--
--   `tasks`, `calendar_events` → Kişisel kayıt. `audit_events` kurum
--     yöneticisine açık; iz düşmek RLS'in bilerek sakladığını deftere taşırdı
--     (v1.4-13 kararı, `personal_records_stay_personal.test.sql`).
--
--   `profiles` → **v1.4 kapanış taramasında (2026-09-14) ölçülerek kapandı.**
--     v1.4-14 bunu v1.4-17'ye ertelemişti (K-12) ve v1.4-17'de karar "evet, iz
--     bıraksın" oldu. Ama tarama şunu gösterdi: **izlenecek olay yok.**
--
--     `display_name`'i yazan yalnız iki fonksiyon var ve ikisi de
--     `authenticated`'a kapalı; `profiles_update_self` ise yalnız hesabın
--     KENDİ sahibine UPDATE veriyor. Başkasının adını değiştirebilecek tek
--     yol `internal_create_membership`'ti ve o, üyeliği olan kullanıcıyı
--     reddediyor — `status` süzmediği için **askıya alınmış** üyelik de
--     engelliyor, ve kurumdan çıkarma satırı silmiyor.
--
--     Yani yerleşmiş bir hesabın adını başkası değiştiremiyor; geriye kalan
--     tek yazar kişinin kendisi ve "adımı kim değiştirdi" sorusunun cevabı
--     her zaman "sen". Yazılacak iz, olmayan bir olayın izi olurdu (K-03).
--
--     ⚠️ Gerekçe üç halkaya dayanıyor ve üçü de değişebilir. Bu yüzden yorumda
--     bırakılmadı: `profile_rename_has_no_path.test.sql` halkaları tek tek
--     sınıyor. Biri kırılırsa bu muafiyet yeniden ölçülmeli (**K-24**).
--
--     `audit_events.organization_id` NOT NULL olduğu için blanket tetikleyici
--     zaten yazılamıyordu — üyeliği olmayan profilde kurum çözülemez ve NOT
--     NULL ihlali şifre değiştirmeyi kırardı.
--
-- Listeye bir satır eklemek bir **karardır**: nerede kayıtlı olduğunu
-- yazmadan ekleme.

begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

-- =========================================================================
-- 1. Kapının kendisi
-- =========================================================================

select is(
  (
    select coalesce(string_agg(eksik.tablo, ', ' order by eksik.tablo), '')
    from (
      select distinct rel.relname as tablo
      from information_schema.role_column_grants as yetki
      join pg_class as rel on rel.relname = yetki.table_name
      join pg_namespace as ns on ns.oid = rel.relnamespace and ns.nspname = 'public'
      where yetki.table_schema = 'public'
        and yetki.grantee = 'authenticated'
        and yetki.privilege_type in ('INSERT', 'UPDATE')
        and rel.relkind = 'r'
        and rel.relname not in ('tasks', 'calendar_events', 'profiles')
        and not exists (
          select 1
          from pg_trigger as tg
          where tg.tgrelid = rel.oid
            and not tg.tgisinternal
            and tg.tgname like '%audit%'
        )
    ) as eksik
  ),
  '',
  'every table writable by authenticated has an audit trigger (three documented exceptions aside)'
);

-- =========================================================================
-- 2. İstisnalar hâlâ istisna mı — liste çöplüğe dönmesin
-- =========================================================================
--
-- Muafiyet listesi bir kez yazılıp unutulan bir şey olmasın: muaf tutulan bir
-- tablo yazılamaz hâle gelirse (yetkisi kalkarsa) listede durmasının anlamı
-- kalmaz ve satır silinmeli.

select is(
  (
    select count(distinct yetki.table_name)
    from information_schema.role_column_grants as yetki
    where yetki.table_schema = 'public'
      and yetki.grantee = 'authenticated'
      and yetki.privilege_type in ('INSERT', 'UPDATE')
      and yetki.table_name in ('tasks', 'calendar_events', 'profiles')
  ),
  3::bigint,
  'and all three exceptions are still writable — otherwise their exemption is stale and the line should go'
);

-- =========================================================================
-- 3. Kapı gerçekten bir şey ölçüyor mu
-- =========================================================================
--
-- ⚠️ Yukarıdaki iddia boş bir kümeyle de geçer. Bu ikisi kapının **var olan**
-- bir şeye baktığını gösteriyor: sayı sıfır değil ve bilinen bir tablo
-- gerçekten korunuyor.

select cmp_ok(
  (
    select count(distinct rel.relname)
    from information_schema.role_column_grants as yetki
    join pg_class as rel on rel.relname = yetki.table_name
    join pg_namespace as ns on ns.oid = rel.relnamespace and ns.nspname = 'public'
    where yetki.table_schema = 'public'
      and yetki.grantee = 'authenticated'
      and yetki.privilege_type in ('INSERT', 'UPDATE')
      and rel.relkind = 'r'
  ),
  '>=',
  20::bigint,
  'the gate is looking at a real population — at least twenty writable tables'
);

select is(
  (
    select count(*)
    from pg_trigger as tg
    join pg_class as rel on rel.oid = tg.tgrelid
    join pg_namespace as ns on ns.oid = rel.relnamespace and ns.nspname = 'public'
    where rel.relname = 'students'
      and not tg.tgisinternal
      and tg.tgname like '%audit%'
  ),
  2::bigint,
  'and a known table really is covered — students carries its insert and update audit triggers'
);

select * from finish();
rollback;
