-- Ödeme durumu veritabanında türetilir — ve "bugün" bir saat dilimine aittir (v1.3-01/E).
--
-- =========================================================================
-- Neden fonksiyon
-- =========================================================================
--
-- `Student.payment` ve ödeme ekranının durum rozeti "vadesi geçmiş ödenmemiş
-- taksitim var mı" sorusunun cevabı. İstemcide çözmenin yolu `installments`
-- satırlarını çekip saymak — ve satır çekmenin bir üst sınırı olmak zorunda.
--
-- O tuzak C parçasında bir kez kuruldu ve engelleyici bulgu oldu (v1.3-12):
-- devam yüzdesi 5000 satırlık **sessiz** bir tavanla hesaplanıyordu. Burada
-- bedeli daha ağır: tavana dayanan bir sorgu vadesi geçmiş taksiti göremez ve
-- ekran borçlu bir öğrenciyi **"Güncel"** gösterir. Veliye "borcunuz yok"
-- demek, geri alınması zor bir hatadır.
--
-- =========================================================================
-- ⛔ Neden `security definer` DEĞİL — ve bu sefer sebep tersine
-- =========================================================================
--
-- Bir önceki dilimde (`exam_participant_count`, v1.3-14) `security definer`
-- **düzeltmenin kendisiydi**: katılımcı sayısı okuyanın yetkisine göre
-- değişmemeliydi.
--
-- Burada tam tersi. `payment_plans` ve `installments` üzerindeki RLS ödemeyi
-- **yalnızca yöneticiye ve veliye** açıyor; öğretmen ve öğrencinin kendisi
-- göremiyor (v1.2-06 kararı: _"ödeme, kurum ile aile arasındadır"_). Bu
-- fonksiyonlar `definer` yapılsaydı o kapı sessizce açılırdı — öğretmen, bir
-- öğrenciyi okuttuğu için ailesinin borcunu öğrenirdi.
--
-- Çağıranın hakları geçerli kalır. Öğretmen ve öğrenci **boş küme** alır;
-- `Student.payment` `undefined` kalır ve rozet hiç çizilmez. Yetkisi olmayana
-- "Güncel" demek, ona ödeme hakkında bir şey söylemektir (**K-22**).
--
-- =========================================================================
-- "Vadesi geçti" hangi güne göre — ölçüldü
-- =========================================================================
--
-- `due_date` bir `date`; "geçmiş" demek için bir "bugün" gerekiyor ve bugün
-- saat dilimine bağlı. Canlıda ölçüldü (2026-09-08):
--
--     sunucunun TimeZone ayarı : UTC
--     current_date             : 2026-09-08
--     İstanbul'da saat         : 23:00
--
-- O anda ikisi aynıydı, ama bir saat sonra ayrılıyor: 21:00 UTC'de Türkiye
-- 9 Eylül'e geçerken `current_date` hâlâ 8 Eylül der. Yani **her gece
-- 00:00–03:00 arası** Postgres'in "bugün"ü Türkiye'nin bir gün gerisindedir.
-- O aralıkta vadesi dolan bir taksit üç saat daha "gecikmemiş" görünürdü.
--
-- Kural tek bir yerde duruyor: `orbit_local_date`. İstemci kendi saat
-- diliminde hesaplasaydı aynı taksit iki veliye iki farklı gün gecikmiş
-- görünürdü (**K-06**).

create or replace function public.orbit_local_date(moment timestamptz)
returns date
language sql
immutable
set search_path = ''
as $$
  select (moment at time zone 'Europe/Istanbul')::date;
$$;

comment on function public.orbit_local_date(timestamptz) is
  'Bir anın kurum saatindeki (Europe/Istanbul) takvim günü. Ürün tek ülkeye satılıyor ve vade günü kurumun günüdür; sunucunun TimeZone ayarı UTC olduğu için `current_date` her gece 00:00-03:00 arası bir gün geridedir.';

create or replace function public.orbit_today()
returns date
language sql
stable
set search_path = ''
as $$
  select public.orbit_local_date(now());
$$;

comment on function public.orbit_today() is
  'Kurum saatindeki bugün. Vade karşılaştırmalarının tek referansı; `current_date` KULLANILMAZ.';

-- ---------------------------------------------------------------------------
-- Öğrenci başına ödeme durumu
-- ---------------------------------------------------------------------------
--
-- **Satır dönmesi "ödeme planı var" demektir.** Planı olmayan öğrenci çıktıda
-- hiç yer almaz ve `Student.payment` `undefined` kalır — "Güncel" DEĞİL.
-- Güncel olunacak bir şey yokken "Güncel" demek bir iddiadır (**K-22**);
-- ayrıca ödemeyi görmeye yetkisi olmayan çağıran da aynı yere düşer ve ikisi
-- de doğru şekilde susar.
--
-- Arşiv `payment_plans`'tedir: `installments` tablosunda `archived_at` sütunu
-- YOK — `attendance_records` ve `exam_results` ile aynı kalıp.

create or replace function public.student_payment_summaries(
  target_student_ids uuid[]
)
returns table (
  student_id uuid,
  overdue_count bigint
)
language sql
stable
set search_path = ''
as $$
  select
    plan.student_id,
    count(installment.id) filter (
      where installment.paid_at is null
        and installment.due_date < public.orbit_today()
    ) as overdue_count
  from public.payment_plans as plan
  left join public.installments as installment
    on installment.plan_id = plan.id
  where plan.student_id = any(target_student_ids)
    and plan.archived_at is null
  group by plan.student_id;
$$;

comment on function public.student_payment_summaries(uuid[]) is
  'Öğrenci başına vadesi geçmiş ödenmemiş taksit sayısı. Satır dönmesi "görülebilir bir ödeme planı var" demektir; planı olmayan ya da ödemeyi görmeye yetkisi olmayan için satır DÖNMEZ ve rozet çizilmez ("Güncel" değil). `security definer` DEĞİLDİR: ödeme yalnızca yönetici ve velinindir, definer olsaydı öğretmene açılırdı.';

-- ---------------------------------------------------------------------------
-- Plan başına özet
-- ---------------------------------------------------------------------------
--
-- Ödeme ekranının satırı bir **plandır**, bir öğrenci değil: bir öğrencinin
-- iki planı olabilir ve "hangisi" sorusunun yazılı bir cevabı yok. Plan başına
-- dönmek o soruyu hiç sormamayı sağlıyor.
--
-- **"Sonraki taksit" geçmişte olabilir.** Ödenmemiş en erken taksittir; vadesi
-- geçmişse de odur. Ekranın demo verisi de böyle davranıyor (vadesi geçmiş
-- satırlar "sonraki taksit" sütununda geçmiş tarih gösteriyor) — kural
-- değiştirilmedi, olduğu gibi alındı.
--
-- **Beraberlik kuralı yazılı:** aynı gün vadesi dolan iki taksitte seçim
-- `sequence_no`'ya göre yapılır. Rastgele bir "sonraki", aynı plana her
-- bakışta farklı tutar gösterirdi.

create or replace function public.payment_plan_summaries(
  target_plan_ids uuid[]
)
returns table (
  plan_id uuid,
  overdue_count bigint,
  next_due_date date,
  next_due_amount numeric
)
language sql
stable
set search_path = ''
as $$
  select
    plan.id as plan_id,
    count(installment.id) filter (
      where installment.paid_at is null
        and installment.due_date < public.orbit_today()
    ) as overdue_count,
    min(installment.due_date) filter (
      where installment.paid_at is null
    ) as next_due_date,
    (
      array_agg(installment.amount order by installment.due_date, installment.sequence_no)
      filter (where installment.paid_at is null)
    )[1] as next_due_amount
  from public.payment_plans as plan
  left join public.installments as installment
    on installment.plan_id = plan.id
  where plan.id = any(target_plan_ids)
    and plan.archived_at is null
  group by plan.id;
$$;

comment on function public.payment_plan_summaries(uuid[]) is
  'Plan başına: vadesi geçmiş ödenmemiş taksit sayısı, ödenmemiş EN ERKEN taksitin tarihi ve tutarı. "Sonraki taksit" geçmişte olabilir. Taksiti hiç olmayan planda tarih ve tutar NULL döner, 0 değil. `security definer` DEĞİLDİR.';

-- ---------------------------------------------------------------------------
-- Yöneticinin üç kartından ikisi
-- ---------------------------------------------------------------------------
--
-- "Bu ay tahsilat" ve "Yaklaşan taksit" kurum genelinde toplamlardır ve
-- istemcide **hiç** hesaplanamazlar: satır çekip toplamak, tavana dayandığı
-- anda eksik bir toplamı doğru bir tutar gibi gösterir.
--
-- Yedi günlük pencere uydurulmadı; `educationData.ts`'teki kartın kendi alt
-- metni zaten _"Önümüzdeki 7 gün"_ diyor. Bugün dahil.
--
-- **Üçüncü kart ("Planlanan tahsilatın %82'si") burada YOK.** Paydanın ne
-- olduğu hiçbir yerde yazılı değil (#239) — hesaplanabilir bir yüzde değil,
-- kuralı olmayan bir yüzde. Uydurmak yerine çizilmiyor (**K-03**).
--
-- **`having count(*) > 0` bilinçli.** Toplamsız bir sorgu boş kümede bile tek
-- satır ve üç sıfır döndürür; öğretmen bu fonksiyonu çağırdığında kurumun
-- "₺0 tahsilat, 0 yaklaşan, 0 geciken" olduğunu okurdu. Görecek taksiti
-- olmayan çağırana **hiç satır dönmez**, ekran da kartları çizmez.

create or replace function public.payment_overview_counts()
returns table (
  collected_this_month numeric,
  upcoming_count bigint,
  overdue_count bigint
)
language sql
stable
set search_path = ''
as $$
  select
    coalesce(
      sum(installment.amount) filter (
        where installment.paid_at is not null
          and public.orbit_local_date(installment.paid_at)
                >= date_trunc('month', public.orbit_today())::date
          and public.orbit_local_date(installment.paid_at) <= public.orbit_today()
      ),
      0
    ) as collected_this_month,
    count(*) filter (
      where installment.paid_at is null
        and installment.due_date >= public.orbit_today()
        and installment.due_date <= public.orbit_today() + 7
    ) as upcoming_count,
    count(*) filter (
      where installment.paid_at is null
        and installment.due_date < public.orbit_today()
    ) as overdue_count
  from public.installments as installment
  join public.payment_plans as plan
    on plan.id = installment.plan_id
  where plan.archived_at is null
  having count(*) > 0;
$$;

comment on function public.payment_overview_counts() is
  'Ödeme ekranının yönetici kartları: bu ay tahsil edilen tutar, önümüzdeki 7 gün içinde vadesi gelen taksit sayısı, vadesi geçmiş taksit sayısı. Görebildiği taksit olmayan çağırana HİÇ SATIR dönmez — sıfırlar "kurumda hiç ödeme yok" derdi. `security definer` DEĞİLDİR: kapsam RLS''ten gelir.';

grant execute on function public.orbit_local_date(timestamptz) to authenticated;
grant execute on function public.orbit_today() to authenticated;
grant execute on function public.student_payment_summaries(uuid[]) to authenticated;
grant execute on function public.payment_plan_summaries(uuid[]) to authenticated;
grant execute on function public.payment_overview_counts() to authenticated;
