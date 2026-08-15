# MoneyFlow Muhasebe Yönetimi Araştırma Notları

## İncelenen Kamuya Açık Kaynaklar

| Kaynak | Çıkarılan ürün kalıbı | MoneyFlow’a uyarlama |
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
