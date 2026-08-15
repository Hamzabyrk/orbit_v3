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

## Finans Modülleri Kontrolü

Yeni v4 başlangıç verileriyle giriş sonrasında dashboard açıldı. Tahsil edilmiş MFS-2026-007 satışı, Toplam Tahsilat değerini ₺113.450,00’a; onaylanmış ve faturalanmış satışlar ise Bekleyen Tahsilat değerini ₺183.100,00’a taşıdı. Bu, satış verisinin mevcut dashboard metrikleriyle birlikte hesaplandığını doğruladı.

Bankalar ekranı üç hesap kartı ve işlem bazlı eşleştirme kuyruğuyla açıldı. Operasyon Hesabı’ndaki GDR-2026-041 referanslı Pusula Kreatif hareketi Eşleştir eylemiyle güncellendi; genel dikkat gerektiren hareket sayısı üçten ikiye, ilgili hesap kartındaki sayaç ise birden sıfıra düştü. İşlem satırı Eşleşti rozetiyle kaydedildi ve başarı bildirimi gösterildi.

Satışlar ekranı dört kayıt, durum filtreleri ve ağırlıklı fırsat özetleriyle açıldı. MFS-2026-009 için Tahsilat Kaydet eylemi uygulandığında durum Onaylandı’dan Tahsil Edildi’ye, tahsil edilen satış toplamı ₺36.500,00’dan ₺108.500,00’a, dönüşüm oranı ise %25’ten %50’ye güncellendi. İşlem aynı zamanda tahsilat hesabına yeni bekleyen banka hareketi ekleyecek şekilde bağlandı.

Raporlar ekranı banka, satış, fatura ve gider kayıtlarından türetilen net sonuç, toplam nakit, bekleyen tahsilat ve net banka hareketi kartlarıyla açıldı. Satış tahsilatından sonra rapor kontrolü 4/7 eşleştirilmiş hareket ve üç dikkat bekleyen hareket gösterdi; nakit akışı detayı banka girişi ₺194.700,00, çıkışı ₺29.620,00 ve farkı ₺165.080,00 olarak hesaplandı. Dışa Aktar eylemi seçili dönem için CSV özeti hazırlandığını bildiren geri bildirim verdi.

Yeni Satış eylemi; müşteri, durum, tutar, açıklama, beklenen kapanış tarihi ve olasılık alanları içeren erişilebilir bir iletişim kutusu açtı. Form açıklaması, satış kaydının tahsilat, banka hareketi ve raporlama görünümüne bağlanacağını açıkça belirtiyor.

## Muhasebe Yönetimi Modülleri Kontrolü

Yeni v6 yerel veri anahtarıyla uygulama yeniden açıldığında temiz başlangıç seti yüklendi; oturum sonrası dashboard, banka, satış ve muhasebe yönetimi menüleri aynı veri bağlamında erişilebilir göründü. Mevcut tahsilat, gider ve bekleyen ödeme metrikleri başlangıç değerleriyle yeniden üretildi.

Muhasebe modülü 12 işlenmiş fişi; fatura, gider, banka ve manuel kaynak rozetleriyle listeledi. Toplam borç ve alacak ₺278.410,00 olarak eşit göründü; her satır Dengeli kontrolü aldı. Yeni Fiş iletişim kutusu fiş tarihi, tutar, açıklama, borç hesabı ve alacak hesabını aynı formda sunarak borç/alacak dengesi kuralını görünür tuttu.

Ofis ekipmanı dönemsel değerleme düzeltmesi açıklamasıyla ₺1.250,00 tutarlı manuel fiş kaydedildi. İşlenmiş fiş sayısı 12’den 13’e, toplam borç ve alacak toplamları birlikte ₺279.660,00’a yükseldi; yeni satır Dengeli durumu ve başarı bildirimiyle listelendi. Teslim öncesinde bu test kaydı başlangıç verileriyle sıfırlanacaktır.

Hesap Planı ekranında 102 Bankalar hesabı, banka hareket fişleriyle çift sayılmadan ₺260.430,00 gerçek hesap toplamıyla gösterildi; üst metrik de aynı değerle hizalandı. Hesap Ekle iletişim kutusu; hesap kodu, adı ve hesap türü alanlarıyla açıldı ve yeni hesabın manuel fiş seçimlerine anında bağlanacağını açıkça belirtti.

780 Finansman Giderleri hesabı Gider türünde kaydedildi. Aktif hesap sayısı 11’den 12’ye yükseldi, yeni hesap faaliyet giderleri grubu altında listelendi ve başarı bildirimi göründü. Teslim öncesinde bu test hesabı başlangıç verileriyle sıfırlanacaktır.

Arşiv modülü, fatura, gider ve satış belgelerini referans, tutar, tarih, arşiv nedeni ve kaynak modülüyle birlikte listeledi. MF-2026-009 geri yüklendiğinde arşivdeki belge sayısı 3’ten 2’ye, arşiv tutarı ₺73.050,00’dan ₺56.250,00’a inerken geri yüklenen kayıt sayısı 1’den 2’ye çıktı. Böylece belge görünür listeden ayrılıp geri getirilebilir yaşam döngüsünü korudu.

Ayarlar ekranında şirket unvanı güncellendi ve Kaydet eylemi, “Şirket, dönem ve belge tercihleri yerel çalışma alanına işlendi” bildirimini verdi. Form, fatura/fiş/rapor bağlamından ayrı varsayılanları yönetirken finansal geçmişe doğrudan müdahale etmedi.

Demo sıfırlaması sonrasında Ayarlar taslağı da başlangıç şirket unvanına geri döndü; manuel fiş, test hesabı ve geri yükleme denemesi temiz başlangıç setinden çıkarıldı. Ayarlardan Bankalar ekranına ve Bankalardan Muhasebe ekranına doğrudan geçişte banka kartları ile 12 dengeli günlük fiş aynı kaynak verileriyle görünmeye devam etti.

Kategorili Ayarlar paneli, altı görünür tercih grubuyla başarıyla açıldı. Şirket panelinde kurumsal unvan, vergi, telefon, finans e-postası, web sitesi, mali dönem ve adres alanları; Bildirimler panelinde e-posta, fatura, gider, ödeme, haftalık ve aylık rapor tercihlerinin ayrı anahtarları doğrulandı.

Haftalık Raporlar anahtarı etkinleştirildi ve Bildirimler panelindeki Kaydet eylemi, tercihlerin yerel çalışma alanına işlendiğini belirten başarı bildirimi verdi. Bu test tercihi teslim öncesi başlangıç değerine döndürülecektir.

Sistem panelinde para birimi, tarih biçimi, varsayılan KDV, fatura ön eki, vade, ana tahsilat hesabı ve banka eşleştirme/tablo görünümü anahtarları doğrulandı. Veri Yönetimi panelinde dışa aktarma biçimi ve arşiv saklama süresi seçimleri, dışa aktarma geri bildirimi ve teyitli demo sıfırlama eyleminden ayrı biçimde sunuldu.

Veri Yönetimi ekranındaki dışa aktarma eylemi, CSV biçiminin demo ortamında hazırlandığını bildirdi ve seçili tercihleri kaydetti. Ardından teyit penceresi üzerinden sıfırlama tamamlandı; uygulama başlangıç demo verilerine ve başlangıç ayar tercihlerine döndü.

Nora Tasarım Stüdyosu için ₺28.000,00 tutarlı, %65 olasılıklı örnek Teklif kaydı formdan oluşturuldu. Yeni MFS-2026-014 kaydı listeye eklendi; satış kayıt adedi dörtten beşe, ağırlıklı açık fırsat tutarı ₺50.400,00’dan ₺68.600,00’a ve dönüşüm oranı %50’den %40’a güncellendi. Teslimden önce test verileri başlangıç durumuna geri yüklenecektir.
