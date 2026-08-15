# ORBIT Referans Video Animasyon Analizi

Referans video, basit bir dönme/küçülme hareketinden farklı olarak akışkan path morphing ve elastik geri dönüş kullanıyor. Logo yaklaşık 6 iç içe geçmiş, uçları sivrilen kanat/kavis formundan oluşuyor; negatif alan merkezde dairesel bir boşluk oluşturuyor.

Hareket saat yönünde başlıyor. Dış uçlar merkeze çekilirken iç kısımlar girdap gibi odaklanıyor. Parçalar eş zamanlı hareket ediyor ancak dış uçlarda gecikme hissi var. Yaklaşık 1,5 saniyede tüm form tek siyah noktaya dönüşüyor. Nokta aniden dışarı doğru fırlıyor; çizgiler ilk anda daha ince görünüyor, ardından hedef ölçüyü az miktarda aşarak elastik overshoot yapıyor ve orijinal forma dönüyor.

Toplam döngü yaklaşık 5–6 saniye. Merkeze akışta hızlı orta geçiş ve yumuşak başlangıç/bitiş; geri dönüşte ease-out-back karakteri var. Uygulama için altı ayrı SVG path, path morphing için eşlenmiş path geometrileri ve gerektiğinde stroke-dasharray/stroke-dashoffset kullanılmalı. Önceki üç çizginin aynı anda scale edilmesi bu referansın asıl deformasyon, gecikme, ince çizgi ve overshoot özelliklerini taşımıyordu.

Bu nedenle yeni uygulama altı kanat path’ini başlangıç formundan merkez noktasına, ince stroke fazına ve overshoot formuna aşamalı olarak dönüştürmelidir. `prefers-reduced-motion` durumunda başlangıç logosu statik gösterilmelidir.

## Kare temas sayfası doğrulaması

2 fps kare temasında ilk fazlarda ORBIT’in özgün dolu marka formu korunuyor. Orta geçişte logo önce incelip gevşek girdap kavislerine dönüşüyor; sonra yaklaşık iki kare boyunca tek koyu noktaya iniyor. Noktadan hemen sonra küçük yıldız/çekirdek parlaması görülüyor. Ardından altı ince, açık uçlu kavis dışarı doğru genişleyip kısa süreliğine hedef formun dışına taşıyor; son fazda dolu ORBIT işareti geri geliyor. Dolayısıyla mevcut uygulama yalnızca doldurulmuş kanat path’lerini ölçeklemek yerine özgün logo görseli + ince kavis fazı + çekirdek + özgün logo geri dönüşü şeklinde katmanlı bir crossfade/motion modeline yaklaşmalıdır.
