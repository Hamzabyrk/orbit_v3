# Dashboard Karşılama Animasyonu Araştırma Notu

Kaynak: Kullanıcının sağladığı `/home/ubuntu/upload/WhatsAppVideo2026-08-15at19.47.55.mp4` videosu; analiz 15 Ağustos 2026 tarihinde `manus-analyze-video` ile yapıldı.

Videodaki hareket, merkezi bir ORBIT/O formunun merkeze doğru büzülüp spiral bir açılmayla yeniden oluştuğu döngüsel bir morfoloji hissi veriyor. Elemanlar dışarıdan sahneye girmekten çok mevcut formun içinden evriliyor. Geçişler yaklaşık 2–3 saniyelik periyotlarda, ease-in-out karakterinde ve yavaş başlayıp yumuşak biçimde sona eriyor.

MoneyFlow uyarlamasında ağır video yerine CSS transform ve opacity tabanlı GPU-dostu animasyon kullanılacak. Karşılama alanında ORBIT işareti merkez odaklı, hafif rotate/scale ve nefes alma hareketiyle dönecek; metin ve dashboard özetleri sakin bir fade/translate ile görünecek. `prefers-reduced-motion` etkin olduğunda hareket durdurulacak veya statik görünüme indirgenecek.

Bu not, videonun görsel dilini ve hareket yaklaşımını kaydeder; gerçek uygulamada kullanıcı videosu doğrudan oynatılmayacaktır.
