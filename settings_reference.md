# MoneyFlow Ayarlar Referans Notları

## Referans Uygulamada Görünen Yapı

Referans MoneyFlow uygulamasının Ayarlar ekranı, tek bir uzun form yerine sol tarafta kategori menüsü ve sağda seçili kategorinin detay paneliyle kuruludur. Görünür kategoriler şunlardır: **Profil**, **Şirket**, **Bildirimler**, **Sistem**, **Güvenlik** ve **Veri Yönetimi**.

| Referans kategorisi | Görünen tercih kalıbı | MoneyFlow’a uyarlama |
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
