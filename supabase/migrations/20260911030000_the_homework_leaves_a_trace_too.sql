-- v1.4-05 · Ödev de iz bırakır ve anlık yayılır (#273)
--
-- =========================================================================
-- 1. Bu dilim neden küçük — ve neden bu bir kusur değil
-- =========================================================================
--
-- Diğer v1.4 dilimlerinin çoğu yeni sütun, yeni kısıt ya da yeni RPC
-- getirdi. Bu dilim **hiçbirini getirmiyor** ve gerekçesi ölçüldü:
-- `homework_assignments` v1.2-08'den beri **tamam**.
--
--   * 12 sütun; `class_id` zorunlu, `subject_id` opsiyonel, `due_date` zorunlu
--   * Arşiv deseni kurulu (`archived_at`); DELETE ne yetki ne politika olarak var
--   * RLS tam: dört SELECT politikası (admin/teacher/student/guardian),
--     bir INSERT, bir UPDATE
--   * `id` ve `assigned_by_membership_id` `authenticated` için **salt okunur**
--     — ödevi kimin verdiğini istemci yazamıyor, `homework_assignments_set_assigner`
--     tetikleyicisi çağıranın kimliğinden dolduruyor
--
-- Yani ödev yazma yolu **v1.2-08'de bitmişti**; eksik olan iki şey, o gün
-- henüz var olmayan iki kuraldı:
--
--   * **Denetim izi** — `audit_row_change` v1.4-02'de yazıldı (v1.2-08'den sonra)
--   * **Realtime yayını** — broadcast tetikleyicileri v1.3-13'te geldi (yine sonra)
--
-- Ölçüldü: bugün on eğitim tablosunun **dokuzunda** broadcast tetikleyicisi
-- var, `homework_assignments`'ta **yok**. Denetim tetikleyicisi de yok.
-- Yani bu dilim yeni bir kural getirmiyor, **iki mevcut kuralın atladığı tek
-- tabloyu kapatıyor**.
--
-- =========================================================================
-- 2. Denetim — tam, çünkü kesmeyi haklı çıkaracak bir ölçü yok
-- =========================================================================
--
-- v1.4-03 yoklamada ilk girişi bilerek izsiz bıraktı ve gerekçesi iki ölçüye
-- dayanıyordu. **İkisi de burada yok:**
--
--   * Hacim: §4.12'de `homework_assignments` için bir satır **yok**, çünkü
--     o tablo öğrenci başına büyüyen tabloları sayıyor. Ödev ise **sınıfa**
--     veriliyor — satır sayısı öğrenciyle değil **sınıfla** ölçekleniyor ve
--     fark yapısal. §4.12'nin kendi zemininden (450k öğrenci) türetildi,
--     ölçüm değil tahmin: sınıf başına ~20 öğrenci ⇒ ~22.500 sınıf; sınıf
--     başına haftada ~3 ödev × 36 hafta ⇒ **~2.400.000 satır/yıl**.
--     `attendance_records`'un ~90.000.000'unun kabaca **kırkta biri**.
--   * Ödevi kimin verdiği `assigned_by_membership_id`'den okunabiliyor —
--     ama o alan **ilk girişi** söyler. Bir ödevin teslim tarihinin sonradan
--     kimin tarafından öteletildiği oradan okunamaz, ve veli için asıl soru
--     odur.
--
-- **`description` de izleniyor ve bu ilk yazımdan dönülen bir karar.**
-- Önce onu dışarıda bırakmıştım: serbest metin, uzun olabilir, defteri şişirir.
-- Sonra `audit_row_change`'in gövdesi yeniden okundu ve gerekçe çöktü —
-- fonksiyon, izlenen alanlardan hiçbiri değişmediyse `return null` yapıyor:
--
--     if cardinality(degisen) = 0 then return null; end if;
--
-- Yani `description` izlenmeseydi, yalnız ödev metninin değiştiği bir
-- güncelleme **hiçbir iz bırakmazdı**. "İçeriği yazmayalım ama değiştiğini
-- görelim" diye bir orta yol bu fonksiyonda yok: `ayrinti` izlenen alanların
-- **değerlerinden** kuruluyor.
--
-- Seçim, ikisi arasında yapıldı ve doğruluk kazandı: **ödevin metni ödevin
-- kendisidir.** Teslim tarihinden sonra sessizce yeniden yazılan bir ödev,
-- velinin itiraz edeceği asıl durumdur — v1.4-03'te "yok iken izinli olmak"
-- neyse burada bu.
--
-- ⚠️ **Bedeli açıkça yazılıyor:** her ödev denetim satırı ödev metnini
-- taşıyor. §4.12 `audit_events`'i zaten "tek başına en büyük tablo olabilir"
-- diye işaretlemişti; bu karar o satırı biraz daha ağırlaştırıyor. Bölümleme
-- borcu orada duruyor ve tetikleyicisi değişmedi.
--
-- İzlenen alanlar: `title`, `description`, `due_date`, `subject_id`, `class_id`.
-- `assigned_on` izlenmiyor — `default current_date` ile dolup bir daha
-- değişmiyor; `archived_at` ise ayrı ele alınıyor: fonksiyon onu izlenen
-- listeden bağımsız okuyup `homework.archived` / `homework.restored` üretiyor.

create trigger homework_assignments_audit_insert
  after insert on public.homework_assignments
  for each row execute function public.audit_row_change(
    'homework', 'title', 'description', 'due_date', 'subject_id', 'class_id'
  );

create trigger homework_assignments_audit_update
  after update on public.homework_assignments
  for each row execute function public.audit_row_change(
    'homework', 'title', 'description', 'due_date', 'subject_id', 'class_id'
  );

-- =========================================================================
-- 3. Realtime — dokuz tablonun deseni, onuncuya
-- =========================================================================
--
-- v1.3-13'ün `broadcast_organization_change()` fonksiyonu değişmeden
-- kullanılıyor; yeni bir yayıncı yazılmıyor. Kanal adı yine kurum kapsamı
-- (`org:<id>`), yani bir kurumun ödev değişikliği başka kuruma gitmiyor.
--
-- Tetikleyiciler **satır başına değil ifade başına** (`for each statement`)
-- ve bu, dokuz tablodaki kalıbın aynısı: bir öğretmen tek işlemde beş sınıfa
-- ödev verirse beş mesaj değil, kuruma bir mesaj gider.

create trigger homework_assignments_broadcast_insert
  after insert on public.homework_assignments
  referencing new table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();

create trigger homework_assignments_broadcast_update
  after update on public.homework_assignments
  referencing new table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();

create trigger homework_assignments_broadcast_delete
  after delete on public.homework_assignments
  referencing old table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();
