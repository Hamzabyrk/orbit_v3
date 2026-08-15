# MoneyFlow Operasyon Modülleri: Uygulama Sözleşmesi

## Fatura Ayrıntısı

Fatura listesinde bir satıra tıklamak, belge odaklı ayrı bir görünüm açar. Bu görünümde durum rozeti, fatura numarası, düzenleme/vade tarihi, müşteri bilgileri, MoneyFlow gönderen bilgileri, kalemler, ara toplam, KDV, genel toplam, ödeme notu ve fatura hareketleri bulunur. Görünümde geri dönme, yazdırma ve ödeme kaydetme eylemleri yer alır.

| Alan | Tür | Kullanım |
| --- | --- | --- |
| `lineItems` | Açıklama, miktar, birim fiyat, KDV oranı dizisi | Belge kalemlerini ve toplamları oluşturmaya yarar. |
| `paymentNote` | Metin | Banka/havale açıklamasını fatura üzerinde görünür kılar. |
| `status` | Taslak, Gönderildi, Ödendi, Vadesi Geçti | Tahsilat, rozet ve eylem görünürlüğünü belirler. |

## Giderler

Gider, ödenmiş veya bekleyen bir para çıkışı olarak ele alınır. Liste görünümünde kategori, tedarikçi, belge numarası, ödeme durumu, tutar ve vade; ayrıntıda ise açıklama ve ödeme yöntemi bulunur. Yeni gider, düzenleme, silme, arama, kategori/durum filtreleri ve “ödendi olarak işaretle” işlemleri yerel veri akışını değiştirir.

| Alan | Tür | Kullanım |
| --- | --- | --- |
| `supplierId` | Tedarikçi referansı | Gideri alacaklı profiline bağlar. |
| `category` | Kategori | Dashboard ve liste filtrelerinde sınıflandırma sağlar. |
| `status` | Bekliyor, Ödendi, Vadesi Geçti | Açık borç, bekleyen ödeme ve uyarıları hesaplar. |
| `paymentMethod` | Banka transferi, kart, nakit | Kaydın operasyonel bağlamını açıklar. |

## Tedarikçiler

Tedarikçi, giderlerin bağlandığı ve açık borçların toplandığı ayrı bir profildir. Kart görünümü iletişim bilgisi, hizmet kategorisi, ödeme vadesi, açık borç ve son gider tarihini sunar. Tedarikçiyi silmek yerine pasife alma/arşivleme davranışı uygulanır; bağlı giderler korunur.

| Alan | Tür | Kullanım |
| --- | --- | --- |
| `status` | Aktif, Pasif | Yeni gider formunda seçilebilirliği kontrol eder. |
| `paymentTerm` | Metin | Varsayılan vade anlaşmasını açıklar. |
| `category` | Hizmet sınıfı | Kart içi bağlam ve filtre sunar. |

## Hesaplama ve Aktivite Kuralları

Dashboard toplam gideri, yalnızca **Ödendi** giderlerin tutarından türetilir. Bekleyen ödemeler, **Bekliyor** veya **Vadesi Geçti** giderlerden; tedarikçiye açık borç ise bu durumlarda o tedarikçiye bağlı giderlerden hesaplanır. Yeni/düzenlenen/silinen her fatura, gider veya tedarikçi kaydı zaman damgalı aktivite oluşturur. Tüm kayıtlar tarayıcı yerel saklamasında tutulur ve “Demo verisini sıfırla” eylemiyle geri yüklenir.
