-- Ödev oranı sunucuda sayılır — istemci sayamıyordu (v1.5-17, #308).
--
-- =========================================================================
-- Neden fonksiyon
-- =========================================================================
--
-- `Student.homework` ("Ödev tamamlama") istemcide **üç ardışık** PostgREST
-- çağrısıyla hesaplanıyordu: sınıf kayıtları → o sınıfların bitirilmiş ödevleri
-- → o ödevlerin teslimleri. Üçünün de tavanı `POSTGREST_MAX_ROWS = 1000`.
--
-- Bir dershane-yılı tohumlanıp ölçüldü (ROADMAP §4.17, 2026-09-17) ve kolon
-- **bu ölçekte hiç çalışmıyordu**. Üç ayrı kırılma, üçü de gerçek:
--
--     217. ödev kimliğinde URL 8.184 karakter    → HTTP 414    (yöneticide)
--     ~55 ödevde teslim sorgusu 1.000 satıra     → tavan doldu (öğretmende)
--     20 sınıfta ödev adımı 960/1000             → 21. sınıfta o da dolar
--
-- Üç yolun hepsi `return new Map()`'e çıkıyor. Davranış **fail-closed ve bu
-- doğru** (K-04: uydurma oran üretilmez) — ama arayüz `student.homework`
-- tanımsızsa satırı hiç çizmediği için **etiket değerle birlikte kayboluyor**.
-- Kullanıcı hata da boşluk da görmüyor; eksiklik hiçbir yere kaydedilmiyor.
--
-- Toplama sunucuya taşındığında dönen satır sayısı istenen öğrenci sayısına
-- eşit olur (ekranda en fazla 100) ve üç kırılma birden kapanır. Üç tur bire
-- düşer; §4.17'de ölçülen ~1 saniyelik üçüncü tur ortadan kalkar.
--
-- =========================================================================
-- Neden `security definer` — ve neden bu ödemenin tersi
-- =========================================================================
--
-- `student_payment_summaries` bilinçli olarak `definer` DEĞİL (bkz.
-- 20260908050000): ödeme yalnızca yöneticiye ve veliye açık, o yüzden çağıranın
-- hakları geçerli kalmalı. Burada durum farklı: ödev oranı, ödevi **gören**
-- herkesin görebileceği bir sayı. Mesele yetkiyi genişletmek değil, aynı yetki
-- kararını **satır başına değil girdi başına bir kez** vermek.
--
-- Emsal deponun kendi kaçış kapısıdır: `class_staff_names`, `exam_ranking`,
-- `exam_participant_count`, `feed_post_authors`. Kalıp aynı: `definer` + yetkiyi
-- bir kez çözen bir CTE + ucuz üyelik kontrolü **başta**.
--
-- =========================================================================
-- ⛔ Yetki yüzeyi genişletilMEDİ — kesişim alındı, birleşim değil
-- =========================================================================
--
-- `definer` RLS'i atladığı için yetki burada elle yazılmak zorunda, ve üç
-- tablonun politikaları **aynı kapsamda değil**:
--
--     class_enrollments    : admin | teaches_class | attends_class | guards_class
--     homework_assignments : admin | teaches_class | attends_class | guards_class
--     homework_submissions : admin | teaches_class | owns_student_record
--                                  | guards_student
--
-- İlk ikisi **sınıf** kapsamlı, üçüncüsü **öğrenci** kapsamlı. Yani bugün bir
-- öğrenci, sınıf arkadaşının kayıt satırını ve o sınıfın ödevlerini görüyor ama
-- arkadaşının teslimlerini göremiyor.
--
-- Bu aşağıdaki predikatın neden `attends_class` değil `owns_student_record`
-- olduğunun sebebi. Yalnız öğrenciyi yetkilendiren bir CTE yazmak (ilk akla
-- gelen) **öğretmeni de genişletirdi**: C sınıfını okutan öğretmen, öğrencinin
-- D sınıfındaki ödev performansını da öğrenirdi. Bu yüzden yetki
-- **(öğrenci, sınıf)** çifti üzerinde ve üç politikanın **kesişimi** olarak
-- veriliyor:
--
--     admin(org) | teaches_class(class_id)
--                | owns_student_record(student_id) | guards_student(student_id)
--
-- `owns_student_record(x)` zaten `attends_class`'ı, `guards_student(x)` zaten
-- `guards_class`'ı içeriyor; dolayısıyla bu ifade tam olarak kesişimdir.
--
-- ⚠️ **Bir durumda bugünden DARALIYOR ve bu bilinçli.** Bugün bir öğrenci sınıf
-- arkadaşının oranını isterse: kayıt satırı görünür, ödevler görünür, teslimler
-- görünmez → payda dolu, pay **sıfır** hesaplanır ve ekrana `0/5` gibi
-- **yanlış** bir oran çıkar. Yeni davranış o çağrıda **hiçbir şey** döndürüyor.
-- Yanlış cevap vermek yerine cevap vermemek K-22'nin kendisidir.
--
-- =========================================================================
-- "Kayıt tarihi" hangi güne göre — kural zaten vardı, istemci uymuyordu
-- =========================================================================
--
-- Kural: öğrencinin sınıfa kaydından ÖNCE verilmiş bir ödevden sorumlu
-- tutulmaz (K-03/K-22) — teslim etmişse sayılır, etmemişse hesaba girmez.
--
-- Karşılaştırma bir takvim günü istiyor ve istemci bunu `created_at` ISO
-- dizgesinin ilk on karakterini alarak üretiyordu: yani **UTC günü**.
-- Deponun kuralı ise 20260908050000'de yazıldı ve tek bir yerde duruyor:
-- `orbit_local_date` — kurum saati (Europe/Istanbul), çünkü sunucunun TimeZone
-- ayarı UTC ve her gece 00:00-03:00 arası UTC günü Türkiye'nin bir gün
-- gerisindedir.
--
-- Bu fonksiyon `orbit_local_date` kullanıyor. Yani bu bir **davranış
-- değişikliğidir**: İstanbul saatiyle 00:00-03:00 arasında oluşturulmuş bir
-- sınıf kaydında, o günün ödevi artık doğru tarafta sayılıyor. Kuralı
-- değiştirmiyor, kuralı **uyguluyor** (K-06: kural tek yerde durur).

create or replace function public.student_homework_ratios(target_student_ids uuid[])
returns table (
  student_id uuid,
  recorded_count bigint,
  submitted_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with gorunur_kayit as (
    -- Yetki BİR KEZ, (öğrenci, sınıf) çifti başına. Ucuz üyelik kontrolü başta:
    -- listeyi okuyan rol yönetici ve onun için ilk predikat yeterli.
    select
      kayit.student_id,
      kayit.class_id,
      kayit.organization_id,
      public.orbit_local_date(kayit.created_at) as enrolled_on
    from public.class_enrollments as kayit
    where kayit.student_id = any(target_student_ids)
      and kayit.archived_at is null
      and (
        public.current_user_has_membership(
          kayit.organization_id, null, array['admin']::public.app_role[]
        )
        or public.current_user_teaches_class(kayit.class_id)
        or public.current_user_owns_student_record(kayit.student_id)
        or public.current_user_guards_student(kayit.student_id)
      )
  ),
  gorunur_odev as (
    -- Yalnız işaretlemesi BİTİRİLMİŞ ödevler (v1.4-15 R1). Yarım işaretlenmiş
    -- bir ödev orana hiç girmez: teslim etmeyen öğrenci "getirmedi" sayılamaz.
    select distinct
      kayit.student_id,
      kayit.enrolled_on,
      odev.id as homework_id,
      odev.assigned_on
    from gorunur_kayit as kayit
    join public.homework_assignments as odev
      on odev.class_id = kayit.class_id
     and odev.organization_id = kayit.organization_id
    where odev.archived_at is null
      and odev.submissions_recorded_at is not null
  ),
  teslim as (
    select
      odev.student_id,
      odev.homework_id
    from gorunur_odev as odev
    join public.homework_submissions as kayit_teslim
      on kayit_teslim.homework_id = odev.homework_id
     and kayit_teslim.student_id = odev.student_id
    where kayit_teslim.archived_at is null
  )
  select
    odev.student_id,
    count(*) as recorded_count,
    count(*) filter (where teslim.homework_id is not null) as submitted_count
  from gorunur_odev as odev
  left join teslim
    on teslim.student_id = odev.student_id
   and teslim.homework_id = odev.homework_id
  -- K-03/K-22: kayıttan önce verilmiş ödev, teslim edilmemişse hesaba girmez.
  where teslim.homework_id is not null
     or odev.assigned_on >= odev.enrolled_on
  group by odev.student_id;
$$;

comment on function public.student_homework_ratios(uuid[]) is
  'Öğrenci başına bitirilmiş ödev sayısı ve teslim sayısı. Yetki (öğrenci, sınıf) çifti başına bir kez verilir ve class_enrollments/homework_assignments/homework_submissions politikalarının KESİŞİMİDİR — sınıf arkadaşının oranı görünmez. Sorumluluğu olmayan öğrenci çıktıda hiç yoktur: sıfır değil yokluk (K-22).';

revoke all on function public.student_homework_ratios(uuid[]) from public, anon;
grant execute on function public.student_homework_ratios(uuid[]) to authenticated;
