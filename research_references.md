# Operasyon Modülleri Referans Notları

Bu notlar yalnızca kamuya açık ürün belgeleri ve tanıtım sayfalarından çıkarılmış uygulama kalıplarını içerir. MoneyFlow’a özgü görsel dil ve Türkçe iş akışları korunacak; herhangi bir ürünün marka kimliği veya birebir ekran varlığı kopyalanmayacaktır.

| Kaynak | Uygulanabilir kalıp | MoneyFlow’a uyarlama |
| --- | --- | --- |
| Xero çevrim içi faturalama | Markalı fatura şablonu, ödeme koşulları, müşteri bilgilerinin otomatik dolması, fatura durumunun görünür olması ve PDF ile paylaşım | Fatura satırından açılan ayrı bir önizleme sayfası; satıcı ve müşteri blokları, kalemler, vergi/ara toplam/toplam, vade, durum ve yazdırma görünümü. |
| QuickBooks iş akışları | Fatura, gider ve ödeme kayıtlarında koşul-temelli hatırlatma, onay ve bildirim akışı | Bu sürümde her fatura/gider değişikliği aktivite günlüğüne yazılacak; vadesi yaklaşan veya geciken kayıtlar semantik uyarı olarak gösterilecek. |
| FreshBooks tedarikçi yönetimi | Tedarikçi profili, bu tedarikçiye ait açık faturalar, hızlı “Yeni Gider” eylemi, kart bilgileri ve açık borç görünümü | Tedarikçi kartında iletişim bilgisi, kategorisi, açık borç, son gider ve “Gider Ekle” kısayolu; silme öncesi onay ve tedarikçiye bağlı giderleri koruyan davranış. |

## Uygulama Kararları

Fatura görünümü, yalnızca bir tablo kaydı değil, ayrı bir belge yüzeyi olacaktır. Belge üzerinde durum rozeti, fatura numarası, düzenleme/vade tarihi, müşteri ve şirket blokları, tahsilat özeti ve kalem tablosu yer alacaktır. Kullanıcı önizlemeyi yazdırma düzenine geçirebilecek; “PDF indir” yerine ilk sürümde tarayıcının yazdırma işlevi kullanılacaktır.

Giderler, tedarikçiye bağlanan bağımsız bir işlem modeli olarak eklenecektir. Her gider; tedarikçi, kategori, açıklama, tutar, tarih, vade, ödeme durumu ve isteğe bağlı belge numarası taşıyacaktır. Dashboard’a toplam gider, bekleyen ödeme ve son gider hareketi olarak yansır.

Tedarikçiler, müşterilerden bağımsız bir alacaklı listesi olarak yönetilecektir. Silme işlemi bağlı gider kayıtlarını silmek yerine tedarikçiyi pasife alma/arşivleme davranışına dönüşecektir; bu, harcama geçmişinin korunmasını sağlar.

## Kaynaklar

[1] [Xero — Easy online invoicing software](https://www.xero.com/us/accounting-software/send-invoices/)

[2] [QuickBooks — Use workflows to automate business processes](https://quickbooks.intuit.com/learn-support/en-us/help-article/feature-preferences/use-workflows-quickbooks-online-advanced-send/L6uaB8H5G_US_en_US)

[3] [FreshBooks — What are vendors?](https://support.freshbooks.com/hc/en-us/articles/360048531852-What-are-vendors)

## Görsel Uygulama Notu

Xero’nun kamuya açık faturalama sayfası, belgeyi “oluştur–gönder–ödeme al” ekseninde sade bir hikâyeyle konumlandırır; MoneyFlow önizlemesinde bu nedenle tek bir belirgin belge yüzeyi, status/ödeme özeti ve iki kontrollü eylem kullanılacaktır. FreshBooks tedarikçi dokümantasyonunda tedarikçi profilini açık borç, hızlı gider oluşturma ve bağlı kayıtların merkezi olarak ele alır; MoneyFlow’daki tedarikçi kartları da bu bilgi mimarisini, fakat mevcut açık tema ve mavi eylem tonuyla yansıtacaktır.
