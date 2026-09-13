-- v1.4-15 · İşaretleme, öğretmen bitirdiğini söyleyince biter
--
-- 🔴 **Bu migration bir tasarım boşluğunu kapatıyor ve boşluk benimdi.**
--
-- `homework_submissions` "satırın varlığı teslimi anlatır" modeliyle yazıldı.
-- O modelde bir satırın **yokluğu iki farklı şey** demek:
--
--   1. Öğretmen sınıfı işaretledi, bu öğrenci getirmedi.
--   2. Öğretmen henüz bu öğrenciyi işaretlemedi.
--
-- İnceleme turunda ölçüldü: ekran bu ikisini ayırt edemediği için bir sezgi
-- kullanıyordu — "bir ödevde en az bir teslim varsa o ödev takip ediliyor
-- sayılır". Sezgi çoğu zaman doğru, ama öğretmen 15 öğrencinin 3'ünü
-- işaretleyip bıraktığında kalan 12'si **"getirmedi"** sayılıyordu. Ve o sayı
-- öğrencinin kartında **veliye de görünüyor** (**K-03**: sistemin bilmediği bir
-- şey bir sayı olarak gösterilemez).
--
-- Karar (2026-09-13, Arda Bülent): **öğretmen bitirdiğini söyler.**
--
-- =========================================================================
-- Neden bir sütun, neden `homework_submissions`'ta değil
-- =========================================================================
--
-- Bitirme bir **ödevin** durumu, bir teslimin değil: "bu ödevin sınıfını
-- gözden geçirdim". Dolayısıyla `homework_assignments`'ta duruyor.
--
-- Alan adı bilerek `submissions_recorded_at` — "teslimler **kaydedildi**".
-- `completed_at` gibi bir ad ödevin kendisinin tamamlandığını ima ederdi;
-- tamamlanan şey ödev değil **işaretleme işi**.
--
-- ⚠️ Boş bırakılabilir ve geri alınabilir: öğretmen yanlışlıkla basarsa
-- temizleyebilmeli. `null` = "henüz bitirmedim" ve ekran o ödev için oran
-- **üretmez** — yokluk yine yokluktur, ama artık **tek** anlama gelir.

alter table public.homework_assignments
  add column submissions_recorded_at timestamptz;

comment on column public.homework_assignments.submissions_recorded_at is
  'Öğretmenin "bu ödevin teslimlerini işaretlemeyi bitirdim" dediği an. NULL ise oran üretilmez: bir teslim satırının yokluğu ancak bu alan doluyken "getirmedi" anlamına gelir. Adı bilerek `completed_at` değil — tamamlanan şey ödev değil işaretleme işi.';

-- Yazma yetkisi: mevcut `homework_assignments_update_authorized` politikası
-- zaten "yönetici veya sınıfı okutan öğretmen" diyor — yani teslimi
-- işaretleyebilen kümenin aynısı. Eksik olan yalnız sütun yetkisiydi.
grant update (submissions_recorded_at)
  on public.homework_assignments to authenticated;

-- =========================================================================
-- İz — bitirme bir karardır, defterde durmalı
-- =========================================================================
--
-- Mevcut denetim tetikleyicileri `title`, `description`, `due_date`,
-- `subject_id`, `class_id` izliyor. Bitirme sinyali bunlardan hiçbiri değil ve
-- izlenmeseydi **hiç iz bırakmazdı**: `audit_row_change` izlenen alanların
-- hiçbiri değişmediğinde `null` dönüp satır yazmıyor (v1.4-05'te ölçüldü).
--
-- Kim, hangi ödev için, ne zaman "bitirdim" dedi — bu, ondan sonra üretilen
-- her oranın dayanağı. Sorulabilir bir sorudur.

drop trigger if exists homework_assignments_audit_insert on public.homework_assignments;
drop trigger if exists homework_assignments_audit_update on public.homework_assignments;

create trigger homework_assignments_audit_insert
  after insert on public.homework_assignments
  for each row execute function public.audit_row_change(
    'homework', 'title', 'description', 'due_date', 'subject_id', 'class_id',
    'submissions_recorded_at'
  );

create trigger homework_assignments_audit_update
  after update on public.homework_assignments
  for each row execute function public.audit_row_change(
    'homework', 'title', 'description', 'due_date', 'subject_id', 'class_id',
    'submissions_recorded_at'
  );
