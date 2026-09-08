-- Devam sayıları veritabanında toplanır, istemcide değil (v1.3-01/C).
--
-- =========================================================================
-- Neden gerekti
-- =========================================================================
--
-- C parçası devam yüzdesini istemcide hesaplıyordu: `attendance_records`
-- satırlarını çekip `present`/`late`/`absent` sayaçlarını JavaScript'te
-- artırarak. Doğru sonucu veriyordu — **satırların tamamı geldiği sürece.**
--
-- Satır çekmenin bir üst sınırı olmak zorunda ve o sınır sessizdi:
--
--     .limit(5000)   // ve `data.length === limit` kontrolü yok
--
-- Sorgu tam sınıra dayandığında veri kesilir, ama yüzde yine hesaplanır ve
-- ekrana **yetkili görünen yanlış bir sayı** olarak çıkar. Bu, kesilen bir
-- listeden daha kötüdür: eksik liste "devamı var mı" sorusunu açık bırakır,
-- yanlış yüzde ise kapalı ve yanlış bir cevap verir. Veliye çocuğunun devamını
-- yanlış söylemek, hiç söylememekten kötüdür (**K-03**).
--
-- Sınırı yükseltmek çözüm değildi. Yazanın kendi hesabı: 100 öğrenci × bir
-- dönem ≈ 4.800 satır. 5000'lik tavanın payı %4; ikinci dönem ya da 110.
-- öğrenci onu aşar. **Sessiz bir tavanı yükseltmek sessizliği kaldırmaz.**
--
-- =========================================================================
-- Çözüm: satırları taşımayı bırak
-- =========================================================================
--
-- İstemcinin ihtiyacı satırlar değil **sayılar**. Öğrenci başına üç sayı
-- döndüren bir fonksiyon, kaç kayıt olursa olsun öğrenci sayısı kadar satır
-- üretir — yani üst sınır sorunu ortadan kalkar, kesilme ihtimali kalmaz.
--
-- **`security definer` DEĞİL, bilinçli olarak.** Çağıranın hakları geçerli
-- kalır ve RLS olduğu gibi uygulanır: öğretmen yalnız kendi öğrencilerinin,
-- veli yalnız kendi çocuğunun kaydını sayar. Definer yapsaydık kapsamı elle
-- yeniden yazmak zorunda kalırdık ve o kopya, politikalardan ayrışabilirdi
-- (**K-06**). Sayım yetkisi, okuma yetkisinden fazlası değildir.
--
-- **`excused` üç sayacın hiçbirine girmez.** Karar yazılı: `DECISION_LOG` —
-- "Devam yüzdesinde izinli ders hiç sayılmaz; geç kalma devamdır". İzinli ne
-- payda ne paydadadır, dolayısıyla burada da hiç sayılmaz. Yüzdenin kendisi
-- istemcide hesaplanmaya devam eder; burada üretilen şey yalnız ham sayılar.
--
-- **Arşivlenmiş oturumun kayıtları sayılmaz.** `attendance_records` tablosunda
-- `archived_at` sütunu YOK; arşiv bilgisi oturumdadır. Bu yüzden birleştirme
-- zorunlu ve filtre oturum üzerinden uygulanır.

create or replace function public.student_attendance_counts(
  target_student_ids uuid[]
)
returns table (
  student_id uuid,
  present_count bigint,
  late_count bigint,
  absent_count bigint
)
language sql
stable
set search_path = ''
as $$
  select
    record.student_id,
    count(*) filter (where record.status = 'present') as present_count,
    count(*) filter (where record.status = 'late') as late_count,
    count(*) filter (where record.status = 'absent') as absent_count
  from public.attendance_records as record
  join public.attendance_sessions as session
    on session.id = record.session_id
  where record.student_id = any(target_student_ids)
    and session.archived_at is null
  group by record.student_id;
$$;

comment on function public.student_attendance_counts(uuid[]) is
  'Öğrenci başına devam sayaçları: present, late, absent. `excused` bilinçli olarak hiçbirine girmez (DECISION_LOG — "Devam yüzdesinde izinli ders hiç sayılmaz"). Arşivlenmiş oturumun kayıtları sayılmaz. `security definer` DEĞİLDİR: çağıranın RLS kapsamı olduğu gibi uygulanır, sayım yetkisi okuma yetkisinden fazlası değildir. Yüzde istemcide hesaplanır; bu fonksiyon yalnız ham sayı döndürür.';

grant execute on function public.student_attendance_counts(uuid[]) to authenticated;
