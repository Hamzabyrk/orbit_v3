-- Yetki satır başına değil girdi başına çözülür (v1.5-18 · 1/3, #310).
--
-- =========================================================================
-- Ölçüm — bu dosyanın tek gerekçesi
-- =========================================================================
--
-- ROADMAP §4.17: bir dershane-yılı tohumlanıp `EXPLAIN (ANALYZE, BUFFERS)`
-- koşuldu. `student_attendance_counts`, 100 öğrenci için:
--
--                        RLS açık (admin)   RLS yok      kat
--     Execution Time         9.407 ms        6,1 ms    1.567×
--     Buffer (shared hit)   1.471.001         1.013    1.452×
--
-- 1,47 milyon buffer × 8 kB ≈ **11,2 GB** trafik — tek ekranın tek çağrısı
-- için. `attendance_records` süzgeci **satır başına 47 buffer** harcıyor,
-- yalnızca "bu kişi bunu görebilir mi" sorusuna cevap vermek için.
--
-- Sebep planda açıkça görünüyor. Dört politika `OR`'lanıyor ve **ucuz üyelik
-- kontrolü en sonda** duruyor; yani listeyi okuyan yönetici için her satırda
-- önce üç pahalı alt sorgu koşuyor ve üçü de `false` dönüyor:
--
--     Filter: current_user_teaches_student(student_id)        -- pahalı
--          OR current_user_owns_student_record(student_id)    -- pahalı
--          OR current_user_guards_student(student_id)         -- pahalı
--          OR current_user_has_membership(organization_id, …) -- UCUZ, sonda
--
-- ⛔ İki kolay yol denendi ve ölçüldü, ikisi de yeterli değil:
--
--   * Yardımcılara `COST` ipucu vermek (ucuz 1, pahalı 10000): **etkisiz.**
--     7.175 → 7.198 ms ve `Filter` ifadesi harfi harfine aynı kaldı.
--     Planlayıcı RLS'ten üretilen `OR` zincirinin içini fonksiyon maliyetine
--     göre yeniden sıralamıyor. Bir dahaki tur bunu yeniden denemesin.
--   * Dört politikayı tek politikaya indirip ucuz kontrolü başa almak:
--     admin'de **23×** (312 ms), öğretmende **hiç** (4.288 ms). Yarım çözüm.
--
-- ✅ İşe yarayan, deponun kendi kaçış kapısı: `security definer` + yetkiyi
-- **girdi başına bir kez** çözen CTE. Emsal `class_staff_names`,
-- `exam_participant_count`, `feed_post_authors`. Ölçülen: **27 ms** (admin
-- 348×), **37 ms** (öğretmen 119×).
--
-- =========================================================================
-- ⛔ `student_payment_summaries` bu dosyada YOK ve sebebi yazılı
-- =========================================================================
--
-- Migration `20260908050000` gerekçesini kurmuş: ödeme yalnızca yöneticiye ve
-- veliye açık (v1.2-06 kararı: "ödeme, kurum ile aile arasındadır"). O
-- fonksiyon `definer` yapılsaydı öğretmen, bir öğrenciyi okuttuğu için
-- ailesinin borcunu öğrenirdi. Çağıranın hakları geçerli kalır ve o
-- fonksiyonun 81 ms'si zaten sorun değil.
--
-- Yani "hızlı olan desen iyidir" diye her okumayı buraya taşımak yanlış olur.
-- Ölçüt hız değil: **yetki kararı satırın içeriğine mi bağlı, yoksa girdinin
-- kimliğine mi?** İkincisiyse kalıp uygulanabilir.
--
-- =========================================================================
-- Yetki: KESİŞİM alınır, birleşim değil
-- =========================================================================
--
-- `definer` RLS'i atladığı için yetki elle yazılmak zorunda. Ve her iki
-- fonksiyonda da **iki tablo** var, politikaları **aynı kapsamda değil**:
--
--     attendance_records  : admin | teaches_student | owns_student_record
--                                 | guards_student            (ÖĞRENCİ kapsamlı)
--     attendance_sessions : admin | teaches_class | attends_class
--                                 | guards_class              (SINIF kapsamlı)
--
--     exam_results        : admin | teaches_student | owns_student_record
--                                 | guards_student            (ÖĞRENCİ kapsamlı)
--     exams               : has_membership(org)               (KURUM kapsamlı,
--                                                              her rol görür)
--
-- Bugün çağıran, bir satırı ancak **iki politikanın da geçtiği** durumda
-- görüyor — yani bugünkü görünürlük bir kesişimdir. Aşağıdaki ifadeler o
-- kesişimin aynısı, rol rol yazılmış hâli.
--
-- Rollerin çaprazı (ör. "öğrencinin öğretmeni AND sınıfın velisi") yazılmadı:
-- `organization_memberships_org_user_idx` kurum başına kullanıcıya **tek**
-- üyelik veriyor, dolayısıyla bir kişi aynı kurumda iki rol taşımıyor.
-- Hesap bağı üzerinden bir öğretmenin aynı kurumda veli kaydı da olabilir;
-- o durumda veli konjonksiyonu kendi satırlarını, öğretmen konjonksiyonu kendi
-- satırlarını açıyor — çapraz terim yeni bir satır açmıyor.
--
-- ⚠️ Konjonksiyonlar gerekli, çünkü iki taraf farklı şeyi soruyor:
-- `owns_student_record` arşivlenmiş kaydı da kabul ediyor, `attends_class` ise
-- **aktif** kayıt istiyor. Sadece öğrenci tarafını yazmak, sınıftan ayrılmış
-- bir öğrencinin eski yoklamasını **bugün olmadığı hâlde** açardı.
--
-- =========================================================================
-- Neden "girdi başına bir kez" işliyor
-- =========================================================================
--
-- Yukarıdaki predikatların hiçbiri satırın kendisine bakmıyor; yalnız
-- (öğrenci, sınıf) veya (öğrenci, kurum) ikilisine bakıyor. 27.300 yoklama
-- satırı 100 öğrencinin ~140 (öğrenci, sınıf) çiftinden geliyor. Demek ki
-- yetki 27.300 × 4 kez değil **~140 kez** hesaplanabilir ve cevap birebir aynı
-- kalır. Kalıp budur.
--
-- ⚠️ Çiftler ham satır kümesinden türetiliyor, `class_enrollments`'tan DEĞİL.
-- Aktif kayıtlardan türetilseydi yöneticinin sayıları **düşerdi**: arşivlenmiş
-- bir kayıttan kalan yoklama satırları bugün yöneticinin sayımına giriyor.
--
-- 🔴 **Ve `as materialized` şart. Bu ölçümle bulundu, tasarlanırken bilinmiyordu.**
-- İlk yazımda CTE'ler sade `as (…)` idi ve planlayıcı yetki süzgecini
-- `distinct`'in **altına** itti:
--
--     Unique              (rows=60)
--       └─ CTE Scan ham   (rows=11700)
--            Filter: <yetki predikatı>      ← 60 çift değil, 11.700 satır
--
-- Yani "girdi başına bir kez" sessizce "satır başına bir kez"e döndü. Sonucu
-- ölçülebilirdi ve ölçüldü: yönetici yolu yine hızlandı (7.917 → 374 ms, çünkü
-- ucuz üyelik kontrolü `OR`'un başında ve kısa devre yapıyor) ama **öğretmen
-- yolu 4,2 s'den 11,9 s'ye ÇIKTI** ve PostgREST'in 8 saniyelik ifade sınırını
-- aşıp HTTP 500 döndürdü. Yani düzeltme, düzeltmeye çalıştığı şeyi bir rolde
-- daha kötü hâle getiriyordu.
--
-- `as materialized` sınırı gerçek bir çite çeviriyor: `distinct` önce koşuyor,
-- yetki ondan sonra ve yalnız ayrık çiftler üzerinde. **`with` tek başına bir
-- optimizasyon çiti değildir** — PostgreSQL 12'den beri tek referanslı CTE'ler
-- satır içine alınıyor ve nitelikler aşağı itilebiliyor.

-- ---------------------------------------------------------------------------
-- 1. Yoklama sayıları
-- ---------------------------------------------------------------------------
create or replace function public.student_attendance_counts(target_student_ids uuid[])
returns table (
  student_id uuid,
  present_count bigint,
  late_count bigint,
  absent_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with ham as materialized (
    select
      kayit.student_id,
      kayit.status,
      oturum.class_id,
      oturum.organization_id
    from public.attendance_records as kayit
    join public.attendance_sessions as oturum
      on oturum.id = kayit.session_id
     and oturum.organization_id = kayit.organization_id
    where kayit.student_id = any(target_student_ids)
      and oturum.archived_at is null
  ),
  cift as materialized (
    select distinct student_id, class_id, organization_id from ham
  ),
  gorunur as (
    select cift.student_id, cift.class_id
    from cift
    where
      -- Ucuz olan başta: listeyi okuyan rol yönetici ve onun için bu yeterli.
      public.current_user_has_membership(
        cift.organization_id, null, array['admin']::public.app_role[]
      )
      or (
        public.current_user_teaches_student(cift.student_id)
        and public.current_user_teaches_class(cift.class_id)
      )
      or (
        public.current_user_owns_student_record(cift.student_id)
        and public.current_user_attends_class(cift.class_id)
      )
      or (
        public.current_user_guards_student(cift.student_id)
        and public.current_user_guards_class(cift.class_id)
      )
  )
  select
    ham.student_id,
    count(*) filter (where ham.status = 'present') as present_count,
    count(*) filter (where ham.status = 'late') as late_count,
    count(*) filter (where ham.status = 'absent') as absent_count
  from ham
  join gorunur
    on gorunur.student_id = ham.student_id
   and gorunur.class_id = ham.class_id
  group by ham.student_id;
$$;

comment on function public.student_attendance_counts(uuid[]) is
  'Öğrenci başına yoklama sayıları. Yetki (öğrenci, sınıf) çifti başına BİR KEZ çözülür ve attendance_records ile attendance_sessions politikalarının KESİŞİMİDİR; satır başına çözüldüğünde aynı sorgu 1.567× yavaşlıyordu (ROADMAP §4.17). Kaydı olmayan öğrenci çıktıda hiç yoktur: sıfır değil yokluk (K-22).';

revoke all on function public.student_attendance_counts(uuid[]) from public, anon;
grant execute on function public.student_attendance_counts(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Son sınav puanı
-- ---------------------------------------------------------------------------
-- Burada kesişimin şekli farklı: `exams` politikası **kurum** kapsamlı ve her
-- role açık, `exam_results` ise öğrenci kapsamlı. Yani üyelik kontrolü bir
-- konjonksiyon olarak dışta duruyor — üyeliği olmayan (ör. askıya alınmış)
-- birinin `students.auth_user_id`'si dolu olsa bile bugün sınav göremiyor.
create or replace function public.student_latest_exam_scores(target_student_ids uuid[])
returns table (
  student_id uuid,
  score numeric,
  exam_id uuid,
  exam_name text,
  exam_date date,
  max_score numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with ham as materialized (
    select
      sonuc.student_id,
      sonuc.score,
      sinav.id as exam_id,
      sinav.name as exam_name,
      sinav.exam_date,
      sinav.max_score,
      sinav.organization_id
    from public.exam_results as sonuc
    join public.exams as sinav
      on sinav.id = sonuc.exam_id
     and sinav.organization_id = sonuc.organization_id
    where sonuc.student_id = any(target_student_ids)
      and sinav.archived_at is null
  ),
  cift as materialized (
    select distinct student_id, organization_id from ham
  ),
  gorunur as (
    select cift.student_id
    from cift
    where
      -- `exams` tarafı: kurumda herhangi bir aktif üyelik.
      public.current_user_has_membership(cift.organization_id)
      and (
        -- `exam_results` tarafı.
        public.current_user_has_membership(
          cift.organization_id, null, array['admin']::public.app_role[]
        )
        or public.current_user_teaches_student(cift.student_id)
        or public.current_user_owns_student_record(cift.student_id)
        or public.current_user_guards_student(cift.student_id)
      )
  )
  select distinct on (ham.student_id)
    ham.student_id,
    ham.score,
    ham.exam_id,
    ham.exam_name,
    ham.exam_date,
    ham.max_score
  from ham
  join gorunur on gorunur.student_id = ham.student_id
  order by ham.student_id, ham.exam_date desc, ham.exam_id desc;
$$;

comment on function public.student_latest_exam_scores(uuid[]) is
  'Öğrenci başına en son sınav sonucu. Yetki (öğrenci, kurum) ikilisi başına BİR KEZ çözülür ve exam_results ile exams politikalarının KESİŞİMİDİR — kurumda aktif üyeliği olmayan biri, öğrenci kaydı bağlı olsa da sonuç görmez. Sonucu olmayan öğrenci çıktıda hiç yoktur (K-22).';

revoke all on function public.student_latest_exam_scores(uuid[]) from public, anon;
grant execute on function public.student_latest_exam_scores(uuid[]) to authenticated;
