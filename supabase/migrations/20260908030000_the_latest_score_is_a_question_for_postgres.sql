-- Öğrenci başına "son sınav puanı" veritabanında seçilir (v1.3-01/D).
--
-- =========================================================================
-- Neden fonksiyon
-- =========================================================================
--
-- `Student.score` "son sınav puanı" demek. İstemcide çözmenin yolu, öğrencilerin
-- bütün sonuç satırlarını çekip her biri için en yeni sınavı seçmek — ve satır
-- çekmenin bir üst sınırı olmak zorunda.
--
-- O tuzak bir kez kuruldu ve C parçasında engelleyici bulgu oldu (v1.3-12):
-- devam yüzdesi 5000 satırlık **sessiz** bir tavanla hesaplanıyordu; tavana
-- dayanınca sayı yine üretiliyor ve ekrana yetkili görünen yanlış bir değer
-- olarak çıkıyordu. Aynı hatayı ikinci kez kurmuyoruz.
--
-- Burada üstelik daha keskin: "son sınav" **bir seçim**. Eksik bir satır
-- kümesinden seçilen "son" sınav, gerçekten son olmayabilir — ve ekran yanlış
-- sınavın puanını doğru bir sayı gibi gösterir.
--
-- `distinct on` bu seçimi Postgres'te yapar: dönen satır sayısı **öğrenci
-- sayısı kadardır**, kaç sonuç olursa olsun. Üst sınır sorunu ortadan kalkar.
--
-- =========================================================================
-- Neden `security definer` DEĞİL
-- =========================================================================
--
-- Çağıranın hakları geçerli kalır ve `exam_results` ile `exams` üzerindeki RLS
-- olduğu gibi uygulanır. Bu, `DECISION_LOG` — "Sütun maskeleme RLS'in işi
-- değildir; sıralama bir fonksiyondan gelir" kararının **açıkça ayırdığı iki
-- yoldan hangisinde olduğumuzu** belirler:
--
--   * `exam_ranking` → SIRALAMA yolu. `security definer`, satır bazında
--     maskeleme yapar, yetkisiz isimleri `null`'lar. Öğrenci tüm sıralamayı
--     görmeli ama diğer isimleri görmemeli.
--   * bu fonksiyon → LİSTE yolu. Maskeleme YOK; çağıran yalnız görmeye yetkili
--     olduğu satırları alır, o kadar.
--
-- Kararın kendi cümlesi: _"İki yol birbirinin yerine geçmez."_ Bunu
-- `definer` yapsaydık liste yolu sessizce sıralama yolunun yetkisini alırdı.
--
-- =========================================================================
-- Ayrıntılar
-- =========================================================================
--
-- **Arşiv `exams`'tedir.** `exam_results` tablosunda `archived_at` sütunu YOK —
-- `attendance_records` ile aynı kalıp. Filtre birleştirme üzerinden uygulanır.
--
-- **`max_score` döndürülüyor ve nullable.** Arayüz "84 · 100 üzerinden" diyor;
-- ama `max_score` boş olabilir ve o zaman "100 üzerinden" **uydurma** olur.
-- Fonksiyon değeri olduğu gibi verir, istemci boşsa o ibareyi çizmez (K-22).
--
-- **Beraberlik kuralı yazılı:** aynı tarihli iki sınavda seçim `exam.id`'ye
-- göre yapılır. Rastgele bir "son" sınav, aynı öğrenciye her açılışta farklı
-- puan gösterirdi.

create or replace function public.student_latest_exam_scores(
  target_student_ids uuid[]
)
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
set search_path = ''
as $$
  select distinct on (result.student_id)
    result.student_id,
    result.score,
    exam.id as exam_id,
    exam.name as exam_name,
    exam.exam_date,
    exam.max_score
  from public.exam_results as result
  join public.exams as exam
    on exam.id = result.exam_id
  where result.student_id = any(target_student_ids)
    and exam.archived_at is null
  order by result.student_id, exam.exam_date desc, exam.id desc;
$$;

comment on function public.student_latest_exam_scores(uuid[]) is
  'Öğrenci başına EN SON sınav sonucu: puan, sınav adı, tarih ve varsa tam puan. Seçim veritabanında `distinct on` ile yapılır; istemcide satır çekip seçmek, eksik bir kümeden "son" sınavı seçme riski taşır. `security definer` DEĞİLDİR: bu LİSTE yoludur, maskeleme yapmaz ve çağıran yalnız görmeye yetkili olduğu satırları alır. Maskeli SIRALAMA yolu ayrıdır ve `exam_ranking`''dir (DECISION_LOG — "İki yol birbirinin yerine geçmez"). Arşivlenmiş sınavın sonucu dönmez.';

grant execute on function public.student_latest_exam_scores(uuid[]) to authenticated;
