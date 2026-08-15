# Doğrulama Notu

## Görsel Kontrol

Giriş ekranı, referanstaki merkezde konumlanan beyaz kart, açık mavi zemin, mavi giriş düğmesi, demo hesap kutusu ve Türkçe alan etiketleriyle karşılaştırıldı. Masaüstü ve 375 px genişlikteki küçük ekran görünümünde form alanları, düğme ve yardımcı metinler taşmadan görüntülendi.

Dashboard, demo bilgileriyle girişten sonra açıldı. Sol modül menüsü, dört finansal özet kartı, hızlı işlemler, altı aylık gelir/gider grafiği, hızlı erişim bölümü, durum kartı ve son işlemler tablosu birlikte kontrol edildi. İlk masaüstü denemesinde ana içerik alanı dikeyde yanlış hizalanmıştı; uygulama kabuğu yatay düzene geçirilerek sorun giderildi.

## İşlev Kontrolü

`demo@moneyflow.com` ve `demo123` bilgileri giriş ekranından dashboard’a geçiş sağlıyor. Hatalı bilgi için bildirim gösteriliyor; parola görünürlüğü ve hatırla seçeneği çalışıyor. Hızlı eylemler ile gezinme öğeleri kullanıcıya demo bildirimi veriyor ve çıkış kontrolü giriş ekranına dönüyor. Tür denetimi `pnpm check` ile hatasız tamamlandı.

## Yerel Veri Akışı Kontrolü

Genişletilmiş demo ekranı, başlangıç müşteri ve fatura verileriyle açıldı. Dashboard’da tahsilat, bekleyen tahsilat, vadesi geçen fatura ve aktif müşteri metrikleri yerel veriden türetildi; son faturalar ve aktivite akışı da aynı kayıt kümesinden doğru şekilde görüntülendi. Fatura sayısı, sol menüdeki rozetle eşleşti. Müşteri ve fatura modüllerindeki ekleme, düzenleme, silme, arama, durum filtresi ve ödeme kaydetme akışları ayrıca test edilecektir.

Müşteriler modülünde kart düzeni doğru yüklendi. `Nora` araması altı kayıt içinden yalnızca Nora Tasarım Stüdyosu kartını döndürdü; Yeni Müşteri eylemi erişilebilir, alanları tanımlı ve erişilebilir bir iletişim kutusu açtı.

Örnek bir müşteri formdan oluşturulduktan sonra filtre temizlendi. Kayıt sayısı altıdan yediye yükseldi ve Kuzey Ofis Çözümleri kartı iletişim bilgileri, notu ve sıfır açık bakiyesiyle listenin başında yer aldı. Bu davranış, müşteri ekleme işleminin yerel saklama ve kart görünümüyle bağlı olduğunu doğruladı.

Faturalar modülü beş kayıt ve tutar özetiyle doğru açıldı. MF-2026-018 için ödeme kaydetme eylemi çalıştırıldığında fatura durumu Gönderildi’den Ödendi’ye geçti; tahsilatın dashboard metriklerine işlendiğini belirten başarı bildirimi görüntülendi.

Ödeme sonrasında dashboard Toplam Tahsilat değeri ₺76.950,00’dan ₺101.450,00’a, ödenmiş fatura sayısı ikiden üçe yükseldi; son aktivite akışına ilgili tahsilat kaydı eklendi. Teslim öncesinde Demo verisini sıfırla eylemi kullanıldı ve başlangıç değerleri, altı müşteri, beş fatura ile başlangıç aktivite geçmişi geri yüklendi.

Tarayıcıda yeni bir oturum açıldığında sıfırlanmış başlangıç verileri tekrar yüklendi. Böylece demo verisinin tarayıcı yerel saklamasında kalıcı olduğu ve sıfırlama eyleminin bu saklamayı güncellediği de doğrulandı.

Fatura silme işlemi önce etkisini açıklayan bir onay iletişim kutusu gösterdi. Onaydan sonra MF-2026-015 kaldırıldı; fatura sayısı beşten dörde, liste toplamı ₺158.950,00’dan ₺140.050,00’a ve sol gezinmedeki fatura rozeti beşten dörde düştü. Bu testten sonra başlangıç verileri tekrar geri yüklenecektir.

## Operasyon Modülleri Kontrolü

Fatura listesinde MF-2026-018 seçildiğinde belge odaklı fatura önizlemesi açıldı. Görünümde fatura numarası, gönderildi durumu, düzenleme/vade tarihi, müşteri ve gönderen bilgileri, banka açıklaması, KDV satırı, ara toplam ve genel toplam doğru biçimde görüntülendi. Yazdırma, düzenleme ve tahsilat eylemleri erişilebilir durumdadır.

Giderler modülü dört başlangıç kaydı, tedarikçi adı, kategori, tutar, durum rozeti, arama alanı ve durum filtresiyle açıldı. GDR-2026-041 için ödeme kaydetme eylemi çalıştırıldığında kayıt Bekliyor durumundan Ödendi durumuna geçti ve başarı bildirimi görüntülendi. Bu testten sonra demo verileri başlangıç durumuna geri yüklenecektir.

Tedarikçiler modülü beş kartla açıldı. Her kartta hizmet kategorisi, iletişim bilgileri, ödeme vadesi, bağlı son gider ve yerel veriden hesaplanan açık borç görüldü; örneğin BulutKare Teknoloji kartı vadesi geçmiş GDR-2026-039 kaydından ₺7.940,00 açık borç türetti. Pusula Kreatif Ajans kartındaki Gider Ekle eylemi, tedarikçisi önceden seçili Yeni Gider formunu açtı; Vazgeç eylemi kayıt oluşturmadan formu kapattı.

Gider ödeme testinden sonra dashboard’da toplam gider ₺6.340,00’dan ₺24.540,00’a ve bekleyen ödeme ₺26.140,00’dan ₺7.940,00’a güncellendi; etkinlik günlüğüne GDR-2026-041 ödeme kaydı eklendi. Demo verisini sıfırla eylemi başlangıç müşteri, tedarikçi, fatura ve gider kayıtlarını geri getirdi. Nihai tür denetimi ve üretim paketi `pnpm check && pnpm build` ile başarıyla tamamlandı.
