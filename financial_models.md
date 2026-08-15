# MoneyFlow Finans Modülleri: Uygulama Sözleşmesi

## Banka Hesapları ve Hareketleri

`BankAccount`, kurum adı, hesap türü, IBAN’ın maskelenmiş son hanesi, gösterge bakiyesi, muhasebe bakiyesi ve son senkron zamanını tutar. `BankTransaction` ise hesap, tarih, açıklama, yön, kategori, tutar, eşleştirme durumu ve isteğe bağlı bağlı kayıt referansını taşır.

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
