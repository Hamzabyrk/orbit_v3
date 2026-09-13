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
--   `profiles` → `audit_events.organization_id` NOT NULL ve `profiles`'ta öyle
--     bir sütun yok; özel tetikleyici gerekiyor ve kişi birden fazla kuruma
--     üye olabilir. **v1.4-17'ye ertelendi** (K-12); bugün iz yok ve bu
--     bilinerek böyle.
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
