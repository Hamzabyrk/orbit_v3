-- v1.2-19 · Yanlış sanılan iki asimetri — ölçüldü, ikisi de doğru çıktı
--
-- Kapsam turunun 15 ve 16 numaralı bulguları "küçük bütünlük işi" diye
-- açılmıştı. K-10 turu ikisinin de **kod değil karar** gerektirdiğini gösterdi:
-- düzeltmek, düzeltilecek şeyden daha pahalıya mal olurdu.
--
-- Bu migration hiçbir davranış değiştirmiyor. Yaptığı tek şey, iki kararın
-- **veritabanının içinde** görünmesini sağlamak — çünkü bir sonraki kişi
-- tutarsızlığı burada görecek ve "tutarlı hale getireyim" diyecek.
--
-- =========================================================================
-- 16 · `owns_student_record` `archived_at`'a bakmıyor, `guards_student` bakıyor
-- =========================================================================
--
-- Tutarsızlık gerçek ama **kasıtlı olması gerekiyor**, çünkü iki fonksiyon
-- birbirinden farklı bir soruyu soruyor:
--
--   * `current_user_guards_student` → **devredilebilir bir ilişkiden** gelen
--     erişim. Velilik bağı sona erebilir (velayet değişikliği, ayrılık) ve
--     sona erdiğinde erişimin de bitmesi gerekir. `archived_at` kontrolü bu
--     yüzden zorunlu; v1.2-03'ün "veli yalnızca kendi bağını görür" kararının
--     uygulanma yeri burasıdır.
--
--   * `current_user_owns_student_record` → **kişinin kendi kaydına** erişimi.
--     Öğrencinin arşivlenmesi "kurumdan ayrıldı" demektir; "geçmiş yoklaması
--     artık ona ait değil" demek değildir. Buraya `archived_at` koymak,
--     ayrılan bir öğrenciyi kendi devamsızlık ve sınav geçmişinden keserdi —
--     KVKK açısından da savunulamaz: kişinin kendi verisine erişim hakkı
--     kurumdan ayrılmasıyla bitmez.
--
-- Yani simetri burada bir erdem değil **hata** olurdu. Kararın kaydı
-- `DECISION_LOG.md`'de; testlerle de sabitlendi, böylece ileride biri
-- "tutarlılık" adına `archived_at` eklemeye kalkarsa kırmızı bir testle
-- karşılaşır ve sessizce insanları kendi verilerinden kesmez.

comment on function public.current_user_owns_student_record(uuid) is
  'Çağıranın giriş hesabı bu öğrenci kaydına mı bağlı. Yalnızca çağıranın kendi kapsamını döndürür. '
  '⚠️ archived_at BİLİNÇLİ olarak sorulmuyor: arşivlenmiş öğrenci kurumdan ayrılmıştır ama kendi '
  'geçmişi hâlâ onundur. current_user_guards_student ile arasındaki fark tutarsızlık değil tasarımdır — '
  'veli erişimi devredilebilir bir bağdan gelir ve bağ bitince bitmeli. Bkz. v1.2-19 kararı.';

comment on function public.current_user_guards_student(uuid) is
  'Çağıran bu öğrencinin velisi mi. Yalnızca çağıranın kendi kapsamını döndürür. '
  'archived_at HEM bağda HEM veli kaydında sorulur: velilik sona erebilir ve sona erdiğinde '
  'erişim de bitmelidir. Öğrencinin kendi kaydına erişiminde bu kontrol YOKTUR ve olmamalıdır.';

-- =========================================================================
-- 15 · `subject_id` sınıfa bağlanmıyor — ve bağlanmayacak
-- =========================================================================
--
-- Bulgu şuydu: `attendance_sessions` ve `exams`, o sınıfta okutulmayan bir
-- dersle açılabiliyor. Bileşik yabancı anahtarlar dersin **aynı kuruma** ait
-- olmasını garanti ediyor, "bu sınıfın dersi" olmasını değil.
--
-- Kısıtlanmadı, çünkü kısıtlamak **var olmayan bir veri modelini icat etmek**
-- olurdu. Şemada `class_subjects` diye bir tablo yok; sınıf ile ders arasındaki
-- tek bağ `class_teachers (class_id, subject_id)` — yani "bir öğretmen bu
-- sınıfta bu dersi veriyor". Onu "sınıfın ders listesi" saymak iki şeyi
-- birden yapardı:
--
--   1. Karar verilmemiş bir modeli sessizce benimsemek. Bir sınıfın ders
--      listesi olup olmadığı hiçbir yerde konuşulmadı.
--   2. Meşru bir sırayı kırmak: öğretmen atanmadan önce o sınıfa yoklama
--      oturumu açmak veya sınav tanımlamak imkânsız hale gelirdi. Dershanede
--      deneme sınavı öğretmen atamasından önce planlanır.
--
-- Yanlış ders seçmenin bugünkü bedeli ekranda görünen bir veri giriş hatasıdır;
-- yetki sızıntısı değil. Kısıtın bedeli ise gerçek bir akışı kapatmak olurdu.
--
-- **Kontrol noktası: v1.4-02 (sınıf yönetimi).** Orada bir sınıfın ders
-- listesi olup olmayacağına karar verilecek. Karar "olsun" ise bu kısıt
-- mümkün hale gelir ve yeniden bakılmalıdır; "olmasın" ise bu not kararın
-- kalıcı gerekçesidir.

comment on column public.attendance_sessions.subject_id is
  'Dolu = ders yoklaması, boş = günlük yoklama. Dersin bu sınıfta okutulduğu KONTROL EDİLMEZ: '
  'şemada sınıf-ders listesi diye bir model yok ve class_teachers''ı öyle saymak, öğretmen '
  'atanmadan yoklama açmayı imkânsız kılardı. Kontrol noktası v1.4-02 (v1.2-19 kararı).';

comment on column public.exams.subject_id is
  'Opsiyonel: dolu = tek ders sınavı, boş = çok dersli deneme. Dersin bu sınıfta okutulduğu '
  'KONTROL EDİLMEZ — gerekçe attendance_sessions.subject_id ile aynı (v1.2-19 kararı).';
