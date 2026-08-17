# ORBIT — Proje Geçmişi (Arşiv)

Bu dosya, repo kökünde dağınık duran 24 adet not/analiz/doğrulama dosyasının **2026-08-17** tarihinde konsolide edilmiş hâlidir. Her orijinal dosyanın içeriği, hiçbir kayıp olmadan, kendi başlığı altında birebir korunmuştur. Amaç: kök dizini sadeleştirmek, ama geçmiş kararların ve araştırmaların izini kaybetmemek.

Üç dönem/kategori altında gruplanmıştır:

1. **MoneyFlow Dönemi** — projenin ilk/orijinal adı ve konsepti: bağımsız bir finans-muhasebe SaaS ürünü.
2. **Orbit Pivotu** — güncel yön: dershane/eğitim kurumu için CRM + finans + eğitim operasyonları platformu.
3. **Tasarım/Animasyon Analizleri** — logo ve karşılama animasyonu için yapılan video/görsel analiz notları.

`todo.md` içindeki tüm maddeler `[x]` (tamamlandı) işaretli olarak arşivlendi — açık/bekleyen bir görev tespit edilmedi.

---

## Bölüm 1 — MoneyFlow Dönemi (İlk Konsept)

### 📄 `ideas.md`

# MoneyFlow Arayüz Yeniden Üretim Notları

## Referans Tasarım: Ground-Truth Spesifikasyonu

Bu çalışma, kullanıcının verdiği `moneybird-version-4-ihmo.bolt.host` adresindeki **MoneyFlow** arayüzünü yeniden üretir. Referansın görünür hiyerarşisi, Türkçe metinleri, açık tema renk dengesi, girişten panele geçişi ve dashboard bilgi mimarisi uygulamanın bağlayıcı görsel hedefidir. Bu nedenle genel tasarım denemeleri yerine, referansta gözlemlenen hafif, iş odaklı ve mavi vurgulu arayüz korunacaktır.

### Tasarım Hareketi

Ürün odaklı **SaaS finans paneli** estetiği. Geniş beyaz çalışma alanı, yumuşak gri yüzeyler, ince sınırlar ve güçlü mavi eylem vurguları; karmaşık muhasebe verilerini hızlı taranabilir hale getirir.

### Temel İlkeler

1. Giriş ekranı, merkezde duran kompakt beyaz kart ve soluk mavi arka planla sakin, güven veren bir ilk izlenim oluşturur.
2. Dashboard, kalıcı sol gezinme sütunu ve ferah ana içerik alanıyla muhasebe işlemlerini bir bakışta okunabilir tutar.
3. Kartlar, büyük yuvarlatmalar yerine küçük köşe yarıçapları, ince gri kenarlar ve çok hafif gölgeler kullanır.
4. Mavi, yalnızca marka simgesi, etkin durumlar, birincil düğmeler ve pozitif vurgu gibi semantik noktalarda kullanılır.

### Renk Felsefesi

Ana zemin beyaz ve çok açık soğuk gridir; bu, muhasebe verilerinin öne çıkmasına imkân verir. İmzalı **MoneyFlow mavisi `#2563EB`**, kontrol ve ilerleme hissini taşır. Koyu lacivert-gri metin, göz yorgunluğunu azaltacak yoğunlukta kullanılır. Yeşil, kırmızı ve amber yalnızca finansal durumların anlamını destekleyen ikincil göstergelerdir.

### Yerleşim Paradigması

Kullanıcı giriş yaptığında sol tarafta sabit, gruplanmış bir modül gezintisi yer alır. Üstte kullanıcı bilgisi ve iki adet hızlı işlem düğmesi bulunur. Ana alan, metriklerin yatay akışı ile aşağıda iki kolonlu faaliyet/özet alanları arasında ritmik bir hiyerarşi kurar. Küçük ekranlarda sol panel açılır kapanır bir menüye dönüşür.

### İmza Öğeler

1. Mavi kare içinde beyaz hesap makinesi/finans simgesi.
2. Aktif sayfayı belirleyen solunda mavi şerit olan yumuşak gri menü öğesi.
3. Gelir-gider performansının renk kodlu çift sütun grafiği ve işlem durum rozetleri.

### Etkileşim Felsefesi

Giriş formu, referanstaki demo kimlik bilgileriyle çalışan istemci taraflı bir akış sunar. Yan menü ve hızlı işlem öğeleri tıklandığında, kullanılabilirliği korumak için kullanıcıya bir bildirim verir. Parola görünürlüğü açılıp kapatılabilir; mobil gezinti, kendi kontrolüyle açılır.

### Animasyon

Yalnızca işlevi teyit eden hafif geçişler kullanılacaktır: düğmelerde 140 ms sıkışma, kartlarda 180 ms gölge/konum geçişi, giriş başarılı olduğunda kısa yüklenme durumu. Tüm hareketler `prefers-reduced-motion` tercihine saygı gösterir.

### Tipografi Sistemi

Başlık ve marka için **Manrope** 600–800 ağırlıkta; form, tablo ve yardımcı bilgiler için **DM Sans** 400–600 ağırlıkta kullanılır. Başlıklar sıkı harf aralıklı, veri tutarları tabular rakamlı ve metrik kartlardaki değerler belirgin biçimde büyüktür.

### Marka Özü

> Küçük işletmeler için karmaşık işlemleri anlaşılır günlük karar ekranlarına dönüştüren, sakin ve erişilebilir muhasebe alanı.

Markanın kişiliği **net, güvenilir ve çevik** olacaktır. Başlıklar doğrudan eylemi ve mevcut durumu anlatır; çağrılar kısa ve iş odaklıdır. Örneğin, "Muhasebe sisteminize giriş yapın" ve "Yeni müşteri ekleyin" ifadeleri referansın yalın sesini sürdürür.

### Wordmark ve Logo

Wordmark, koyu lacivert `MoneyFlow` yazısını; logo ise mavi yuvarlatılmış kare içinde beyaz hesap makinesi simgesini kullanır. Simge, giriş kartında ve dashboard menüsünün markalama alanında görünür büyüklükte yer alacaktır.

### İmza Marka Rengi

**MoneyFlow mavisi: `#2563EB`.**

## Style Decisions

Giriş ve dashboard yüzeylerinde düz beyaz paneller, ince soğuk-gri kenarlar, küçük köşe yarıçapları ve sınırlı gölgeler kullanılacaktır. Parlak gradyanlar, yoğun glow efektleri ve aşırı yuvarlatılmış pill biçimleri kullanılmayacaktır.

MoneyFlow mavisi yalnızca logo, birincil eylem, etkin menü durumu, temel bağlantı ve anlamsal pozitif vurgularda kullanılacaktır. Nötr gri yüzeyler form, tablo ve yardımcı bilgilerin ana taşıyıcısıdır.

MoneyFlow wordmark'ı, hesap makinesi simgesiyle kilitli bir marka öğesi kabul edilir; Manrope 700–800 ağırlıkta ve kontrol edilmiş aralıklarla kullanılır. Dashboard'un sol menüsü, metrik kartları, finans rozetleri ve iki kolonlu çalışma ritmi aynı sakin finans ürünü karakterini sürdürür.

Giriş arka planı, gradyan veya parıltı yerine çok düşük kontrastlı soğuk-gri bir ledger/çizelge dokusuyla finans ürünü bağlamını destekler. Girişteki demo bilgileri, dashboard veri kartlarıyla aynı sıkı hiyerarşiyi kullanır: ince sınır, soğuk gri yüzey, kompakt veri etiketi ve belirgin değer. Marka kilidi mavi hesap makinesi simgesi ile ağır Manrope wordmark'ını tek bir tasarlanmış öğe olarak korur.

---

### 📄 `financial_models.md`

# MoneyFlow Finans Modülleri: Uygulama Sözleşmesi

## Banka Hesapları ve Hareketleri

`BankAccount`, kurum adı, hesap türü, IBAN'ın maskelenmiş son hanesi, gösterge bakiyesi, muhasebe bakiyesi ve son senkron zamanını tutar. `BankTransaction` ise hesap, tarih, açıklama, yön, kategori, tutar, eşleştirme durumu ve isteğe bağlı bağlı kayıt referansını taşır.

| Hareket durumu | Kullanıcı eylemi | Sonuç |
| --- | --- | --- |
| `Bekliyor` | Eşleştir | Hareket `Eşleşti` olur, hesap kartındaki bekleyen adet düşer ve aktivite kaydı oluşur. |
| `Eşleşti` | Görüntüle | Eşleşme bilgisi, ilgili satış/fatura veya gider bağlamıyla görünür kalır. |
| `İncelenmeli` | Kategoriyi kontrol et | Kullanıcıya finansal uyarı gösterilir; otomatik kayıt yapılmaz. |

## Satışlar

`Sale`, müşteri, başlık, tutar, oluşturma tarihi, beklenen kapanış tarihi, durum, olasılık ve bağlı fatura numarası içerir. Durumlar `Teklif`, `Onaylandı`, `Faturalandı` ve `Tahsil Edildi` şeklindedir. Tahsilat kaydı, satış durumunu güncellerken banka hareketi ve aktivite satırı ekler.

## Raporlar

Raporlar yalnızca yerel veriden türetilir. Gelir, ödenmiş faturalar ve tahsil edilmiş satışlardan; gider, ödenmiş giderlerden; bekleyen nakit girişi ise gönderilmiş/vadesi geçmiş faturalar ile onaylanmış/faturalanmış satışlardan hesaplanır. Nakit akışı, banka hesaplarının gösterge bakiyelerinin toplamını ve son hareketlerin yönünü birlikte kullanır.

Bu sürümde rapor dönemi filtresi, seçili dönem için okunabilir bir özet bağlamı sunar. Tüm tarihsel kayıtlar 2026 yılındaki örnek veri seti üzerinden istikrarlı tutulur.

---

### 📄 `finance_references.md`

# Banka, Satış ve Raporlama Referans Notları

Bu notlar, kamuya açık ürün dokümantasyonu ve tanıtım sayfalarından çıkarılmış iş akışı kalıplarını içerir. MoneyFlow'ın özgün marka ve arayüz dili korunacaktır; hiçbir ürün kimliği veya ekranı birebir kopyalanmayacaktır.

| Kaynak | Uygulanabilir kalıp | MoneyFlow uyarlaması |
| --- | --- | --- |
| Xero banka eşleştirme | Her banka hesabında güncel bakiye, eşleşmemiş işlem adedi; hareketlerin kural, eşleşme veya öneri temelli gözden geçirilmesi | Bankalar ekranında hesap kartları, bekleyen hareket sayısı, işlem satırlarında kategori/önerilen eşleşme ve "Eşleştir" eylemi. |
| QuickBooks banka hareketleri | Hareketleri bekleyen listede kategori, eşleştirme veya ekleme eylemiyle değerlendirme; gelir ve giderin ayrı bağlamlarda sınıflandırılması | Banka işlemlerinde Gelen/Giden yönü, kategori, bağlı fatura/gider ve Eşleşti/Bekliyor durumu; kullanıcının tek eylemle kaydı eşleştirmesi. |
| FreshBooks ödemeler | Fatura/ödeme sonrasında işlem kaydı, dashboard ve raporların otomatik güncellenmesi | Satış kaydı ödenmiş duruma geçtiğinde tahsilat, banka hareketi, dashboard ve raporlar aynı yerel veri kaynağından güncellenecek. |

## Uygulama Kararları

Bankalar modülü üç hesap kartıyla başlayacaktır: operasyon hesabı, tahsilat hesabı ve kurumsal kart. Her kart hesap bakiyesini, son senkron tarihini ve eşleşmemiş hareket sayısını gösterir. Alt tablo tarih, açıklama, yön, kategori, tutar, eşleştirme durumu ve önerilen bağlantıyı içerir.

Satışlar modülü, müşteriyle ilişkili teklif ve satış kaydı akışını destekleyecektir. Durumlar `Teklif`, `Onaylandı`, `Faturalandı` ve `Tahsil Edildi` olacaktır. Tahsil edilen bir satış, banka hareketi ve ilgili müşteri bilgisiyle bağlanır; faturalama sonra da raporlar ile dashboard'a yansır.

Raporlar modülü, statik görsel yerine mevcut yerel veriden türetilen dönem özetlerini sunacaktır. Gelir-gider, net nakit akışı, tahsilat oranı, bekleyen tahsilat ve ödenmesi gereken gider göstergeleri; tablo ve sade, erişilebilir çubuk grafikler üzerinden görüntülenir.

## Kaynaklar

[1] [Xero — Automatic bank reconciliation software](https://www.xero.com/us/accounting-software/reconcile-bank-transactions/)

[2] [QuickBooks — Categorize online bank transactions](https://quickbooks.intuit.com/learn-support/en-us/help-article/banking/categorize-match-online-bank-transactions-online/L1bTafTz3_US_en_US)

[3] [FreshBooks — Accept payments](https://www.freshbooks.com/accept-payments)

## Görsel Uygulama Notu

Xero'nun banka eşleştirme anlatımında hesap özeti, dikkat isteyen hareketler ve kullanıcı denetimi aynı çalışma alanında bulunur. MoneyFlow bankalar ekranında bu nedenle kartlardaki bakiye ve eşleşme durumu üstte; karar verilmesi gereken işlem tablosu altta konumlanacaktır. FreshBooks'un satış/ödeme akışı, oluşturma–tahsilat–otomatik güncelleme zincirini açık şekilde ayırır; MoneyFlow satış kartları da bu doğrusal ilerlemeyi durum rozeti ve bağlı müşteri/fatura ilişkisiyle görünür kılacaktır.

---

### 📄 `accounting_models.md`

# MoneyFlow Muhasebe Yönetimi Veri ve Akış Modeli

## Ortak Veri Bağlamı

| Modül | Mevcut kaynaktan türetilen veri | Kullanıcı eylemi | Yansıdığı yer |
| --- | --- | --- | --- |
| Muhasebe | Fatura, gider, banka hareketi ve manuel düzeltme fişleri | Dengeli manuel fiş ekleme | Günlük defter, hesap planı bakiyeleri, aktivite akışı |
| Hesap Planı | Kaynak kayıtların muhasebe sınıfları ve banka/ticari bakiyeler | Hesap ekleme, tür/grup filtresi | Yeni manuel fiş seçimi, hesap bakiyesi tablosu |
| Arşiv | Başlangıç arşiv kayıtları ve geri yükleme durumu | Filtreleme, geri yükleme, kaynağa dönüş | Belge yaşam döngüsü ve aktivite kaydı |
| Ayarlar | Şirket, mali dönem, belge ve ödeme tercihleri | Kaydetme, demo verisini sıfırlama | Fatura/muhasebe başlıkları ve sonraki oturumlar |

## Veri Yapıları

| Varlık | Temel alanlar | Bağlam kuralı |
| --- | --- | --- |
| `JournalEntry` | tarih, fiş no, kaynak, açıklama, satırlar, borç, alacak | Kaynak türü fatura/gider/banka ise referans belgeyi taşır; manuel kayıtta borç toplamı alacak toplamına eşit olmadan kaydetme kapalıdır. |
| `ChartAccount` | kod, ad, tür, grup, normal bakiye, aktiflik | Fiş satırlarının ve rapor sınıflandırmasının ortak sözlüğüdür. |
| `ArchiveItem` | belge türü, referans, tutar, tarih, arşiv nedeni, kaynak | Silme değil geri yüklenebilir operasyonel arşivdir; kaynak bilgisi korunur. |
| `CompanySettings` | şirket unvanı, vergi kimliği, mali dönem, varsayılan KDV, fatura ön eki, ödeme vadesi | Yerel saklama içinde sürdürülür; yalnızca ayarlar ekranından değişir. |

## Uygulama Kısıtları

1. Muhasebe toplamları, fatura ve giderler üzerinden türetilen satırların yanı sıra banka/satış referanslarını görünür kılar; modül paralel bir veri evreni yaratmaz.
2. Hesap planı bakiyeleri; banka hesapları, bekleyen müşteri/ticari borçlar ve kaynak belgelerden türetilmiş özetler olarak gösterilir.
3. Arşivde geri yüklenen öğe yalnızca arşiv görünümünden çıkarılır; geçmiş kaynak bağlantısı ve denetim izi korunur.
4. Ayarlar kaydedildiğinde ekrana geri bildirim ve aktivite kaydı eklenir; demo sıfırlama açıkça ayrıştırılmış bir riskli eylemdir.

---

### 📄 `accounting_references.md`

# MoneyFlow Muhasebe Yönetimi Araştırma Notları

## İncelenen Kamuya Açık Kaynaklar

| Kaynak | Çıkarılan ürün kalıbı | MoneyFlow'a uyarlama |
| --- | --- | --- |
| [QuickBooks günlük fişi rehberi](https://quickbooks.intuit.com/learn-support/en-us/help-article/accounting-bookkeeping/create-journal-entry-quickbooks-online/L6Bzy9mT9_US_en_US) | Fiş her satırda hesap seçimi, borç/alacak tutarı ve açıklama taşır; kayıt öncesinde toplam borç ile toplam alacak dengesi görünür olmalıdır. | Muhasebe modülü, fatura/gider/satış/banka kaynağına bağlı fiş satırlarını ve dengeli çift kayıt özetini gösterecek; manuel düzeltme fişi eklemeden önce borç-alacak eşitliğini kontrol edecektir. |
| [Xero hesap planı destek akışı](https://central.xero.com/s/article/Add-or-edit-an-account-in-your-chart-of-accounts) | Hesap planı hesabı; kod, ad, tür ve kullanım bağlamıyla düzenlenir; ekleme/düzenleme ana çalışma akışının parçasıdır. | Hesap Planı modülü, kod–hesap adı–tür–bakiye hiyerarşisini; hesap ekleme iletişim kutusunu ve arama/filtre araçlarını kullanacaktır. |
| [FreshBooks arşivleme rehberi](https://support.freshbooks.com/hc/en-us/articles/360000027187-How-does-archive-or-delete-work) | Aktif, arşivlenmiş ve silinmiş kayıtlar ayrı görünür; arşivlenen kayıtlar ana listelerden çıkar ancak rapor ve arama bağlamı korunur, sonradan geri yüklenebilir. | Arşiv modülü, aktif veriyi silmeden fatura/gider/satış/banka belgelerinin anlık durumunu koruyacak; tür ve durum filtresiyle arşiv kaydını ilgili kaynak ekranına geri götürecektir. |

## Uygulama İlkeleri

1. Yeni modüller yeni, kopuk veri setleri oluşturmayacak; mevcut fatura, gider, satış ve banka hareketleri üzerinden türetilmiş görünürlük sağlayacaktır.
2. Muhasebe ekranında her fiş için kaynak belge, borç/alacak toplamı, durum ve dönem bilgisi tek satırda izlenebilir olacaktır.
3. Hesap planı yalnızca yönetim listesi değil, fişlerdeki ve raporlardaki hesap sınıflandırmasını açıklayan ortak sözlük görevi görecektir.
4. Arşivleme, kalıcı silme yerine geri yüklenebilir operasyonel düzenleme olarak sunulacaktır.
5. Ayarlar, şirket/fatura dönemi ve belge tercihleriyle sınırlı kalacak; demo sıfırlama eylemi ayrı ve açıklamalı bir riskli eylem alanında tutulacaktır.

---

### 📄 `settings_model.md`

# MoneyFlow Kategorili Ayarlar Veri Modeli

| Kategori | Kaydedilecek tercihler | Mevcut bağlama etkisi |
| --- | --- | --- |
| Profil | ad, kullanıcı e-postası, telefon, şifre güncelleme bildirimi | Kullanıcı kimliği ve finans iletişimi alanlarını ayırır; müşteri/ticari kayıtları değiştirmez. |
| Şirket | unvan, vergi numarası, telefon, finans e-postası, web sitesi, adres, mali yıl | Fatura, fiş ve rapor üst bilgisinin ortak kaynağıdır. |
| Bildirimler | e-posta, fatura hatırlatma, gider uyarısı, ödeme bildirimi, haftalık/aylık rapor | Mevcut vade, eşleştirme, tahsilat ve rapor akışlarının görünür tercih katmanıdır. |
| Sistem | para birimi, tarih biçimi, varsayılan KDV, fatura ön eki, ödeme vadesi, otomatik eşleştirme | Yeni belge ve banka iş akışlarının varsayılanlarını tanımlar. |
| Güvenlik | oturum süresi, iki aşamalı doğrulama demosu, yeni cihaz bildirimi | Demo kullanıcı oturum tercihlerinin yerel görünümünü sağlar; gerçek kimlik doğrulama iddiasında bulunmaz. |
| Veri Yönetimi | dışa aktarma biçimi, arşiv saklama süresi, yerel veri durumu, demo sıfırlama | Arşiv ve raporlarla bağ kurar; sıfırlama diğer ayarlardan ayrı, teyitli riskli eylemdir. |

## Arayüz Kararı

Ayarlar ekranı iki kolonlu düzen kullanacaktır. Sol kolonda altı kategori, sağda ise seçili kategoriye ait panel yer alacaktır. Satır bazlı anahtarlar bildirim ve güvenlik tercihleri için kullanılacak; şirket ve sistem seçenekleri giriş/seçim alanlarıyla düzenlenecektir. Her panel, kaydetme sonrası aynı yerel `settings` nesnesini günceller; böylece veriler sayfa geçişlerinde ve tarayıcı yenilemesinde korunur.

---

### 📄 `settings_reference.md`

# MoneyFlow Ayarlar Referans Notları

## Referans Uygulamada Görünen Yapı

Referans MoneyFlow uygulamasının Ayarlar ekranı, tek bir uzun form yerine sol tarafta kategori menüsü ve sağda seçili kategorinin detay paneliyle kuruludur. Görünür kategoriler şunlardır: **Profil**, **Şirket**, **Bildirimler**, **Sistem**, **Güvenlik** ve **Veri Yönetimi**.

| Referans kategorisi | Görünen tercih kalıbı | MoneyFlow'a uyarlama |
| --- | --- | --- |
| Profil | Ad soyad, e-posta, telefon ve şifre değiştirme alanları | Kullanıcı/ekip profili, finans e-postası ve oturum tercihleri |
| Şirket | Kurumsal yapılandırma için ayrı bölüm | Şirket unvanı, vergi bilgisi, mali dönem, tahsilat hesabı ve fatura düzeni |
| Bildirimler | Kategori tabanlı haberleşme ayarları | Vade, banka eşleştirme, tahsilat ve haftalık finans özeti anahtarları |
| Sistem | Davranışsal uygulama tercihleri | Varsayılan KDV, para birimi, tarih biçimi ve belge numarası ayarları |
| Güvenlik | Şifre ve erişim odaklı tercih alanı | Oturum zaman aşımı, iki aşamalı doğrulama demosu, yeni cihaz bildirimi |
| Veri Yönetimi | Veri yaşam döngüsü alanı | Demo sıfırlama, dışa aktarma açıklaması ve yerel saklama durumu |

## Ek Görsel Bulgular

Şirket paneli; logo alanı, şirket adı, vergi numarası, telefon, e-posta, web sitesi ve adresle kurumsal profil bilgisini ayrı tutuyor. Bildirimler paneli ise her tercih için kısa etiketli, satır bazlı anahtarlar kullanıyor. Görünen bildirim tercihleri; **E-posta Bildirimleri**, **Fatura Hatırlatmaları**, **Gider Uyarıları**, **Ödeme Bildirimleri**, **Haftalık Raporlar** ve **Aylık Raporlar**.

## Uygulama Kararı

MoneyFlow ayarları, mevcut tek sayfalı şirket formu yerine bu altı kategoriyi içeren sekmeli bir yönetim paneline dönüşecektir. Tüm tercihler mevcut yerel `settings` nesnesine ek alanlarla kaydedilecek; demo sıfırlama eylemi yalnızca Veri Yönetimi kategorisinde, diğer tercihlerden görsel olarak ayrışmış riskli eylem olarak kalacaktır. Şirket alanına adres ve web sitesi, Bildirimler alanına satır bazlı çalışan anahtarlar eklenecektir.

---

### 📄 `operation_models.md`

# MoneyFlow Operasyon Modülleri: Uygulama Sözleşmesi

## Fatura Ayrıntısı

Fatura listesinde bir satıra tıklamak, belge odaklı ayrı bir görünüm açar. Bu görünümde durum rozeti, fatura numarası, düzenleme/vade tarihi, müşteri bilgileri, MoneyFlow gönderen bilgileri, kalemler, ara toplam, KDV, genel toplam, ödeme notu ve fatura hareketleri bulunur. Görünümde geri dönme, yazdırma ve ödeme kaydetme eylemleri yer alır.

| Alan | Tür | Kullanım |
| --- | --- | --- |
| `lineItems` | Açıklama, miktar, birim fiyat, KDV oranı dizisi | Belge kalemlerini ve toplamları oluşturmaya yarar. |
| `paymentNote` | Metin | Banka/havale açıklamasını fatura üzerinde görünür kılar. |
| `status` | Taslak, Gönderildi, Ödendi, Vadesi Geçti | Tahsilat, rozet ve eylem görünürlüğünü belirler. |

## Giderler

Gider, ödenmiş veya bekleyen bir para çıkışı olarak ele alınır. Liste görünümünde kategori, tedarikçi, belge numarası, ödeme durumu, tutar ve vade; ayrıntıda ise açıklama ve ödeme yöntemi bulunur. Yeni gider, düzenleme, silme, arama, kategori/durum filtreleri ve "ödendi olarak işaretle" işlemleri yerel veri akışını değiştirir.

| Alan | Tür | Kullanım |
| --- | --- | --- |
| `supplierId` | Tedarikçi referansı | Gideri alacaklı profiline bağlar. |
| `category` | Kategori | Dashboard ve liste filtrelerinde sınıflandırma sağlar. |
| `status` | Bekliyor, Ödendi, Vadesi Geçti | Açık borç, bekleyen ödeme ve uyarıları hesaplar. |
| `paymentMethod` | Banka transferi, kart, nakit | Kaydın operasyonel bağlamını açıklar. |

## Tedarikçiler

Tedarikçi, giderlerin bağlandığı ve açık borçların toplandığı ayrı bir profildir. Kart görünümü iletişim bilgisi, hizmet kategorisi, ödeme vadesi, açık borç ve son gider tarihini sunar. Tedarikçiyi silmek yerine pasife alma/arşivleme davranışı uygulanır; bağlı giderler korunur.

| Alan | Tür | Kullanım |
| --- | --- | --- |
| `status` | Aktif, Pasif | Yeni gider formunda seçilebilirliği kontrol eder. |
| `paymentTerm` | Metin | Varsayılan vade anlaşmasını açıklar. |
| `category` | Hizmet sınıfı | Kart içi bağlam ve filtre sunar. |

## Hesaplama ve Aktivite Kuralları

Dashboard toplam gideri, yalnızca **Ödendi** giderlerin tutarından türetilir. Bekleyen ödemeler, **Bekliyor** veya **Vadesi Geçti** giderlerden; tedarikçiye açık borç ise bu durumlarda o tedarikçiye bağlı giderlerden hesaplanır. Yeni/düzenlenen/silinen her fatura, gider veya tedarikçi kaydı zaman damgalı aktivite oluşturur. Tüm kayıtlar tarayıcı yerel saklamasında tutulur ve "Demo verisini sıfırla" eylemiyle geri yüklenir.

---

### 📄 `operations-modules-research.md`

# Otomasyonlar, ERP ve Belgeler — Araştırma Notları

## Doğrulanmış Tasarım İlkeleri

| Alan | Kaynak bulgusu | MoneyFlow uyarlaması |
|---|---|---|
| ERP ürün/hizmet kataloğu | Katalog yönetimi, ürün ya da hizmetlerin kategori, nitelik, fiyat ve yaşam döngüsü bilgileriyle tek bir yapıda yönetilmesine dayanır.[1] | ERP ekranında ürün/hizmet kartları; kategori, birim, satış fiyatı, maliyet, durum ve bağlı satış sayısı sunulacak. |
| Otomasyon izleme | Otomasyon sistemleri, kural tanımı yanında çalıştırma geçmişi, durum ve hata bağlamını görünür tutar.[2] | Otomasyonlar ekranında etkin/pasif kurallar, son çalışma sonucu, çalıştırma sayısı, işlem özeti ve müdahale gerektiren hata durumu gösterilecek. |
| Belgeler ve ERP ilişkisi | DMS yaklaşımı belgeleri yakalama, sınıflandırma, saklama ve kolay erişim için merkezi arşivde toplar; aynı belge birden çok iş nesnesiyle ilişkilendirilebilir.[3] | Belgeler ekranı tip, etiket, kaynak modül ve müşteri/tedarikçi ilişkisiyle filtrelenebilir arşiv olacak; belge kartları ilgili iş bağlamına yönlendirecek. |

## Uygulama Kararı

Belge ekranı, yalnızca indirilebilir demo örnekleri yerine gerçek dosya yükleme ve kalıcı erişim gerektirdiği için uygulamanın dosya depolama yeteneğine bağlanmalıdır. Arayüz; merkezi arşiv, filtreler, hızlı yükleme, belge türü ve ilişkili kayıt yaklaşımını koruyacaktır.

## References

[1]: https://pimcore.com/en/resources/insights/what-is-product-catalog-management "Pimcore — Product Catalog Management: A Deep Dive"
[2]: https://zapier.com/blog/updates/504/new-task-history "Zapier — New Task History: Better See and Search Your Zapier Usage"
[3]: https://start.docuware.com/blog/document-management/integrate-your-erp-with-document-management "DocuWare — Why You Should Integrate Your ERP with Document Management"

---

### 📄 `research_references.md`

# Operasyon Modülleri Referans Notları

Bu notlar yalnızca kamuya açık ürün belgeleri ve tanıtım sayfalarından çıkarılmış uygulama kalıplarını içerir. MoneyFlow'a özgü görsel dil ve Türkçe iş akışları korunacak; herhangi bir ürünün marka kimliği veya birebir ekran varlığı kopyalanmayacaktır.

| Kaynak | Uygulanabilir kalıp | MoneyFlow'a uyarlama |
| --- | --- | --- |
| Xero çevrim içi faturalama | Markalı fatura şablonu, ödeme koşulları, müşteri bilgilerinin otomatik dolması, fatura durumunun görünür olması ve PDF ile paylaşım | Fatura satırından açılan ayrı bir önizleme sayfası; satıcı ve müşteri blokları, kalemler, vergi/ara toplam/toplam, vade, durum ve yazdırma görünümü. |
| QuickBooks iş akışları | Fatura, gider ve ödeme kayıtlarında koşul-temelli hatırlatma, onay ve bildirim akışı | Bu sürümde her fatura/gider değişikliği aktivite günlüğüne yazılacak; vadesi yaklaşan veya geciken kayıtlar semantik uyarı olarak gösterilecek. |
| FreshBooks tedarikçi yönetimi | Tedarikçi profili, bu tedarikçiye ait açık faturalar, hızlı "Yeni Gider" eylemi, kart bilgileri ve açık borç görünümü | Tedarikçi kartında iletişim bilgisi, kategorisi, açık borç, son gider ve "Gider Ekle" kısayolu; silme öncesi onay ve tedarikçiye bağlı giderleri koruyan davranış. |

## Uygulama Kararları

Fatura görünümü, yalnızca bir tablo kaydı değil, ayrı bir belge yüzeyi olacaktır. Belge üzerinde durum rozeti, fatura numarası, düzenleme/vade tarihi, müşteri ve şirket blokları, tahsilat özeti ve kalem tablosu yer alacaktır. Kullanıcı önizlemeyi yazdırma düzenine geçirebilecek; "PDF indir" yerine ilk sürümde tarayıcının yazdırma işlevi kullanılacaktır.

Giderler, tedarikçiye bağlanan bağımsız bir işlem modeli olarak eklenecektir. Her gider; tedarikçi, kategori, açıklama, tutar, tarih, vade, ödeme durumu ve isteğe bağlı belge numarası taşıyacaktır. Dashboard'a toplam gider, bekleyen ödeme ve son gider hareketi olarak yansır.

Tedarikçiler, müşterilerden bağımsız bir alacaklı listesi olarak yönetilecektir. Silme işlemi bağlı gider kayıtlarını silmek yerine tedarikçiyi pasife alma/arşivleme davranışına dönüşecektir; bu, harcama geçmişinin korunmasını sağlar.

## Kaynaklar

[1] [Xero — Easy online invoicing software](https://www.xero.com/us/accounting-software/send-invoices/)

[2] [QuickBooks — Use workflows to automate business processes](https://quickbooks.intuit.com/learn-support/en-us/help-article/feature-preferences/use-workflows-quickbooks-online-advanced-send/L6uaB8H5G_US_en_US)

[3] [FreshBooks — What are vendors?](https://support.freshbooks.com/hc/en-us/articles/360048531852-What-are-vendors)

## Görsel Uygulama Notu

Xero'nun kamuya açık faturalama sayfası, belgeyi "oluştur–gönder–ödeme al" ekseninde sade bir hikâyeyle konumlandırır; MoneyFlow önizlemesinde bu nedenle tek bir belirgin belge yüzeyi, status/ödeme özeti ve iki kontrollü eylem kullanılacaktır. FreshBooks tedarikçi dokümantasyonunda tedarikçi profilini açık borç, hızlı gider oluşturma ve bağlı kayıtların merkezi olarak ele alır; MoneyFlow'daki tedarikçi kartları da bu bilgi mimarisini, fakat mevcut açık tema ve mavi eylem tonuyla yansıtacaktır.

---

## Bölüm 2 — Orbit Pivotu: Ürün & QA Notları

### 📄 `todo.md`

Bu dosya, projenin başından beri (GitHub aktarımı, React mimari planı, MoneyFlow modülleri, ORBIT rebrandı, eğitim kurumu pivotu) tüm checkpoint'lerin kronolojik `[x]` işaretli görev listesidir. **Tüm maddeler tamamlanmış olarak işaretlidir — açık/bekleyen madde yoktur.**

# GitHub Aktarım Kontrol Listesi

- [x] Özel `ardabulent/Dashboard-try1` deposu için GitHub token erişim kapsamını doğrula.
- [x] MoneyFlow proje dosyalarını hedef depoya aktar.
- [x] Uzak depodaki son commit'i doğrula ve sonucu bildir.

# Son Sürüm GitHub Aktarımı

- [x] Yerel son checkpoint ile uzak `main` dalının durumunu doğrulamak.
- [x] Ayarlar geliştirmesi dahil güncel proje sürümünü GitHub'a aktarmak.
- [x] Uzak commit'i doğrulayıp aktarım sonucunu bildirmek.

# React ve Tasarım Mimari Planı

- [x] Mevcut teknoloji yığınını ve istemci tarafı mimarisini doğrulamak.
- [x] Tasarım kalitesini koruyan React odaklı uygulama yol haritasını hazırlamak.
- [x] Yalnızca planı ve teknik kararı kullanıcıya sunmak.

# Gün Planı Modülü

- [x] Referans kanban deneyimini MoneyFlow bağlamına uyarlamak ve görev veri modelini tanımlamak.
- [x] Gün Planı ekranını, görev kartlarını, kolonları, filtreleri ve oluşturma/düzenleme akışlarını uygulamak.
- [x] Görevleri yerel saklamaya bağlamak; navigasyon ve günlük özet metrikleriyle ilişkilendirmek.
- [x] Gün Planı akışlarını ve masaüstü/mobil görünümünü doğrulayıp güncellemeyi teslim etmek.

# Sol Navigasyon Gruplama

- [x] Hedef navigasyon kategorilerini ve mevcut ekran geçişlerini doğrulamak.
- [x] Dashboard, Gün Planı ve Raporlar üst seviye; Finans ve CRM grupları ile yönetim bölümünü uygulamak.
- [x] Sıralama, aktif durumlar ve mobil navigasyon geçişlerini doğrulayıp güncellemeyi teslim etmek.

# Randevu Yönetimi Modülü

- [x] Randevu veri modelini, müşteri bağlantısını ve aylık takvim akışını tanımlamak.
- [x] Büyük aylık takvim, gün bazlı görüşme listesi ve yeni görüşme oluşturma arayüzünü uygulamak.
- [x] Görüşme verilerini yerel saklamaya ve CRM navigasyonuna bağlamak.
- [x] Takvim görünümünü, görüşme CRUD akışlarını ve responsive kullanımını doğrulayıp güncellemeyi teslim etmek.

# Monday CRM Marketplace Tasarım Analizi

- [x] Marketplace bilgi mimarisini, kategori yapısını ve ürün keşif kalıplarını incelemek.
- [x] MoneyFlow için alınabilir tasarım desenlerini, bekletilmesi gereken fikirleri ve öncelik sırasını değerlendirmek.
- [x] Kaynaklı analiz raporunu kullanıcıya sunmak; uygulama kodunda değişiklik yapmamak.

# Müşteri Bağlamı ve Aksiyon Görünürlüğü

- [x] Müşteri, satış, fatura, tahsilat, randevu ve aktivite verilerinden ilişki özeti üretmek.
- [x] Müşteri kartlarında ilişkili finansal ve CRM bağlamını görünür kılmak.
- [x] Dashboard üzerinde takip gerektiren tahsilat, görüşme ve müşteri aksiyonlarını bağlamak.
- [x] Yeni bağlam yüzeylerini ve yönlendirme akışlarını doğrulayıp güncellemeyi teslim etmek.

# Sol Navigasyon Tutarlılık Düzeltmesi

- [x] Çalışma alanları arasındaki sol navigasyon farkının kaynağını belirlemek.
- [x] Ortak kategori düzenini tüm çalışma alanlarına uygulamak.
- [x] Finans, CRM ve muhasebe bölümleri arasındaki geçişlerde menü tutarlılığını doğrulamak.

# Sade Müşteri Deneyimi ve Detay Çekmecesi

- [x] Müşteri kartlarındaki teknik terimleri anlaşılır kullanıcı diliyle değiştirmek.
- [x] Müşterinin finansal, görüşme ve aktivite bağlamını gösteren detay çekmecesini uygulamak.
- [x] Detay çekmecesinden yeni görüşme planlama ve ilgili kayıtlara yönlendirme akışlarını eklemek.
- [x] Sadeleştirilmiş müşteri deneyimini masaüstü/mobil görünümde doğrulayıp güncellemeyi teslim etmek.

# Müşteri Notu Deneyimi

- [x] Mevcut müşteri notu verisini ve detay çekmecesindeki uygun yerleşimi değerlendirmek.
- [x] Detay çekmecesinde müşteri notunu düzenleme, kaydetme ve zaman damgalı geçmiş deneyimini uygulamak.
- [x] Notun yerel veri akışına, müşteri kartına ve aktivite günlüğüne yansımasını doğrulamak.

# Otomasyonlar, ERP ve Belgeler Çalışma Alanları

- [x] Profesyonel otomasyon, ürün/hizmet yönetimi ve belge arşivi kalıplarını araştırmak; kalıcı dosya gereksinimini netleştirmek.
- [x] Otomasyon kuralı, ürün/hizmet ve belge veri modellerini merkezi MoneyFlow yapısına eklemek.
- [x] Raporlar altında Otomasyonlar, ERP ve Belgeler bağlantılarını; ekranlarını ve temel CRUD akışlarını uygulamak.
- [x] Belgeler için uygun kalıcı depolama yaklaşımını etkinleştirip yükleme ve erişim akışını bağlamak.
- [x] Yeni çalışma alanlarını masaüstü/mobil görünümde ve uçtan uca doğrulayıp güncellemeyi teslim etmek.
- [x] Otomasyon kuralları için silme eylemi ve kullanıcı geri bildirimi eklemek.
- [x] ERP ürün/hizmet kayıtları için silme eylemi ve kullanıcı geri bildirimi eklemek.
- [x] Belgelerde dosya seçme alanını görünür, klavye erişilebilir ve otomasyonla doğrulanabilir hale getirmek.
- [x] Yeni çalışma alanlarının masaüstü ve mobil görünümlerini yeniden doğrulamak.

# MoneyFlow Demo Genişletme Kontrol Listesi

- [x] CRM referansından alınabilecek arama, filtre, kart/liste ve eylem kalıplarını değerlendirmek.
- [x] MoneyFlow için öncelikli modül kapsamını, demo veri modelini ve kullanıcı akışlarını önermek.
- [x] Yerel saklama ve başlangıç demo verileri için müşteri, fatura ve aktivite veri modellerini kurmak.
- [x] Müşteriler modülünde arama, durum filtresi, ekleme, düzenleme ve silme akışlarını uygulamak.
- [x] Faturalar modülünde durum filtreleri, kayıt formu, düzenleme ve silme akışlarını uygulamak.
- [x] Dashboard metriklerini ve son işlemleri yerel veriden türetmek; aktivite akışına bağlamak.
- [x] Uçtan uca demo senaryolarını doğrulayıp projeyi güncellemek.

# MoneyFlow Operasyon Modülleri Kontrol Listesi

- [x] Kamuya açık profesyonel muhasebe ürünlerinde fatura ayrıntısı, gider ve tedarikçi deneyimlerini araştırmak.
- [x] Araştırma bulgularını MoneyFlow arayüzü, yerel veri modeli ve akışlarına uyarlamak.
- [x] Fatura ayrıntısı ve baskı düzenine uygun önizleme görünümünü uygulamak.
- [x] Giderler modülünde kayıt, kategori, tedarikçi, arama, filtre ve durum akışlarını uygulamak.
- [x] Tedarikçiler modülünde kart/liste, açık borç, arama, filtre ve CRUD akışlarını uygulamak.
- [x] Fatura, gider ve tedarikçi işlemlerinin dashboard metrikleri ile aktivite günlüğüne etkisini doğrulamak.

# MoneyFlow Finans Modülleri Kontrol Listesi

- [x] Kamuya açık profesyonel ürünlerde banka hareketi, satış ve raporlama deneyimlerini araştırmak.
- [x] Araştırma bulgularını MoneyFlow veri modeli, finansal metrikler ve ekran akışlarına uyarlamak.
- [x] Bankalar modülünde hesap özeti, hareket listesi, arama, filtre ve eşleştirme durumlarını uygulamak.
- [x] Satışlar modülünde teklif/sipariş akışı, durumlar, müşteri bağlantısı ve tutar özetlerini uygulamak.
- [x] Raporlar modülünde dönem filtreli gelir-gider, nakit akışı ve tahsilat görünümlerini uygulamak.
- [x] Banka, satış ve raporlama verilerinin fatura/gider işlemleriyle tutarlı hesaplandığını doğrulamak.

# MoneyFlow Muhasebe Yönetimi Modülleri Kontrol Listesi

- [x] Kamuya açık profesyonel ürünlerde genel muhasebe, hesap planı, arşiv ve ayar deneyimlerini araştırmak.
- [x] Araştırma bulgularını mevcut MoneyFlow veri modeli ve finans modülleri bağlamına uyarlamak.
- [x] Muhasebe modülünde günlük fişleri, borç-alacak dengesi ve kaynak kaydı bağlantılarını uygulamak.
- [x] Hesap Planı modülünde hesap grupları, bakiye görünümü, arama/filtreleme ve hesap ekleme akışını uygulamak.
- [x] Arşiv modülünde belge türleri, durum filtreleri ve kayıt kaynaklarına geri dönüş akışını uygulamak.
- [x] Ayarlar modülünde şirket, dönem, belge tercihleri ve veri sıfırlama kontrollerini uygulamak.
- [x] Yeni modüllerin fatura, gider, satış ve banka verileriyle bağlamı koruduğunu doğrulamak.

# MoneyFlow Ayarlar Deneyimi Kontrol Listesi

- [x] Referans MoneyFlow ayarlar yapısındaki görünür tercih kategorilerini incelemek.
- [x] Şirket, belge, tahsilat, bildirim ve ekip tercihlerinin mevcut yerel veri modeline etkisini tanımlamak.
- [x] Kategorili Ayarlar arayüzünü, anahtarlar ve seçim kontrolleriyle uygulamak.
- [x] Yeni tercihlerin kaydedildiğini, modül bağlamını bozmadığını ve demo sıfırlamayla geri alındığını doğrulamak.

# Otomasyon Kataloğu ve Bağımsız Kaydırma

- [x] Ticari otomasyon araştırmasını n8n uyumlu kategori ve şablon listesine dönüştürmek.
- [x] Otomasyonlar ekranını görsel referanstaki ikonlu, kategorili kart kataloğuna dönüştürmek.
- [x] Satış, CRM, finans, belge, destek, iletişim ve raporlama otomasyonlarını yerel etkinleştirme akışına eklemek.
- [x] Sol menüyü kendi dikey kaydırma alanına, içerik gövdesini ayrı kaydırma alanına dönüştürmek.
- [x] Otomasyon kataloğunu ve bağımsız kaydırmayı masaüstü/mobilde doğrulamak. Mobil ölçüm: yan menü scrollTop=180, sayfa scrollY=420.
- [x] Gerçek n8n webhook/API bağlantısını bu aşamada eklememek; entegrasyon secret gereksinimini sonraki aşamaya bırakmak.
- [x] Güncel geliştirmeleri yeni checkpoint ve GitHub aktarımıyla teslim etmek.

## Araştırma notu

Ayrıntılı kaynaklı bulgular `automation-research.md` dosyasında tutulur. Ana kaynaklar: n8n AI ve Sales katalogları, Zapier resmi otomasyon örnekleri ve Make resmi şablon kataloğu.

Referanslar: https://n8n.io/workflows/categories/ai/ · https://n8n.io/workflows/categories/sales/ · https://zapier.com/blog/zapier-automation-examples/ · https://www.make.com/en/templates

# ORBIT Giriş Ekranı Yenilemesi

- [x] Kullanıcının sağladığı ORBIT logosunu web varlığı olarak hazırlamak ve giriş ekranına bağlamak.
- [x] Yumuşak mavi gradyan, cam kart, lacivert birincil eylem ve Plus Jakarta Sans tipografisiyle giriş yüzeyini yeniden tasarlamak.
- [x] Demo giriş, şifre görünürlüğü, hatırlama seçeneği ve yönlendirme akışlarını korumak.
- [x] Yeni giriş ekranını masaüstü ve mobil görünümde doğrulamak.
- [x] Güncel tasarımı checkpoint ve GitHub aktarımıyla teslim etmek.

# ORBIT Dashboard Tasarım Sistemi

- [x] Referans görseldeki ferah ürün arayüzü ilkelerini MoneyFlow bilgi mimarisine uyarlamak.
- [x] ORBIT renk, tipografi, yüzey, kenarlık, yoğunluk ve etkileşim tokenlarını ortak stillerde tanımlamak.
- [x] Sol menü, üst çubuk, ana dashboard ve çalışma alanı kabuklarını ORBIT tasarım diline uyarlamak.
- [x] Kart, tablo, filtre ve operasyon ekranlarını daha rahat okunur yüzeylerle yenilemek.
- [x] Masaüstü ve mobil görünümde ana navigasyon, dashboard ve örnek çalışma alanlarını doğrulamak.
- [x] Güncel tasarımı checkpoint ve GitHub aktarımıyla teslim etmek.

# Tema Paletleri ve Dashboard Karşılama

- [x] Video referansındaki tema değişimi hissini inceleyip MoneyFlow'a uygun animasyon yaklaşımını belirlemek.
- [x] Ayarlar içinde seçilebilir renk paletleri eklemek ve seçimi yerel ayarlara bağlamak.
- [x] Seçilen paleti dashboard, navigasyon, kartlar, tablolar ve çalışma alanlarına ortak tokenlarla uygulamak.
- [x] Dashboard üstüne ayrı, yumuşak giriş animasyonlu karşılama alanı eklemek.
- [x] Karşılama animasyonunu prefers-reduced-motion ve mobil görünümle uyumlu hale getirmek.
- [x] Tema değişimi ve karşılama alanını masaüstü/mobilde doğrulamak. 375px mobil ölçümünde Dashboard, Otomasyonlar ve Faturalar: overflow=false; karşılama metni ve içerik genişliği taşmadı.
- [x] Güncel değişiklikleri checkpoint ve GitHub aktarımıyla teslim etmek.

# ORBIT Girdap Logo Animasyonu

- [x] Mevcut logo kullanımını ve login/dashboard animasyon katmanlarını incelemek.
- [x] ORBIT işaretini üç çizgi katmanı olarak animasyonlanabilir SVG/React bileşenine dönüştürmek.
- [x] Çizgileri merkeze döndüren, tek noktada birleştiren ve sıçramayla eski forma döndüren döngüyü uygulamak.
- [x] Aynı girdap animasyonunu login logosuna ve dashboard karşılama alanına bağlamak.
- [x] Animasyonu prefers-reduced-motion, mobil ve mevcut paletlerle doğrulamak. Login DOM: 6 çizgi / 2 logo; dashboard DOM: 3 çizgi; mobil 375px overflow=false.
- [x] Güncel animasyon sürümünü checkpoint ve GitHub aktarımıyla teslim etmek.

# Referans Video Animasyon Revizyonu

- [x] Yeniden gönderilen videoyu kare/kare ve zaman akışıyla analiz etmek.
- [x] Referans hareketindeki gerçek çizgi başlangıcı, dönüş yönü, birleşme ve geri sıçrama fazlarını belgelemek.
- [x] Mevcut OrbitMark animasyonunu referans geometri ve zamanlamaya göre yeniden oluşturmak.
- [x] Login ve dashboard logolarındaki yeni animasyonu görsel olarak doğrulamak. Dashboard DOM: 6 kanat, orbit-wing-path 5.6s, orbit-core-pop 5.6s.
- [x] Güncellenen animasyonu prefers-reduced-motion ve 375px mobil görünümde doğrulamak. Mobil: width=375, overflow=false, loginWings=6, welcomeWings=6; reduced-motion: animation=none, duration=0s.
- [x] Yeni referans animasyon sürümünü checkpoint ve GitHub aktarımıyla teslim etmek.

# ORBIT Animasyon Görsel Düzeltme

- [x] Referans videodan başlangıç, birleşme ve geri dönüş karelerini yeniden çıkarmak.
- [x] Mevcut OrbitMark görsel formunu referansla karşılaştırıp bozulan geometriyi düzeltmek.
- [x] Login ve dashboard animasyonunu yeniden uygulamak.
- [x] Login ve dashboard için farklı döngü fazlarında görsel ekran görüntüleri almak ve karşılaştırmak.
- [x] 375px mobil ve prefers-reduced-motion davranışını tekrar doğrulamak.
- [x] Düzeltmeyi yeni checkpoint ve GitHub aktarımıyla teslim etmek.
- [x] Son ORBIT görsel düzeltmesinden sonra 375px mobil viewportta login ve dashboard animasyonlarını yeniden doğrulamak.
- [x] Son ORBIT görsel düzeltmesinden sonra prefers-reduced-motion modunda login ve dashboard logolarını yeniden doğrulamak.

# ORBIT Animasyonlarını Kaldırma

- [x] Login ve dashboard karşılama alanlarında animasyon katmanlarını kaldırıp statik ORBIT logosunu korumak.
- [x] Giriş karşılama metnini, kartını ve responsive yerleşimini değiştirmeden korumak.
- [x] Statik logo görünümünü masaüstü ve mobilde doğrulamak; test ve production build çalıştırmak.
- [x] Değişikliği yeni checkpoint ile teslim etmek.
- [x] Statik ORBIT logo değişikliğinden sonra yeni bir checkpoint kaydetmek.
- [x] Yeni checkpoint sürümünü doğrulayıp kullanıcıya teslim etmek.
- [x] Statik ORBIT logo değişikliğinden sonra kaydedilen checkpoint (2269c3cf) bilgisini kullanıcıya kısa bir teslim mesajıyla iletmek.
- [x] Statik ORBIT logosunun dashboard karşılama alanında masaüstü görünümünü runtime olarak doğrulamak ve kanıtı kaydetmek.
- [x] Statik ORBIT logosunun dashboard karşılama alanında 375px mobil görünümünü runtime olarak doğrulamak; overflow olmadığını ve karşılama alanının korunduğunu kanıtlamak.

# ORBIT Logo Tutarlılığı ve Yükleme Performansı

- [x] Tüm çalışma alanlarındaki farklı ORBIT logo kullanım noktalarını ortak, doğru marka bileşenine bağlamak.
- [x] Başlangıç ekranındaki logo varlığını önceden yükleyerek ilk görünümdeki gecikmeyi azaltmak.
- [x] Login, dashboard ve ortak çalışma alanlarında logo geometrisini masaüstü ve mobilde doğrulamak.
- [x] TypeScript, test ve production build doğrulamasından sonra güncel kodu GitHub `main` dalına aktarmak. GitHub `main` ve yerel HEAD: f7b5a3bc287fe9bf3a8aea3b3045d5a66f82bbdb.
- [x] ORBIT logo birleştirme değişikliğinden sonra 375px mobil viewportta login ekranı logosunu runtime screenshot ile doğrulamak.
- [x] ORBIT logo birleştirme değişikliğinden sonra 375px mobil viewportta dashboard karşılama alanı ve ortak yan menü logosunu runtime olarak doğrulamak; logo oranı ve overflow kanıtını kaydetmek. Mobil dashboard runtime görüntüsünde karşılama logosu kare ve taşmasız göründü.

# İki Bölümlü ORBIT Login Deneyimi

- [x] Mevcut login tasarım dilini koruyarak geniş ekranda formu sol bölüme taşımak.
- [x] Karşılama alanındaki ikinci ORBIT logosunu kaldırıp yalnızca sol üstteki logo kullanımını korumak.
- [x] Formun sağında birleşik dashboard görseli ve ORBIT odaklı pazarlama mesajları içeren bir ürün paneli oluşturmak.
- [x] İki bölümlü login tasarımını mobilde tek kolona uyarlayıp görsel, erişilebilirlik, test ve build kontrollerini tamamlamak.
- [x] Değişikliği yalnızca yerel checkpoint olarak kaydetmek; GitHub aktarımı yapmamak. Yerel checkpoint: 5d905430.
- [x] İki bölümlü login değişikliğinden sonra `pnpm check`, `pnpm test` ve `pnpm build` çalıştırıp sonuçları kaydetmek.
- [x] İki bölümlü login ekranında temel erişilebilirlik doğrulamasını; tek logo, form label/aria, klavye erişimi ve mobil tek kolon açısından kanıtlamak.

# Premium Login Sağ Panel Revizyonu

- [x] Sağ paneldeki dekoratif aura ve aşırı cam/glow etkilerini azaltıp daha rafine finans ürünü yüzeyine dönüştürmek.
- [x] ORBIT çalışma alanı etiketi, güncel durumu ve alt sloganı daha sade ve premium hale getirmek.
- [x] Dashboard özet kartlarında başlık, ikon, tipografi, boşluk ve durum hiyerarşisini profesyonel finans arayüzü standardına yaklaştırmak.
- [x] Masaüstü ve mobil login görünümünü, erişilebilirliği, test/build sonuçlarını doğrulamak.
- [x] Revizyonu yalnızca yerel checkpoint olarak kaydetmek; GitHub'a aktarmamak.

# Demo Otomasyon İlk Kurulum Akışı

- [x] Demo girişinden sonra otomasyon ilk kurulum ekranını açmak.
- [x] Kullanıcının otomasyonları kartlar üzerinden seçmesini sağlamak.
- [x] Seçilen otomasyonlara göre gerekli kurulum bilgilerini istemek.
- [x] Kurulum ekranının sağ altına görünür "Bu sayfayı geç" eylemi eklemek.
- [x] Her demo girişinde akışı yeniden göstermek; seçimleri yalnızca mevcut akışta tutmak.
- [x] Responsive, erişilebilirlik, test ve build doğrulamasını tamamlamak.
- [x] Değişikliği yalnızca yerel checkpoint olarak kaydetmek; GitHub'a aktarmamak.

# Eğitim Kurumu Platformu Planlama

- [x] ORBIT kapsamını dershane ve eğitim kurumu operasyonlarına göre yeniden çerçevelemek.
- [x] Öğrenci, veli, öğretmen, kurum yöneticisi, şube yöneticisi ve sistem yöneticisi rollerini tanımlamak.
- [x] Rol bazlı erişim, kurum/şube/sınıf hiyerarşisi ve veri görünürlüğü modelini planlamak.
- [x] Eğitim, iletişim, yoklama, ölçme-değerlendirme, ödeme ve otomasyon süreçlerini planlamak.
- [x] Eğitim kurumu MVP'sini, sonraki fazları ve entegrasyon risklerini önceliklendirmek.
- [x] Kullanıcı onayı olmadan dashboard kodunda değişiklik yapmamak.

# Eğitim Kurumu Faz 1 MVP Uygulaması

- [x] Eğitim kurumu, şube, sınıf, öğrenci, veli, öğretmen, ders ve ödeme planı için merkezi yerel demo veri modelini kurmak.
- [x] Yönetici, öğretmen, öğrenci ve veli rolleri için demo rol değiştiricisi ile rol bazlı erişim yüzeylerini eklemek.
- [x] Finans odaklı navigasyonu Genel Bakış, Öğrenciler, Sınıflar, Ders Programı, Yoklama, Sınavlar, İletişim, Kayıt ve Ödemeler, Otomasyonlar ve Raporlar yapısına dönüştürmek.
- [x] Kurum yöneticisi için öğrenci, devam, yaklaşan sınav, tahsilat ve otomasyon özetlerini içeren ana dashboard'u oluşturmak.
- [x] Öğretmen için güncel dersler, sınıflar, yoklama ve takip gerektiren öğrenciler görünümünü oluşturmak.
- [x] Öğrenci için ders programı, ödev, sınav sonuçları ve hedef görünümünü oluşturmak.
- [x] Veli için bağlı öğrenci devamı, akademik özet, duyurular ve ödeme planı görünümünü oluşturmak.
- [x] Öğrenciler, sınıflar, ders programı, yoklama, sınav/başarı, iletişim ve kayıt/ödemeler modüllerinin temel etkileşimlerini tamamlamak.
- [x] Otomasyon kataloğunu kayıt takibi, devamsızlık bildirimi, ödev hatırlatma, sınav sonucu özeti ve veli görüşmesi akışlarıyla güncellemek.
- [x] Masaüstü/mobil görünüm, rol değiştirme, kritik kullanıcı akışları, test ve production build doğrulamasını yapmak.
- [x] Değişiklikleri yalnızca yerel checkpoint olarak kaydetmek; GitHub'a aktarmamak.

# Türkiye Eğitim Kurumu Yazılım Pazarı Analizi

- [x] Türkiye'de dershane, kurs merkezi ve okul operasyon yazılımı sunan şirketleri ürün kapsamı ve hedef segmentleriyle araştırmak.
- [x] Rakiplerin ölçek sinyallerini, müşteri referanslarını, fiyatlandırma yaklaşımlarını ve entegrasyonlarını doğrulamak.
- [x] Eğitim kurumlarının satın alma sürecini, veri/regülasyon gereksinimlerini ve teknik/operasyonel giriş engellerini analiz etmek.
- [x] ORBIT için farklılaşma alanlarını, ilk hedef segmenti ve kademeli MVP/giriş stratejisini geliştirmek.
- [x] Kaynaklı analiz raporunu sunmak; kullanıcı onayı olmadan dashboard veya kod değişikliği yapmamak.

# Trakya Yerel Giriş ve Fiyatlandırma Değerlendirmesi

- [x] Trakya'daki ilk hedef kurum profilini ve yerel satış tezini değerlendirmek.
- [x] ORBIT için ürünleştirilmiş otomasyon paketleri, kurulum bedeli ve aylık abonelik mimarisini önermek.
- [x] Ücretsiz pilot, indirimli ilk müşteri ve referans programı seçeneklerini maliyet/risk açısından karşılaştırmak.
- [x] İlk 90 gün için satış, kurulum, destek kapasitesi ve ölçüm planı geliştirmek.
- [x] Fiyatlandırma önerisini yatırım tavsiyesi olmadığını belirterek kullanıcıya sunmak; dashboard veya kod değişikliği yapmamak.

# Trakya Kurs/Dershane Demo Dashboard

- [x] Mevcut dashboard'u Trakya'daki 1–5 şubeli kurs/dershane hedefine göre sadeleştirmek ve navigasyonu düzenlemek.
- [x] Kurum yöneticisi, öğretmen, öğrenci ve veli rollerinin temel ekranlarını ve yetki farklarını belirginleştirmek.
- [x] Aday kayıt, devamsızlık, deneme sonucu ve veli iletişimi otomasyon paketlerini katalog ve dashboard durumuna bağlamak.
- [x] Masaüstü ve mobil görünüm, rol akışları, test ve build doğrulamasını tamamlamak.
- [x] Değişiklikleri yerel checkpoint olarak kaydedip GitHub'a aktarmadan raporlamak.

# GitHub orbit_v2 Aktarımı

- [x] Güncel yerel kodun GitHub `orbit_v2` reposuna aktarılacağı uzak bağlantıyı ve ana dalı doğrulamak.
- [x] Güncel checkpoint/yerel çalışma kodunu `orbit_v2` ana dalına pushlamak.
- [x] Uzak commit SHA'sını ve yerel/uzak dal eşleşmesini doğrulayıp kullanıcıya raporlamak.

---

### 📄 `qa_education_mvp.md`

# Eğitim Kurumu MVP Kalite Notları

- Masaüstü eğitim login ekranında kurum yöneticisi, öğretmen, öğrenci ve veli demo rol kartları görünür durumdadır.
- Yönetici girişi sonrası kurum genel bakışı; öğrenci, sınıf, yoklama, ödemeler ve otomasyonlar menüleriyle açılmıştır.
- Öğretmen görünümü yalnızca akademik/sınıf operasyonlarını ve raporları göstererek ödeme ve otomasyon yönetimini gizlemektedir.
- Öğrenci görünümü yalnızca Genel Bakış, Ders Programı, Sınavlar ve İletişim menülerini göstermektedir.
- Login ekranındaki seçilen rol, girişten sonra rol bazlı çalışma alanına aktarılmaktadır.
- 375px mobil görünümde rol kartları iki sütunlu kalmış, giriş formu taşmadan tek akışta görünmüş ve büyük ürün paneli bilinçli olarak gizlenmiştir.
- Öğretmen rol kartı seçildiğinde öğretmen demo e-postası ve giriş eylemi güncellenmiş; giriş sonrasında sadece öğretmene açık akademik menüler gösterilmiştir.
- Yoklama ekranında öğrenci durumu değiştirilebilmiş; kaydetme işlemi sonrasında başarılı geri bildirim ve devamsızlık otomasyonu kuyruğu bildirimi görünmüştür.

---

### 📄 `verification.md`

# Doğrulama Notu

## Görsel Kontrol

Giriş ekranı, referanstaki merkezde konumlanan beyaz kart, açık mavi zemin, mavi giriş düğmesi, demo hesap kutusu ve Türkçe alan etiketleriyle karşılaştırıldı. Masaüstü ve 375 px genişlikteki küçük ekran görünümünde form alanları, düğme ve yardımcı metinler taşmadan görüntülendi.

Dashboard, demo bilgileriyle girişten sonra açıldı. Sol modül menüsü, dört finansal özet kartı, hızlı işlemler, altı aylık gelir/gider grafiği, hızlı erişim bölümü, durum kartı ve son işlemler tablosu birlikte kontrol edildi. İlk masaüstü denemesinde ana içerik alanı dikeyde yanlış hizalanmıştı; uygulama kabuğu yatay düzene geçirilerek sorun giderildi.

## İşlev Kontrolü

`demo@moneyflow.com` ve `demo123` bilgileri giriş ekranından dashboard'a geçiş sağlıyor. Hatalı bilgi için bildirim gösteriliyor; parola görünürlüğü ve hatırla seçeneği çalışıyor. Hızlı eylemler ile gezinme öğeleri kullanıcıya demo bildirimi veriyor ve çıkış kontrolü giriş ekranına dönüyor. Tür denetimi `pnpm check` ile hatasız tamamlandı.

## Yerel Veri Akışı Kontrolü

Genişletilmiş demo ekranı, başlangıç müşteri ve fatura verileriyle açıldı. Dashboard'da tahsilat, bekleyen tahsilat, vadesi geçen fatura ve aktif müşteri metrikleri yerel veriden türetildi; son faturalar ve aktivite akışı da aynı kayıt kümesinden doğru şekilde görüntülendi. Fatura sayısı, sol menüdeki rozetle eşleşti. Müşteri ve fatura modüllerindeki ekleme, düzenleme, silme, arama, durum filtresi ve ödeme kaydetme akışları ayrıca test edilecektir.

Müşteriler modülünde kart düzeni doğru yüklendi. `Nora` araması altı kayıt içinden yalnızca Nora Tasarım Stüdyosu kartını döndürdü; Yeni Müşteri eylemi erişilebilir, alanları tanımlı ve erişilebilir bir iletişim kutusu açtı.

Örnek bir müşteri formdan oluşturulduktan sonra filtre temizlendi. Kayıt sayısı altıdan yediye yükseldi ve Kuzey Ofis Çözümleri kartı iletişim bilgileri, notu ve sıfır açık bakiyesiyle listenin başında yer aldı. Bu davranış, müşteri ekleme işleminin yerel saklama ve kart görünümüyle bağlı olduğunu doğruladı.

Faturalar modülü beş kayıt ve tutar özetiyle doğru açıldı. MF-2026-018 için ödeme kaydetme eylemi çalıştırıldığında fatura durumu Gönderildi'den Ödendi'ye geçti; tahsilatın dashboard metriklerine işlendiğini belirten başarı bildirimi görüntülendi.

Ödeme sonrasında dashboard Toplam Tahsilat değeri ₺76.950,00'dan ₺101.450,00'a, ödenmiş fatura sayısı ikiden üçe yükseldi; son aktivite akışına ilgili tahsilat kaydı eklendi. Teslim öncesinde Demo verisini sıfırla eylemi kullanıldı ve başlangıç değerleri, altı müşteri, beş fatura ile başlangıç aktivite geçmişi geri yüklendi.

Tarayıcıda yeni bir oturum açıldığında sıfırlanmış başlangıç verileri tekrar yüklendi. Böylece demo verisinin tarayıcı yerel saklamasında kalıcı olduğu ve sıfırlama eyleminin bu saklamayı güncellediği de doğrulandı.

Fatura silme işlemi önce etkisini açıklayan bir onay iletişim kutusu gösterdi. Onaydan sonra MF-2026-015 kaldırıldı; fatura sayısı beşten dörde, liste toplamı ₺158.950,00'dan ₺140.050,00'a ve sol gezinmedeki fatura rozeti beşten dörde düştü. Bu testten sonra başlangıç verileri tekrar geri yüklenecektir.

## Operasyon Modülleri Kontrolü

Fatura listesinde MF-2026-018 seçildiğinde belge odaklı fatura önizlemesi açıldı. Görünümde fatura numarası, gönderildi durumu, düzenleme/vade tarihi, müşteri ve gönderen bilgileri, banka açıklaması, KDV satırı, ara toplam ve genel toplam doğru biçimde görüntülendi. Yazdırma, düzenleme ve tahsilat eylemleri erişilebilir durumdadır.

Giderler modülü dört başlangıç kaydı, tedarikçi adı, kategori, tutar, durum rozeti, arama alanı ve durum filtresiyle açıldı. GDR-2026-041 için ödeme kaydetme eylemi çalıştırıldığında kayıt Bekliyor durumundan Ödendi durumuna geçti ve başarı bildirimi görüntülendi. Bu testten sonra demo verileri başlangıç durumuna geri yüklenecektir.

Tedarikçiler modülü beş kartla açıldı. Her kartta hizmet kategorisi, iletişim bilgileri, ödeme vadesi, bağlı son gider ve yerel veriden hesaplanan açık borç görüldü; örneğin BulutKare Teknoloji kartı vadesi geçmiş GDR-2026-039 kaydından ₺7.940,00 açık borç türetti. Pusula Kreatif Ajans kartındaki Gider Ekle eylemi, tedarikçisi önceden seçili Yeni Gider formunu açtı; Vazgeç eylemi kayıt oluşturmadan formu kapattı.

Gider ödeme testinden sonra dashboard'da toplam gider ₺6.340,00'dan ₺24.540,00'a ve bekleyen ödeme ₺26.140,00'dan ₺7.940,00'a güncellendi; etkinlik günlüğüne GDR-2026-041 ödeme kaydı eklendi. Demo verisini sıfırla eylemi başlangıç müşteri, tedarikçi, fatura ve gider kayıtlarını geri getirdi. Nihai tür denetimi ve üretim paketi `pnpm check && pnpm build` ile başarıyla tamamlandı.

## Finans Modülleri Kontrolü

Yeni v4 başlangıç verileriyle giriş sonrasında dashboard açıldı. Tahsil edilmiş MFS-2026-007 satışı, Toplam Tahsilat değerini ₺113.450,00'a; onaylanmış ve faturalanmış satışlar ise Bekleyen Tahsilat değerini ₺183.100,00'a taşıdı. Bu, satış verisinin mevcut dashboard metrikleriyle birlikte hesaplandığını doğruladı.

Bankalar ekranı üç hesap kartı ve işlem bazlı eşleştirme kuyruğuyla açıldı. Operasyon Hesabı'ndaki GDR-2026-041 referanslı Pusula Kreatif hareketi Eşleştir eylemiyle güncellendi; genel dikkat gerektiren hareket sayısı üçten ikiye, ilgili hesap kartındaki sayaç ise birden sıfıra düştü. İşlem satırı Eşleşti rozetiyle kaydedildi ve başarı bildirimi gösterildi.

Satışlar ekranı dört kayıt, durum filtreleri ve ağırlıklı fırsat özetleriyle açıldı. MFS-2026-009 için Tahsilat Kaydet eylemi uygulandığında durum Onaylandı'dan Tahsil Edildi'ye, tahsil edilen satış toplamı ₺36.500,00'dan ₺108.500,00'a, dönüşüm oranı ise %25'ten %50'ye güncellendi. İşlem aynı zamanda tahsilat hesabına yeni bekleyen banka hareketi ekleyecek şekilde bağlandı.

Raporlar ekranı banka, satış, fatura ve gider kayıtlarından türetilen net sonuç, toplam nakit, bekleyen tahsilat ve net banka hareketi kartlarıyla açıldı. Satış tahsilatından sonra rapor kontrolü 4/7 eşleştirilmiş hareket ve üç dikkat bekleyen hareket gösterdi; nakit akışı detayı banka girişi ₺194.700,00, çıkışı ₺29.620,00 ve farkı ₺165.080,00 olarak hesaplandı. Dışa Aktar eylemi seçili dönem için CSV özeti hazırlandığını bildiren geri bildirim verdi.

Yeni Satış eylemi; müşteri, durum, tutar, açıklama, beklenen kapanış tarihi ve olasılık alanları içeren erişilebilir bir iletişim kutusu açtı. Form açıklaması, satış kaydının tahsilat, banka hareketi ve raporlama görünümüne bağlanacağını açıkça belirtiyor.

## Muhasebe Yönetimi Modülleri Kontrolü

Yeni v6 yerel veri anahtarıyla uygulama yeniden açıldığında temiz başlangıç seti yüklendi; oturum sonrası dashboard, banka, satış ve muhasebe yönetimi menüleri aynı veri bağlamında erişilebilir göründü. Mevcut tahsilat, gider ve bekleyen ödeme metrikleri başlangıç değerleriyle yeniden üretildi.

Muhasebe modülü 12 işlenmiş fişi; fatura, gider, banka ve manuel kaynak rozetleriyle listeledi. Toplam borç ve alacak ₺278.410,00 olarak eşit göründü; her satır Dengeli kontrolü aldı. Yeni Fiş iletişim kutusu fiş tarihi, tutar, açıklama, borç hesabı ve alacak hesabını aynı formda sunarak borç/alacak dengesi kuralını görünür tuttu.

Ofis ekipmanı dönemsel değerleme düzeltmesi açıklamasıyla ₺1.250,00 tutarlı manuel fiş kaydedildi. İşlenmiş fiş sayısı 12'den 13'e, toplam borç ve alacak toplamları birlikte ₺279.660,00'a yükseldi; yeni satır Dengeli durumu ve başarı bildirimiyle listelendi. Teslim öncesinde bu test kaydı başlangıç verileriyle sıfırlanacaktır.

Hesap Planı ekranında 102 Bankalar hesabı, banka hareket fişleriyle çift sayılmadan ₺260.430,00 gerçek hesap toplamıyla gösterildi; üst metrik de aynı değerle hizalandı. Hesap Ekle iletişim kutusu; hesap kodu, adı ve hesap türü alanlarıyla açıldı ve yeni hesabın manuel fiş seçimlerine anında bağlanacağını açıkça belirtti.

780 Finansman Giderleri hesabı Gider türünde kaydedildi. Aktif hesap sayısı 11'den 12'ye yükseldi, yeni hesap faaliyet giderleri grubu altında listelendi ve başarı bildirimi göründü. Teslim öncesinde bu test hesabı başlangıç verileriyle sıfırlanacaktır.

Arşiv modülü, fatura, gider ve satış belgelerini referans, tutar, tarih, arşiv nedeni ve kaynak modülüyle birlikte listeledi. MF-2026-009 geri yüklendiğinde arşivdeki belge sayısı 3'ten 2'ye, arşiv tutarı ₺73.050,00'dan ₺56.250,00'a inerken geri yüklenen kayıt sayısı 1'den 2'ye çıktı. Böylece belge görünür listeden ayrılıp geri getirilebilir yaşam döngüsünü korudu.

Ayarlar ekranında şirket unvanı güncellendi ve Kaydet eylemi, "Şirket, dönem ve belge tercihleri yerel çalışma alanına işlendi" bildirimini verdi. Form, fatura/fiş/rapor bağlamından ayrı varsayılanları yönetirken finansal geçmişe doğrudan müdahale etmedi.

Demo sıfırlaması sonrasında Ayarlar taslağı da başlangıç şirket unvanına geri döndü; manuel fiş, test hesabı ve geri yükleme denemesi temiz başlangıç setinden çıkarıldı. Ayarlardan Bankalar ekranına ve Bankalardan Muhasebe ekranına doğrudan geçişte banka kartları ile 12 dengeli günlük fiş aynı kaynak verileriyle görünmeye devam etti.

Kategorili Ayarlar paneli, altı görünür tercih grubuyla başarıyla açıldı. Şirket panelinde kurumsal unvan, vergi, telefon, finans e-postası, web sitesi, mali dönem ve adres alanları; Bildirimler panelinde e-posta, fatura, gider, ödeme, haftalık ve aylık rapor tercihlerinin ayrı anahtarları doğrulandı.

Haftalık Raporlar anahtarı etkinleştirildi ve Bildirimler panelindeki Kaydet eylemi, tercihlerin yerel çalışma alanına işlendiğini belirten başarı bildirimi verdi. Bu test tercihi teslim öncesi başlangıç değerine döndürülecektir.

Sistem panelinde para birimi, tarih biçimi, varsayılan KDV, fatura ön eki, vade, ana tahsilat hesabı ve banka eşleştirme/tablo görünümü anahtarları doğrulandı. Veri Yönetimi panelinde dışa aktarma biçimi ve arşiv saklama süresi seçimleri, dışa aktarma geri bildirimi ve teyitli demo sıfırlama eyleminden ayrı biçimde sunuldu.

Veri Yönetimi ekranındaki dışa aktarma eylemi, CSV biçiminin demo ortamında hazırlandığını bildirdi ve seçili tercihleri kaydetti. Ardından teyit penceresi üzerinden sıfırlama tamamlandı; uygulama başlangıç demo verilerine ve başlangıç ayar tercihlerine döndü.

Nora Tasarım Stüdyosu için ₺28.000,00 tutarlı, %65 olasılıklı örnek Teklif kaydı formdan oluşturuldu. Yeni MFS-2026-014 kaydı listeye eklendi; satış kayıt adedi dörtten beşe, ağırlıklı açık fırsat tutarı ₺50.400,00'dan ₺68.600,00'a ve dönüşüm oranı %50'den %40'a güncellendi. Teslimden önce test verileri başlangıç durumuna geri yüklenecektir.

---

### 📄 `appointment-verification.md`

# Randevu Yönetimi Doğrulama Kaydı

- [x] CRM başlığı altında **Randevular** bağlantısı görünür ve mevcut navigasyon hiyerarşisini korur.
- [x] Aylık takvim, gün bazlı ajanda, beş başlangıç görüşmesi ve üstteki Yeni Görüşme Ekle akışı önizlemede doğru yüklendi.
- [x] Yeni görüşme oluşturuldu; aylık görüşme sayısı, takvim günü ve seçili gün ajandası eşzamanlı güncellendi.
- [x] Görüşme düzenleme penceresi mevcut müşteri, tarih, saat, tür, bağlantı ve not bilgileriyle açılıyor.
- [x] Görüşme güncellemesi takvim ve ajandada görünür hâle geldi; test görüşmesi silinerek başlangıç demo planı temiz bırakıldı.
- [x] Beş başlangıç görüşmesinin ve seçili gün kaydının tarayıcı yerel saklamasında bulunduğu doğrulandı.

---

### 📄 `customer-context-verification.md`

# Müşteri Bağlamı ve Aksiyon Görünürlüğü — Doğrulama Kaydı

## Dashboard

- [x] Takip Gerekenler yüzeyi, tahsilat, planlanmış görüşme ve müşteri planı bağlamını tek panelde yüklüyor.
- [x] Tahsilat kartı ilgili fatura akışına; görüşme kartı Randevular ekranına; müşteri kartı Müşteriler ekranına yönlendirme sunuyor.
- [x] Başlangıç demo verisinde tahsilat ve görüşme sayaçları, görünür müşteri/fatura/randevu kayıtlarıyla tutarlı görünüyor.

## Müşteriler

- [x] Müşteri kartları açık bakiye, açık satış, sonraki görüşme ve son temas bilgilerini ilişkili demo kayıtlarından yüklüyor.
- [x] Müşteri kartındaki Görüşmeler kısayolu, CRM Randevu Yönetimi ekranına doğru yönlendiriyor.

---

### 📄 `customer-drawer-verification.md`

# Sade Müşteri Deneyimi — Doğrulama Kaydı

| Kontrol | Sonuç |
|---|---|
| Kart terimleri | **Açık bakiye** yerine **Beklenen ödeme**, **Açık satış** yerine **Devam eden satış** görünür. |
| Müşteri detayı | Karttaki **Detayları aç** eylemi sağ panelde ödeme, satış, fatura, görüşme ve son hareket bağlamını açar. |
| Görüşme akışı | Çekmecedeki **Görüşme planla** eylemi CRM Randevu Yönetimi takvimine yönlendirir. |
| Veri içeriği | Nora Tasarım Stüdyosu örneğinde fatura, tahsilat, yaklaşan görüşme, satış ve aktiviteler doğru bağlamda yüklendi. |

---

### 📄 `customer-note-verification.md`

# Müşteri Notu Deneyimi — Doğrulama Kaydı

| Kontrol | Sonuç |
|---|---|
| Not alanı | Nora Tasarım Stüdyosu detay çekmecesinde mevcut müşteri notu doğru yüklendi. |
| Yerleşim | Not alanı, ödeme ve görüşme özetinden sonra; son hareketler bölümünden önce görünür durumda. |
| Kaydetme | Test notu kaydedildi; karttaki not, son temas bilgisi ve çekmecedeki Son hareketler alanı aynı anda güncellendi. |
| Temizleme | Test sonrası başlangıç demo notu geri yüklendi; not güncelleme kayıtları aktivite geçmişinde korunuyor. |

---

### 📄 `navigation-verification.md`

# Sol Navigasyon Gruplama Doğrulama Kaydı

- [x] Üst seviye navigasyonda Dashboard, Gün Planı ve Raporlar sırasıyla görünüyor.
- [x] Finans başlığı altında Giderler, Satışlar, Faturalar, Bankalar, Muhasebe ve Hesap Planı sıralandı.
- [x] CRM başlığı altında Müşteriler ve Tedarikçiler yer alıyor.
- [x] Ayırıcı çizginin altında Arşiv, Ayarlar ve Ayarlar'ın hemen altında Bildirimler bulunuyor; Çıkış Yap en altta ayrık kaldı.
- [x] Finans grubundaki Faturalar ve CRM grubundaki Müşteriler bağlantıları mevcut ekran içeriklerini koruyarak açılıyor.
- [x] Daha uzun mobil menü için sol navigasyona bağımsız dikey kaydırma davranışı eklendi.

---

### 📄 `planner-verification.md`

# Gün Planı Önizleme Doğrulama Kaydı

- [x] Sol navigasyonda **Gün Planı** bağlantısı görünür ve gün içindeki açık görev sayısını gösterir.
- [x] Eski tarayıcı yerel verilerinde `plannerTasks` alanı bulunmadığında ekranın hata vermesini önlemek için boş dizi geri dönüşü eklendi.
- [x] Uygulama yeniden yüklendiğinde temiz demo giriş durumuna geri dönüyor.
- [x] Gün Planı; dört kanban kolonu, altı başlangıç görevi, öncelik etiketleri ve günlük ilerleme özetiyle doğru yüklendi.
- [x] Yeni görev formu başlık, tarih, saat, durum, öncelik, etiket, süre ve not alanlarını kabul ediyor.
- [x] Oluşturulan görev Bugün kolonuna eklendi; Tamamlandı durumuna taşındığında navigasyon sayacı ve günlük ilerleme güncellendi.
- [x] Görev düzenleme ekranından silme işlemi çalışıyor; test görevi kaldırıldı ve örnek demo planı temiz bırakıldı.
- [x] Kanban kartları, yeni görev formu ve durum değiştirme akışı önizlemede uçtan uca doğrulandı.

---

### 📄 `sidebar-verification.md`

# Sol Navigasyon Tutarlılığı — Doğrulama Kaydı

## Başlangıç Kontrolü

- [x] Dashboard ekranında üst seviye, Finans, CRM ve yönetim bölümlerinin hedef sıralamayla göründüğü doğrulandı.
- [x] Bankalar ekranında aynı grup hiyerarşisi görünür kaldı ve Bankalar satırı aktif durumla işaretlendi.
- [x] Muhasebe ekranında aynı grup hiyerarşisi görünür kaldı ve Muhasebe satırı aktif durumla işaretlendi.
- [x] Dashboard → Bankalar → Muhasebe geçişlerinde menü sıralaması, yönetim bölümü ve Çıkış Yap konumu değişmeden korundu.

---

### 📄 `research_turkiye_egitim_pazari.md`

# Türkiye Eğitim Kurumu Yazılım Pazarı — Araştırma Notları

## Rakip ürün doğrulamaları

MakroPass / Oktasis, dershane, özel okul, kurs merkezi, etüt merkezi ve kreşlere yönelik öğrenci takibi, yoklama, ders programı, sınav takibi, veli bilgilendirme, ödeme yönetimi ve raporlamayı tek ürün altında konumlandırmaktadır. Ürün sayfası, biyometrik cihaz, akıllı kart ve QR ile öğrenci giriş-çıkış yoklaması; devamsızlıkta veliye anlık bildirim; derslik/sınıf/öğretmen çakışma kontrolü; taksit takibi; çoklu şube; Excel/PDF çıktılarını öne çıkarmaktadır. Kaynak: https://makropass.com.tr/hizmetler/ogrenci-takip/

AKINSOFT Kurs Otomasyonu, kursiyer ve eğitmen yönetimi, öğrenci taksit/ödeme takibi, sınıf/bölüm/ders kaydı, raporlama, sertifika basımı, toplu fatura ve senet işlemleri, devamsızlık, ders programı, ölçme-değerlendirme, muhasebe ve kasa modüllerini sunmaktadır. Sayfa, açıköğretim/etüt/bilgisayar kurslarına da hitap ettiğini ve görüntülenen fiyatın 26.600 TL olduğunu belirtmektedir; tarih veya lisans türü açıkça belirtilmediğinden bu fiyat yalnızca ürün sayfası gözlemi olarak ele alınmalıdır. Kaynak: https://www.akinsoft.com.tr/programlar/detay/kurs-otomasyonu--wko1

K12NET okul/kurs yönetim yazılımını 44 modüllü, internet üzerinden erişilebilen bir yapı olarak konumlandırmaktadır. Ürün sayfası, öğrenci/veli/öğretmen verilerinin Excel veya E-Okul aktarımıyla alınabildiğini; E-Okul ile öğrenci, veli, şube, ders, sınav ve günlük devamsızlık verileri için çift yönlü aktarım olabildiğini belirtmektedir. Bu, MEB'e bağlı özel okul segmentinde resmi sistem entegrasyonunun pazara girişte güçlü bir beklenti yaratabileceğini gösterir. Kaynak: https://k12net.com/okul-yonetim-yazilimi/

ABC OYS dershane otomasyonunu öğrenci ve öğretmen kaydı, ders programı, devamsızlık, sınav sonucu/not kaydı, öğrenci performans analizi ve veli/öğrenci kullanımı etrafında konumlandırmaktadır. Sayfa ayrıca dijital yoklama ile katılım bilgisinin veli ve öğrenciye anlık iletilebileceğini belirtmektedir. Kaynak: https://abc.net.tr/dershane-otomasyon-sistemi/

## Uyum ve regülasyon bulguları

KVKK'nın 2020/255 sayılı eğitim kurumu karar özeti, bir okulun çocuklara ilişkin bilişsel/değerlendirme testi verilerini aydınlatma ve açık rıza süreçleri olmadan işlemesi şikâyetini ele almaktadır. Karar, özellikle rehberlik, psikolojik ölçüm, sağlık veya gelişimsel değerlendirme verilerinin sıradan akademik performans verisinden daha hassas bir uyum alanı olduğunu gösterir. ORBIT'in Faz 1'de rehberlik notu, sağlık bilgisi, psikolojik test veya davranış profili toplamaması; ilerleyen fazlarda ise amaç/saklama süresi, rol yetkisi, veli bilgilendirmesi ve uygun hukuki işleme şartlarıyla tasarlanması gerekir. Kaynak: https://www.kvkk.gov.tr/Icerik/6894/2020-255

MEB Özel Öğretim Kurumları Yönetmeliği'nin resmî metni, özel öğretim kurumu segmentinin kayıt ve kurum işletimi bakımından ayrı bir mevzuat çerçevesine tabi olduğunu teyit etmektedir. Pazar girişinde dershane/kurs merkezi ile MEB'e bağlı özel okul segmenti ayrı ele alınmalıdır; okul segmentinde E-Okul uyumu ve resmi kayıt süreçleri daha yüksek beklenti yaratır. Kaynak: https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=15970&MevzuatTur=7&MevzuatTertip=5

K12NET'in referans sayfası, 15 Eylül 2025 itibarıyla aktif kullanan kurumlara ilişkin 2,8 milyon öğrenci, 132 bin personel ve 4.358 okul rakamlarını yayımlamaktadır; aynı sayfa Atlas Eğitim Yazılımları'nın 2004'ten beri faaliyet gösterdiğini belirtir. Ancak aynı sayfanın tarayıcı görselinde farklı sayaç değerleri de göründüğü için, bu rakamlar bağımsız denetimli pazar payı değil, şirketin beyan ettiği ölçek sinyali olarak değerlendirilmelidir. Kaynak: https://k12net.com/atlas-yazilim/referanslarimiz/

ABC EYS ana sayfası; akademik takvim, davranış, devamsızlık, duyuru, eğitim koçluğu, etüt, görüşme, kayıt, ödev, ölçme-değerlendirme ve tahsilat olmak üzere 11 modül saymaktadır. Tahsilat modülünde e-Fatura/e-Arşiv entegrasyonu iddia edilmekte; hedef segmentler özel okul, kurs merkezi, dil okulu, spor/sanat okulu ve eğitim koçu olarak ayrıştırılmaktadır. Ana sayfa ayrıca kurs ve etüt merkezi segmentinde 120'den fazla merkez beyanı yapar. Bu ölçek de şirket beyanıdır. Kaynak: https://abc.net.tr/genel/

## Pazar büyüklüğü sinyalleri

MEB'in 2024-2025 örgün eğitim istatistiklerine göre Türkiye'de 14.700 özel okul ve bu okullarda 1.539.579 öğrenci bulunmaktadır; özel öğretim kurumlarındaki öğrencilerin örgün eğitim içindeki oranı yüzde 9,1'dir. Bu, büyük bir komşu pazar gösterse de ORBIT'in ilk hedefi olan özel öğretim kursları/dershaneler ile aynı segment değildir; ürün, satış ve entegrasyon beklentileri ayrı değerlendirilmelidir. Kaynak: https://www.meb.gov.tr/2024-2025-orgun-egitim-istatistikleri-aciklandi/haber/38473/tr

MEB Özel Öğretim Kurumları Genel Müdürlüğü'nün 2024 izleme raporu için arama sonuçlarında, özel öğretim kurslarında 3.707 kurum, 21.282 eğitim personeli ve 426.441 kursiyer ile eğitim hizmeti verildiği belirtilmektedir. Bu sayılar resmi rapor kaynağına dayansa da PDF'nin tarayıcı metin çıkarımı sınırlı olduğundan, nihai raporda rapor yılı ve kaynak bağlantısı açık biçimde belirtilecek; mutlak güncel pazar büyüklüğü iddiası olarak değil, erişilebilir resmi segment büyüklüğü göstergesi olarak kullanılacaktır. Kaynak: https://ookgm.meb.gov.tr/meb_iys_dosyalar/2025_06/18174529_2024izlemeraporu1.pdf

## İletişim otomasyonları için uyum bulguları

İYS'nin ana sayfası dinamik yükleme nedeniyle ayrıntı sunmadı. Buna karşılık Ticaret Bakanlığının resmi açıklaması, İYS'nin istenmeyen ticari SMS, e-posta ve sesli aramaları azaltmak; vatandaşların ticari elektronik ileti onaylarını tek noktada görmesi, kontrol etmesi ve ret hakkını kullanması için kurulduğunu belirtmektedir. ORBIT'te ders iptali, yoklama, ödeme dekontu veya sözleşmesel hizmet bildirimi gibi operasyonel bildirimlerle pazarlama/kampanya iletileri ürün düzeyinde ayrılmalı; kampanya ve aday kayıt besleme akışları için kurumun izin yönetimi sorumluluğu açıkça tanımlanmalıdır. Kaynak: https://ticaret.gov.tr/haberler/ticari-elektronik-ileti-yonetim-sistemine-iliskin-basin-aciklamasi

---

### 📄 `automation-research.md`

# Otomasyonlar Araştırma Notları

## N8n resmi katalogu

N8n'in resmi AI iş akışı kataloğu; AI, Sales, IT Ops, Marketing, Document Ops, Other ve Support kategorilerini görünür biçimde ayırıyor. Öne çıkan entegrasyonlar arasında Google Sheets, OpenAI, Telegram, Gmail, MySQL, Postgres, Discord, Google Drive, Slack, Notion ve Microsoft Outlook yer alıyor. MoneyFlow için bu yapı, otomasyon kataloğunun kategori başlıkları ve uygulama rozetleriyle düzenlenmesi gerektiğini gösteriyor.

Kaynak: https://n8n.io/workflows/categories/ai/

## Zapier resmi iş örnekleri

Zapier'in resmi örnek sayfası proje yönetiminde otomatik görev ve bildirim oluşturmayı, e-posta gelen kutusu ve e-posta pazarlamasını, müşteri desteğinde talep organizasyonu ve yanıt takibini, ayrıca e-ticaret, sosyal medya, toplantı yönetimi, dosya/yedekleme, iletişim formları ve bildirimleri öne çıkarıyor. MoneyFlow için ticari başlangıç seti; yeni müşteri/lead takibi, fatura ve tahsilat hatırlatma, e-posta sınıflandırma, destek talebi yönlendirme, belge arşivleme, rapor özeti ve ekip bildirimi kalıplarını kapsamalı.

Kaynak: https://zapier.com/blog/zapier-automation-examples/

## Tasarım kararı

Kullanıcının eklediği referans görseldeki gibi ekran, tek bir kural tablosu yerine kategori başlıkları altında üç sütunlu, ikonlu otomasyon kartları sunmalı. Her kartta otomasyon adı, günlük dilde kısa açıklama, kategori, kullanılan uygulamalar ve "Ekle" veya "Etkin" durumu görünmeli. n8n yaklaşımı gerçek dış servise bağlanmadan önce katalog/şablon yönetimi olarak uygulanacak; gerçek webhook/API çalıştırması ayrıca entegrasyon ve secret gerektirir.

## Make resmi şablon kataloğu

Make'in resmi kataloğu; AI, Business Operations & ERPs, CRM/Sales, Customer Support, File & Document Management, Marketing, Productivity ve Surveys & Forms gibi geniş iş kategorileri sunuyor. "Most Popular" örnekleri arasında Google Sheets satırından ChatGPT üretimi, webhook verisini Google Sheets'e yazma, Google Sheets satırından Gmail e-postası gönderme, Facebook Lead Ads lead'lerini Sheets'e aktarma, WhatsApp chatbotu, Gmail eklerini Google Drive'a kaydetme, Notion ile Google Calendar senkronizasyonu, e-posta özetini Slack'e gönderme ve Instagram yorumlarına otomatik yanıt verme bulunuyor.

Kaynak: https://www.make.com/en/templates

## N8n satış kataloğu

N8n'in resmi satış kategorisi 1.674 satış otomasyonu iş akışı gösteriyor ve AI kategorisiyle aynı uygulama keşif yüzeyini kullanıyor. Bu, MoneyFlow ekranında uygulama rozetlerini, kategori filtrelerini ve satış odaklı hazır şablonları birinci sınıf gezinme unsurları olarak kullanmayı destekliyor.

Kaynak: https://n8n.io/workflows/categories/sales/

## Uygulamaya alınacak hazır ticari otomasyonlar

İlk katalogta şu kartlar yer almalı: yeni lead geldiğinde müşteri kartı ve takip görevi oluştur; teklif onaylanınca fatura taslağı aç; vade yaklaşınca müşteri ve ekip sorumlusuna hatırlatma gönder; ödeme alınca müşteri aktivitesini ve banka eşleştirme kuyruğunu güncelle; gelen e-postadaki faturayı belge arşivine kaydet; form veya webhook verisini müşteri/lead kaydına dönüştür; destek talebini önceliklendirip sorumluya ata; haftalık gelir-gider özetini e-posta veya Slack mesajı olarak hazırla; yeni takvim görüşmesini Gün Planı görevine çevir; sosyal medya veya WhatsApp mesajını CRM takip kaydına ekle.

Bu aşamada kartlar ve yerel etkinleştirme durumu MoneyFlow içinde çalışacak. Gerçek n8n webhook/API çalıştırması için ayrıca n8n adresi, webhook kimlik doğrulaması ve dış servis secret'ları gerekir; bunlar kullanıcıdan onay alınmadan eklenmeyecek.

---

## Bölüm 3 — Tasarım / Animasyon Analizleri

### 📄 `orbit-reference-animation-analysis.md`

# ORBIT Referans Video Animasyon Analizi

Referans video, basit bir dönme/küçülme hareketinden farklı olarak akışkan path morphing ve elastik geri dönüş kullanıyor. Logo yaklaşık 6 iç içe geçmiş, uçları sivrilen kanat/kavis formundan oluşuyor; negatif alan merkezde dairesel bir boşluk oluşturuyor.

Hareket saat yönünde başlıyor. Dış uçlar merkeze çekilirken iç kısımlar girdap gibi odaklanıyor. Parçalar eş zamanlı hareket ediyor ancak dış uçlarda gecikme hissi var. Yaklaşık 1,5 saniyede tüm form tek siyah noktaya dönüşüyor. Nokta aniden dışarı doğru fırlıyor; çizgiler ilk anda daha ince görünüyor, ardından hedef ölçüyü az miktarda aşarak elastik overshoot yapıyor ve orijinal forma dönüyor.

Toplam döngü yaklaşık 5–6 saniye. Merkeze akışta hızlı orta geçiş ve yumuşak başlangıç/bitiş; geri dönüşte ease-out-back karakteri var. Uygulama için altı ayrı SVG path, path morphing için eşlenmiş path geometrileri ve gerektiğinde stroke-dasharray/stroke-dashoffset kullanılmalı. Önceki üç çizginin aynı anda scale edilmesi bu referansın asıl deformasyon, gecikme, ince çizgi ve overshoot özelliklerini taşımıyordu.

Bu nedenle yeni uygulama altı kanat path'ini başlangıç formundan merkez noktasına, ince stroke fazına ve overshoot formuna aşamalı olarak dönüştürmelidir. `prefers-reduced-motion` durumunda başlangıç logosu statik gösterilmelidir.

## Kare temas sayfası doğrulaması

2 fps kare temasında ilk fazlarda ORBIT'in özgün dolu marka formu korunuyor. Orta geçişte logo önce incelip gevşek girdap kavislerine dönüşüyor; sonra yaklaşık iki kare boyunca tek koyu noktaya iniyor. Noktadan hemen sonra küçük yıldız/çekirdek parlaması görülüyor. Ardından altı ince, açık uçlu kavis dışarı doğru genişleyip kısa süreliğine hedef formun dışına taşıyor; son fazda dolu ORBIT işareti geri geliyor. Dolayısıyla mevcut uygulama yalnızca doldurulmuş kanat path'lerini ölçeklemek yerine özgün logo görseli + ince kavis fazı + çekirdek + özgün logo geri dönüşü şeklinde katmanlı bir crossfade/motion modeline yaklaşmalıdır.

---

### 📄 `welcome-video-analysis.md`

# Dashboard Karşılama Animasyonu Araştırma Notu

Kaynak: Kullanıcının sağladığı `/home/ubuntu/upload/WhatsAppVideo2026-08-15at19.47.55.mp4` videosu; analiz 15 Ağustos 2026 tarihinde `manus-analyze-video` ile yapıldı.

Videodaki hareket, merkezi bir ORBIT/O formunun merkeze doğru büzülüp spiral bir açılmayla yeniden oluştuğu döngüsel bir morfoloji hissi veriyor. Elemanlar dışarıdan sahneye girmekten çok mevcut formun içinden evriliyor. Geçişler yaklaşık 2–3 saniyelik periyotlarda, ease-in-out karakterinde ve yavaş başlayıp yumuşak biçimde sona eriyor.

MoneyFlow uyarlamasında ağır video yerine CSS transform ve opacity tabanlı GPU-dostu animasyon kullanılacak. Karşılama alanında ORBIT işareti merkez odaklı, hafif rotate/scale ve nefes alma hareketiyle dönecek; metin ve dashboard özetleri sakin bir fade/translate ile görünecek. `prefers-reduced-motion` etkin olduğunda hareket durdurulacak veya statik görünüme indirgenecek.

Bu not, videonun görsel dilini ve hareket yaklaşımını kaydeder; gerçek uygulamada kullanıcı videosu doğrudan oynatılmayacaktır.
