-- v1.4-16 · Sıfır bir ölçümdür, yokluk değildir
--
-- Rapor ekranının üç kartı bugün sabit `[0, 0, 0, 0]` çiziyor ve `ReportCard`
-- "hepsi sıfırsa veri yoktur" diye okuyup boş durum gösteriyor. Bu bugün
-- dürüst, çünkü sayılar gerçekten yok. Kartlar canlı veriye bağlandığı gün
-- **aynı koşul yalan söylemeye başlar**: dört hafta boyunca gerçekten %0 devam
-- eden bir sınıf (kapanmış şube, tatil dönemi) "veri yok" görür (**K-22**).
--
-- Bu migration ayrımı **kaynağa** taşıyor: veri olmayan hafta **boş (NULL)**
-- döner, ölçülen sıfır **`0`** döner. Ekran artık iki durumu tahmin etmek
-- zorunda değil, okuyor.
--
-- =========================================================================
-- Neden üçü de `security definer` DEĞİL
-- =========================================================================
--
-- "Kimin kapsamı" sorusunun cevabı zaten RLS'te (2026-09-14'te ölçüldü):
-- `attendance_records` yöneticiye kurum genelini, öğretmene
-- `current_user_teaches_student` kadarını veriyor; `exam_results` aynı şekilde.
-- Ve "Raporlar" bölümü `educationAccess.ts`'te yalnız yönetici ve öğretmende.
--
-- Dolayısıyla kapsam **çağıranın kimliğinden** gelir. `security definer`
-- yazmak öğretmene okutmadığı sınıfların verisini açardı — istenen şey bu
-- değil (2026-09-14 kararı: herkes kendi kapsamını görür).
--
-- ⚠️ Burada `exam_participant_count`'un dersine benzeyen ama **ters** bir durum
-- var ve karıştırılmaması için yazılıyor. O kararda (2026-09-08) "okuyanın
-- gördüğü satır sayısı" yanlıştı, çünkü iddia **sınavın katılımcı sayısıydı** —
-- okuyandan bağımsız bir olgu. Burada iddia zaten okuyanın kapsamı:
-- "Sınıflarınızın devamı" / "Kurumunuzun devamı". Aynı görünen iki durum,
-- farklı iki soru.
--
-- =========================================================================
-- Neden RPC, neden istemcide üç `select` değil
-- =========================================================================
--
-- `max_rows = 1000`. Bu tuzak bu depoda **dört kez** ölçüldü (#256,
-- v1.3-01/C, v1.4-05 R1, v1.4-15 R2) ve her seferinde "sınır koymayı
-- hatırlamak" ile çözüldü. Bir rapor toplamında bedeli daha ağır olurdu:
-- kesilen bir sorgu **eksik bir paydayı** doğru bir oran gibi gösterir.
--
-- Bu üç fonksiyon en çok dört satır döndürür. Tuzak hatırlanarak değil,
-- **yapısal olarak** kapanıyor.
--
-- =========================================================================
-- Dört hafta: sınırı sunucu çizer
-- =========================================================================
--
-- Karar (2026-09-14, Arda Bülent): **takvim haftası (Pzt–Paz)** — son üç tam
-- hafta ve içinde bulunulan hafta.
--
-- Sınır `public.orbit_today()` ile hesaplanıyor, istemcinin saatiyle değil.
-- Bugünkü `getLastFourMonths()` istemcide `new Date()` çağırıyor; bu #239'un
-- _"vadesi geçti hangi güne göre"_ sorusunun aynısıdır ve gece yarısı ile
-- 03:00 arasında kartı bir hafta kaydırırdı.
--
-- `date_trunc('week', ...)` PostgreSQL'de ISO haftasıdır: pazartesi başlar.
--
-- ⚠️ **Ekseni de sunucu kuruyor: iki haftalık fonksiyon HER ZAMAN tam dört
-- satır döndürür.** İlk yazımda yalnız verisi olan haftalar dönüyordu ve bu,
-- ekseni istemciye kurdurmak demekti — üç haftası boş bir sınıfta tek satır
-- döner, kalan üç haftanın tarihini istemci kendi saatiyle hesaplamak zorunda
-- kalırdı. Yani `orbit_today()` ile kapatılan tuzak arka kapıdan geri girerdi.
--
-- Ayrım satırın **varlığında** değil, sayıların **boşluğunda**:
--
--   sayılar NULL  → o hafta ölçülmedi (ders yok, ya da hepsi izinli)
--   sayılar 0     → ölçüldü, sıfır
--
-- Hiç veri görmeyen çağıran dört satırın dördünü de NULL alır; ekran kartı
-- boş durumda gösterir. Sınav fonksiyonunda böyle bir eksen yok: onun ekseni
-- takvim değil **sınavların kendisi**, ve olmayan sınav çizilmez.

-- ---------------------------------------------------------------------------
-- Kart 1 · Devam görünümü
-- ---------------------------------------------------------------------------
--
-- **Yüzde burada hesaplanmıyor, sayılar dönüyor.** Formül
-- (`(present + late) / (present + late + absent)`) 2026-09-08 kararının
-- kendisidir ve `calculateAttendancePercentage`'ta yazılı, testleri de orada.
-- Aynı kuralı SQL'de ikinci kez yazmak **K-06** ihlali olurdu: iki ekran aynı
-- öğrenci için farklı yüzde hesaplayabilirdi.
--
-- **`excused` ne paya ne paydaya girer.** Bu yüzden geri de dönmüyor — dönen
-- üç sayının üçü de formülün içinde. İzinli sayısını göndermek, onunla bir şey
-- yapılabileceğini ima ederdi.
--
-- ⚠️ `having`: bütün kayıtları izinli olan bir hafta **boş sayılarla** döner.
-- Paydası sıfır olan hafta "%0 devam" değildir; ölçülmemiştir.
--
-- Gelecek tarihli oturum aralığın dışında bırakılıyor: yoklaması alınmış
-- gelecek tarihli bir ders bir anomalidir ve "bu hafta"nın oranını bozar.
--
-- ⚠️ **`- 21` sınırı bir doğruluk kuralı değil, bir tarama sınırıdır** ve bunu
-- yazmak gerekiyor: eksen kurulduktan sonra dört haftadan eski bir hafta zaten
-- `left join`'de eşleşmiyor, yani sınır kaldırılsa da **sonuç değişmez**.
-- Mutasyon turunda ölçüldü — `- 28` yapıldığında hiçbir test kırmızıya
-- dönmedi. Yine de duruyor, çünkü onsuz her çağrı kurumun **bütün** yoklama
-- geçmişini tarar. Doğruluk yarısı ayrıca sınanıyor: pencerenin dışındaki
-- hafta hiç dönmüyor (testte 6. iddia).

create or replace function public.report_attendance_weeks()
returns table (
  week_start date,
  present_count bigint,
  late_count bigint,
  absent_count bigint
)
language sql
stable
set search_path = ''
as $$
  with eksen as (
    select
      date_trunc('week', public.orbit_today())::date - (gecmis * 7) as hafta
    from generate_series(0, 3) as gecmis
  ),
  sayim as (
    select
      date_trunc('week', oturum.session_date)::date as hafta,
      count(*) filter (where kayit.status = 'present') as present_count,
      count(*) filter (where kayit.status = 'late') as late_count,
      count(*) filter (where kayit.status = 'absent') as absent_count
    from public.attendance_records as kayit
    join public.attendance_sessions as oturum
      on oturum.id = kayit.session_id
    where oturum.archived_at is null
      and oturum.session_date
            >= date_trunc('week', public.orbit_today())::date - 21
      and oturum.session_date <= public.orbit_today()
    group by date_trunc('week', oturum.session_date)::date
    having count(*) filter (
      where kayit.status in ('present', 'late', 'absent')
    ) > 0
  )
  select
    eksen.hafta as week_start,
    sayim.present_count,
    sayim.late_count,
    sayim.absent_count
  from eksen
  left join sayim on sayim.hafta = eksen.hafta
  order by eksen.hafta;
$$;

comment on function public.report_attendance_weeks() is
  'Rapor ekranının devam kartı: son dört takvim haftası (Pzt–Paz) için katıldı/geç kaldı/gelmedi sayıları. Yüzde DÖNMEZ — formül 2026-09-08 kararıdır ve `calculateAttendancePercentage`''ta tek yerde durur (K-06). `excused` hiç sayılmaz, bu yüzden geri de dönmez. HER ZAMAN tam dört satır döner ve ekseni sunucu kurar (istemci saatine iş düşmez). Ölçülmemiş hafta NULL sayılarla gelir, ölçülmüş sıfır 0 ile: bütün kayıtları izinli olan hafta %0 değil, ölçülmemiştir (K-22). Arşivli oturum ve gelecek tarihli oturum dışarıdadır. `security definer` DEĞİLDİR: kapsam RLS''ten gelir.';

-- ---------------------------------------------------------------------------
-- Kart 2 · Deneme gelişimi
-- ---------------------------------------------------------------------------
--
-- Karar (2026-09-14, Arda Bülent): **yüzdeye çevir, türü iddia etme.**
--
-- "TYT kurum ortalaması" alt başlığı kalkıyor. Sebep şemada: `exams` tablosunda
-- **sınav türü sütunu yok** (2026-09-14'te ölçüldü). Bir sınavın TYT olduğunu
-- söyleyen hiçbir veri yokken kartın öyle demesi, #239'un baştan beri
-- şikâyet ettiği şeydi.
--
-- ⚠️ **`max_score`'da hiç CHECK yok** — bu da bugün ölçüldü: `exams`
-- üzerindeki tek CHECK `name` uzunluğu. Yani `0` da negatif de girilebilir ve
-- sıfıra bölmeyi **şema engellemiyor**. Fonksiyon engelliyor (**K-04**):
-- `max_score > 0` olmayan sınav ortalamaya hiç girmez. Tavanı yazılmamış bir
-- sınav bir yüzde üretemez; bu v1.4-04'ün aynı sebeple aldığı kararın
-- kurum geneli hâli.
--
-- ⚠️ Süzgeç **tek** koşul ve bu bilerek: ilk yazımda yanında bir
-- `max_score is not null` daha vardı, mutasyon turunda kaldırıldığında
-- **hiçbir test kırmızıya dönmedi** (**K-23**). Sebebi SQL'in kendisi:
-- `null > 0` sonucu `NULL`'dır, yani tavanı boş sınav zaten `> 0` koşulundan
-- geçemez. Ölü bir koşulu bırakmak, okuyana iki ayrı kural varmış gibi
-- görünürdü (**K-06**).
--
-- Yüzde %100'ü aşamaz çünkü `enforce_exam_score_within_max` puanı tavana
-- bağlıyor — ama yalnız tavan doluyken. Tavanı boş sınavlar zaten dışarıda.
--
-- **Sonucu görünmeyen sınav listeye girmez.** `exams` SELECT politikası kurumun
-- HER üyesine açık (ölçüldü), `exam_results` ise kapsamlı. Ortalama
-- sonuçlardan türetiliyor, sınavlardan değil — yoksa bir öğretmen okutmadığı
-- sınıfın sınavını "0 sonuç" gibi görürdü.
--
-- Son dört sınav tarihe göre seçilir, sonra çizim için **eskiden yeniye**
-- sıralanır: bir "gelişim" grafiği soldan sağa okunur.

create or replace function public.report_exam_averages()
returns table (
  exam_id uuid,
  exam_name text,
  exam_date date,
  average_percent numeric,
  result_count bigint
)
language sql
stable
set search_path = ''
as $$
  select
    son_dort.exam_id,
    son_dort.exam_name,
    son_dort.exam_date,
    son_dort.average_percent,
    son_dort.result_count
  from (
    select
      sinav.id as exam_id,
      sinav.name as exam_name,
      sinav.exam_date as exam_date,
      round(avg(sonuc.score / sinav.max_score) * 100, 1) as average_percent,
      count(*) as result_count
    from public.exam_results as sonuc
    join public.exams as sinav
      on sinav.id = sonuc.exam_id
    where sinav.archived_at is null
      and sinav.max_score > 0
    group by sinav.id, sinav.name, sinav.exam_date
    order by sinav.exam_date desc, sinav.id desc
    limit 4
  ) as son_dort
  order by son_dort.exam_date asc, son_dort.exam_id asc;
$$;

comment on function public.report_exam_averages() is
  'Rapor ekranının deneme kartı: çağıranın görebildiği sonuçlara göre son dört sınavın yüzde ortalaması, eskiden yeniye. Farklı tam puanlı sınavlar yüzdeye çevrilerek karşılaştırılır. `max_score` boş ya da sıfır olan sınav HİÇ GİRMEZ — şemada `max_score` için CHECK yok, sıfıra bölmeyi bu süzgeç engelliyor (K-04). Sınav TÜRÜ iddia edilmez: `exams` tablosunda tür sütunu yoktur, bu yüzden kartın "TYT" alt başlığı kaldırıldı. Ortalama sonuçlardan türetilir, sınavlardan değil: `exams` kurumun her üyesine açıktır, `exam_results` değildir. `security definer` DEĞİLDİR.';

-- ---------------------------------------------------------------------------
-- Kart 3 · Ödev tamamlama
-- ---------------------------------------------------------------------------
--
-- ⚠️ Bu kart ROADMAP'te "geri geldi ve gerçek bir sayıya dayanıyor" diye
-- yazılıydı. 2026-09-14'te ölçüldü: geri gelen şey **kartın başlığıydı**;
-- `reportHomeworkValues` hâlâ sabit `[0, 0, 0, 0]` ve testi de yalnız başlığı
-- sınıyor. ROADMAP satırı bu dilimde düzeltiliyor.
--
-- **Yalnız işaretlemesi bitirilmiş ödevler sayılır** (`submissions_recorded_at`
-- dolu). Bu v1.4-15'in kararıdır ve sebebi orada yazılı: bir teslim satırının
-- yokluğu, ancak öğretmen "bitirdim" dedikten sonra "getirmedi" demektir.
--
-- **Payda ile pay aynı kümeden gelir.** Her ödev için beklenen öğrenci kümesi
-- = (sınıfın arşivsiz kayıtlı öğrencileri) ∪ (o ödeve gerçekten teslim
-- verenler). Bu #297'nin kuralıdır ve buraya taşınmasının bir sebebi var:
-- birleşim yüzünden **pay paydayı yapısal olarak geçemez**. #296'da
-- "Tamamlandı" rozetini her zaman ateşleyen tutarsız çift, burada doğamaz.
--
-- Sınıftan ayrılmış ama ödevi teslim etmiş öğrenci paydada kalır: teslimi
-- gerçekten oldu ve `enforce_homework_submission_matches_class` arşivli kaydı
-- bilerek kanıt sayıyor.
--
-- ⚠️ **Payda ödev-öğrenci çiftlerini sayar, öğrenci saymaz.** İki ödevi olan
-- bir öğrenci paydada iki kez görünür. Kartın sorusu "kaç öğrenci" değil,
-- "verilen ödevlerin kaçı geri geldi".
--
-- Gelecek tarihli teslim tarihi burada dışarıda bırakılMIYOR (devam kartından
-- farklı olarak): gelecekte teslim tarihi olan bir ödev olağandır, ve
-- öğretmen işaretlemeyi bitirdiyse oran tamdır. Dışarıda kalan tek şey dört
-- haftalık pencerenin kendisi.

create or replace function public.report_homework_weeks()
returns table (
  week_start date,
  submission_count bigint,
  expected_count bigint
)
language sql
stable
set search_path = ''
as $$
  with odev as (
    select
      gorev.id as odev_id,
      gorev.class_id as sinif_id,
      date_trunc('week', gorev.due_date)::date as hafta
    from public.homework_assignments as gorev
    where gorev.archived_at is null
      and gorev.submissions_recorded_at is not null
      and gorev.due_date
            >= date_trunc('week', public.orbit_today())::date - 21
      and gorev.due_date
            < date_trunc('week', public.orbit_today())::date + 7
  ),
  sayim as (
    select
      odev.hafta as hafta,
      (
        select count(*)
        from public.homework_submissions as teslim
        where teslim.homework_id = odev.odev_id
          and teslim.archived_at is null
      ) as teslim_sayisi,
      (
        select count(*)
        from (
          select kayit.student_id as ogrenci_id
          from public.class_enrollments as kayit
          where kayit.class_id = odev.sinif_id
            and kayit.archived_at is null
          union
          select teslim.student_id as ogrenci_id
          from public.homework_submissions as teslim
          where teslim.homework_id = odev.odev_id
            and teslim.archived_at is null
        ) as beklenen
      ) as beklenen_sayisi
    from odev
  ),
  toplam as (
    select
      sayim.hafta as hafta,
      sum(sayim.teslim_sayisi)::bigint as submission_count,
      sum(sayim.beklenen_sayisi)::bigint as expected_count
    from sayim
    group by sayim.hafta
    having sum(sayim.beklenen_sayisi) > 0
  ),
  eksen as (
    select
      date_trunc('week', public.orbit_today())::date - (gecmis * 7) as hafta
    from generate_series(0, 3) as gecmis
  )
  select
    eksen.hafta as week_start,
    toplam.submission_count,
    toplam.expected_count
  from eksen
  left join toplam on toplam.hafta = eksen.hafta
  order by eksen.hafta;
$$;

comment on function public.report_homework_weeks() is
  'Rapor ekranının ödev kartı: son dört takvim haftası için (teslim sayısı, beklenen sayı). Hafta ödevin `due_date`''inden gelir. YALNIZ `submissions_recorded_at` dolu ve arşivsiz ödevler sayılır (v1.4-15): bir teslim satırının yokluğu ancak öğretmen bitirdiğini söyledikten sonra "getirmedi" demektir. Beklenen küme = (sınıfın arşivsiz kayıtları) ∪ (gerçekten teslim edenler) — pay ile payda aynı kümeden gelir, bu yüzden pay paydayı geçemez (#297). Payda ödev-öğrenci çiftidir, öğrenci değil. HER ZAMAN tam dört satır döner; beklenen sıfır olan hafta NULL sayılarla gelir — ölçülmedi demektir, sıfır değil. `security definer` DEĞİLDİR.';

-- ---------------------------------------------------------------------------
-- Yetki
-- ---------------------------------------------------------------------------
--
-- Üçü de `authenticated`'a açık ve açık olması güvenli: kapsamı RLS çiziyor.
-- Görecek verisi olmayan çağıran boş küme alır — hata değil, sıfır satır.
--
-- ⚠️ **Önce `revoke`, sonra `grant`** — ev kuralı (2026-09-09) ve bu turda
-- yine işe yaradı: ilk yazımda `revoke` satırları yoktu ve
-- `function_grants.test.sql` üç fonksiyonu da **`anon`'a açık** bulup
-- kırmızıya döndü. PostgreSQL yeni bir fonksiyona `public` rolü üzerinden
-- EXECUTE veriyor; `grant ... to authenticated` onu daraltmıyor, yanına
-- ekliyor.

revoke all on function public.report_attendance_weeks() from public, anon;
revoke all on function public.report_exam_averages() from public, anon;
revoke all on function public.report_homework_weeks() from public, anon;

grant execute on function public.report_attendance_weeks() to authenticated;
grant execute on function public.report_exam_averages() to authenticated;
grant execute on function public.report_homework_weeks() to authenticated;
