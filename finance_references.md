# Banka, Satış ve Raporlama Referans Notları

Bu notlar, kamuya açık ürün dokümantasyonu ve tanıtım sayfalarından çıkarılmış iş akışı kalıplarını içerir. MoneyFlow’ın özgün marka ve arayüz dili korunacaktır; hiçbir ürün kimliği veya ekranı birebir kopyalanmayacaktır.

| Kaynak | Uygulanabilir kalıp | MoneyFlow uyarlaması |
| --- | --- | --- |
| Xero banka eşleştirme | Her banka hesabında güncel bakiye, eşleşmemiş işlem adedi; hareketlerin kural, eşleşme veya öneri temelli gözden geçirilmesi | Bankalar ekranında hesap kartları, bekleyen hareket sayısı, işlem satırlarında kategori/önerilen eşleşme ve “Eşleştir” eylemi. |
| QuickBooks banka hareketleri | Hareketleri bekleyen listede kategori, eşleştirme veya ekleme eylemiyle değerlendirme; gelir ve giderin ayrı bağlamlarda sınıflandırılması | Banka işlemlerinde Gelen/Giden yönü, kategori, bağlı fatura/gider ve Eşleşti/Bekliyor durumu; kullanıcının tek eylemle kaydı eşleştirmesi. |
| FreshBooks ödemeler | Fatura/ödeme sonrasında işlem kaydı, dashboard ve raporların otomatik güncellenmesi | Satış kaydı ödenmiş duruma geçtiğinde tahsilat, banka hareketi, dashboard ve raporlar aynı yerel veri kaynağından güncellenecek. |

## Uygulama Kararları

Bankalar modülü üç hesap kartıyla başlayacaktır: operasyon hesabı, tahsilat hesabı ve kurumsal kart. Her kart hesap bakiyesini, son senkron tarihini ve eşleşmemiş hareket sayısını gösterir. Alt tablo tarih, açıklama, yön, kategori, tutar, eşleştirme durumu ve önerilen bağlantıyı içerir.

Satışlar modülü, müşteriyle ilişkili teklif ve satış kaydı akışını destekleyecektir. Durumlar `Teklif`, `Onaylandı`, `Faturalandı` ve `Tahsil Edildi` olacaktır. Tahsil edilen bir satış, banka hareketi ve ilgili müşteri bilgisiyle bağlanır; faturalama sonra da raporlar ile dashboard’a yansır.

Raporlar modülü, statik görsel yerine mevcut yerel veriden türetilen dönem özetlerini sunacaktır. Gelir-gider, net nakit akışı, tahsilat oranı, bekleyen tahsilat ve ödenmesi gereken gider göstergeleri; tablo ve sade, erişilebilir çubuk grafikler üzerinden görüntülenir.

## Kaynaklar

[1] [Xero — Automatic bank reconciliation software](https://www.xero.com/us/accounting-software/reconcile-bank-transactions/)

[2] [QuickBooks — Categorize online bank transactions](https://quickbooks.intuit.com/learn-support/en-us/help-article/banking/categorize-match-online-bank-transactions-online/L1bTafTz3_US_en_US)

[3] [FreshBooks — Accept payments](https://www.freshbooks.com/accept-payments)

## Görsel Uygulama Notu

Xero’nun banka eşleştirme anlatımında hesap özeti, dikkat isteyen hareketler ve kullanıcı denetimi aynı çalışma alanında bulunur. MoneyFlow bankalar ekranında bu nedenle kartlardaki bakiye ve eşleşme durumu üstte; karar verilmesi gereken işlem tablosu altta konumlanacaktır. FreshBooks’un satış/ödeme akışı, oluşturma–tahsilat–otomatik güncelleme zincirini açık şekilde ayırır; MoneyFlow satış kartları da bu doğrusal ilerlemeyi durum rozeti ve bağlı müşteri/fatura ilişkisiyle görünür kılacaktır.
