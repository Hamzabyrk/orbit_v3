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
