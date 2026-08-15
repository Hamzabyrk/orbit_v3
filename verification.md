# Doğrulama Notu

## Görsel Kontrol

Giriş ekranı, referanstaki merkezde konumlanan beyaz kart, açık mavi zemin, mavi giriş düğmesi, demo hesap kutusu ve Türkçe alan etiketleriyle karşılaştırıldı. Masaüstü ve 375 px genişlikteki küçük ekran görünümünde form alanları, düğme ve yardımcı metinler taşmadan görüntülendi.

Dashboard, demo bilgileriyle girişten sonra açıldı. Sol modül menüsü, dört finansal özet kartı, hızlı işlemler, altı aylık gelir/gider grafiği, hızlı erişim bölümü, durum kartı ve son işlemler tablosu birlikte kontrol edildi. İlk masaüstü denemesinde ana içerik alanı dikeyde yanlış hizalanmıştı; uygulama kabuğu yatay düzene geçirilerek sorun giderildi.

## İşlev Kontrolü

`demo@moneyflow.com` ve `demo123` bilgileri giriş ekranından dashboard’a geçiş sağlıyor. Hatalı bilgi için bildirim gösteriliyor; parola görünürlüğü ve hatırla seçeneği çalışıyor. Hızlı eylemler ile gezinme öğeleri kullanıcıya demo bildirimi veriyor ve çıkış kontrolü giriş ekranına dönüyor. Tür denetimi `pnpm check` ile hatasız tamamlandı.
