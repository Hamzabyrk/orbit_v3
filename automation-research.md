# Otomasyonlar Araştırma Notları

## N8n resmi katalogu

N8n’in resmi AI iş akışı kataloğu; AI, Sales, IT Ops, Marketing, Document Ops, Other ve Support kategorilerini görünür biçimde ayırıyor. Öne çıkan entegrasyonlar arasında Google Sheets, OpenAI, Telegram, Gmail, MySQL, Postgres, Discord, Google Drive, Slack, Notion ve Microsoft Outlook yer alıyor. MoneyFlow için bu yapı, otomasyon kataloğunun kategori başlıkları ve uygulama rozetleriyle düzenlenmesi gerektiğini gösteriyor.

Kaynak: https://n8n.io/workflows/categories/ai/

## Zapier resmi iş örnekleri

Zapier’in resmi örnek sayfası proje yönetiminde otomatik görev ve bildirim oluşturmayı, e-posta gelen kutusu ve e-posta pazarlamasını, müşteri desteğinde talep organizasyonu ve yanıt takibini, ayrıca e-ticaret, sosyal medya, toplantı yönetimi, dosya/yedekleme, iletişim formları ve bildirimleri öne çıkarıyor. MoneyFlow için ticari başlangıç seti; yeni müşteri/lead takibi, fatura ve tahsilat hatırlatma, e-posta sınıflandırma, destek talebi yönlendirme, belge arşivleme, rapor özeti ve ekip bildirimi kalıplarını kapsamalı.

Kaynak: https://zapier.com/blog/zapier-automation-examples/

## Tasarım kararı

Kullanıcının eklediği referans görseldeki gibi ekran, tek bir kural tablosu yerine kategori başlıkları altında üç sütunlu, ikonlu otomasyon kartları sunmalı. Her kartta otomasyon adı, günlük dilde kısa açıklama, kategori, kullanılan uygulamalar ve "Ekle" veya "Etkin" durumu görünmeli. n8n yaklaşımı gerçek dış servise bağlanmadan önce katalog/şablon yönetimi olarak uygulanacak; gerçek webhook/API çalıştırması ayrıca entegrasyon ve secret gerektirir.

## Make resmi şablon kataloğu

Make’in resmi kataloğu; AI, Business Operations & ERPs, CRM/Sales, Customer Support, File & Document Management, Marketing, Productivity ve Surveys & Forms gibi geniş iş kategorileri sunuyor. “Most Popular” örnekleri arasında Google Sheets satırından ChatGPT üretimi, webhook verisini Google Sheets’e yazma, Google Sheets satırından Gmail e-postası gönderme, Facebook Lead Ads lead’lerini Sheets’e aktarma, WhatsApp chatbotu, Gmail eklerini Google Drive’a kaydetme, Notion ile Google Calendar senkronizasyonu, e-posta özetini Slack’e gönderme ve Instagram yorumlarına otomatik yanıt verme bulunuyor.

Kaynak: https://www.make.com/en/templates

## N8n satış kataloğu

N8n’in resmi satış kategorisi 1.674 satış otomasyonu iş akışı gösteriyor ve AI kategorisiyle aynı uygulama keşif yüzeyini kullanıyor. Bu, MoneyFlow ekranında uygulama rozetlerini, kategori filtrelerini ve satış odaklı hazır şablonları birinci sınıf gezinme unsurları olarak kullanmayı destekliyor.

Kaynak: https://n8n.io/workflows/categories/sales/

## Uygulamaya alınacak hazır ticari otomasyonlar

İlk katalogta şu kartlar yer almalı: yeni lead geldiğinde müşteri kartı ve takip görevi oluştur; teklif onaylanınca fatura taslağı aç; vade yaklaşınca müşteri ve ekip sorumlusuna hatırlatma gönder; ödeme alınca müşteri aktivitesini ve banka eşleştirme kuyruğunu güncelle; gelen e-postadaki faturayı belge arşivine kaydet; form veya webhook verisini müşteri/lead kaydına dönüştür; destek talebini önceliklendirip sorumluya ata; haftalık gelir-gider özetini e-posta veya Slack mesajı olarak hazırla; yeni takvim görüşmesini Gün Planı görevine çevir; sosyal medya veya WhatsApp mesajını CRM takip kaydına ekle.

Bu aşamada kartlar ve yerel etkinleştirme durumu MoneyFlow içinde çalışacak. Gerçek n8n webhook/API çalıştırması için ayrıca n8n adresi, webhook kimlik doğrulaması ve dış servis secret’ları gerekir; bunlar kullanıcıdan onay alınmadan eklenmeyecek.
