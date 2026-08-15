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
