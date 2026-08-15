# MoneyFlow Arayüz Yeniden Üretim Notları

## Referans Tasarım: Ground-Truth Spesifikasyonu

Bu çalışma, kullanıcının verdiği `moneybird-version-4-ihmo.bolt.host` adresindeki **MoneyFlow** arayüzünü yeniden üretir. Referansın görünür hiyerarşisi, Türkçe metinleri, açık tema renk dengesi, girişten panele geçişi ve dashboard bilgi mimarisi uygulamanın bağlayıcı görsel hedefidir. Bu nedenle genel tasarım denemeleri yerine, referansta gözlemlenen hafif, iş odaklı ve mavi vurgulu arayüz korunacaktır.

### Tasarım Hareketi

Ürün odaklı **SaaS finans paneli** estetiği. Geniş beyaz çalışma alanı, yumuşak gri yüzeyler, ince sınırlar ve güçlü mavi eylem vurguları; karmaşık muhasebe verilerini hızlı taranabilir hale getirir.

### Temel İlkeler

1. Giriş ekranı, merkezde duran kompakt beyaz kart ve soluk mavi arka planla sakin, güven veren bir ilk izlenim oluşturur.
2. Dashboard, kalıcı sol gezinme sütunu ve ferah ana içerik alanıyla muhasebe işlemlerini bir bakışta okunabilir tutar.
3. Kartlar, büyük yuvarlatmalar yerine küçük köşe yarıçapları, ince gri kenarlar ve çok hafif gölgeler kullanır.
4. Mavi, yalnızca marka simgesi, etkin durumlar, birincil düğmeler ve pozitif vurgu gibi semantik noktalarda kullanılır.

### Renk Felsefesi

Ana zemin beyaz ve çok açık soğuk gridir; bu, muhasebe verilerinin öne çıkmasına imkân verir. İmzalı **MoneyFlow mavisi `#2563EB`**, kontrol ve ilerleme hissini taşır. Koyu lacivert-gri metin, göz yorgunluğunu azaltacak yoğunlukta kullanılır. Yeşil, kırmızı ve amber yalnızca finansal durumların anlamını destekleyen ikincil göstergelerdir.

### Yerleşim Paradigması

Kullanıcı giriş yaptığında sol tarafta sabit, gruplanmış bir modül gezintisi yer alır. Üstte kullanıcı bilgisi ve iki adet hızlı işlem düğmesi bulunur. Ana alan, metriklerin yatay akışı ile aşağıda iki kolonlu faaliyet/özet alanları arasında ritmik bir hiyerarşi kurar. Küçük ekranlarda sol panel açılır kapanır bir menüye dönüşür.

### İmza Öğeler

1. Mavi kare içinde beyaz hesap makinesi/finans simgesi.
2. Aktif sayfayı belirleyen solunda mavi şerit olan yumuşak gri menü öğesi.
3. Gelir-gider performansının renk kodlu çift sütun grafiği ve işlem durum rozetleri.

### Etkileşim Felsefesi

Giriş formu, referanstaki demo kimlik bilgileriyle çalışan istemci taraflı bir akış sunar. Yan menü ve hızlı işlem öğeleri tıklandığında, kullanılabilirliği korumak için kullanıcıya bir bildirim verir. Parola görünürlüğü açılıp kapatılabilir; mobil gezinti, kendi kontrolüyle açılır.

### Animasyon

Yalnızca işlevi teyit eden hafif geçişler kullanılacaktır: düğmelerde 140 ms sıkışma, kartlarda 180 ms gölge/konum geçişi, giriş başarılı olduğunda kısa yüklenme durumu. Tüm hareketler `prefers-reduced-motion` tercihine saygı gösterir.

### Tipografi Sistemi

Başlık ve marka için **Manrope** 600–800 ağırlıkta; form, tablo ve yardımcı bilgiler için **DM Sans** 400–600 ağırlıkta kullanılır. Başlıklar sıkı harf aralıklı, veri tutarları tabular rakamlı ve metrik kartlardaki değerler belirgin biçimde büyüktür.

### Marka Özü

> Küçük işletmeler için karmaşık işlemleri anlaşılır günlük karar ekranlarına dönüştüren, sakin ve erişilebilir muhasebe alanı.

Markanın kişiliği **net, güvenilir ve çevik** olacaktır. Başlıklar doğrudan eylemi ve mevcut durumu anlatır; çağrılar kısa ve iş odaklıdır. Örneğin, “Muhasebe sisteminize giriş yapın” ve “Yeni müşteri ekleyin” ifadeleri referansın yalın sesini sürdürür.

### Wordmark ve Logo

Wordmark, koyu lacivert `MoneyFlow` yazısını; logo ise mavi yuvarlatılmış kare içinde beyaz hesap makinesi simgesini kullanır. Simge, giriş kartında ve dashboard menüsünün markalama alanında görünür büyüklükte yer alacaktır.

### İmza Marka Rengi

**MoneyFlow mavisi: `#2563EB`.**

## Style Decisions

Giriş ve dashboard yüzeylerinde düz beyaz paneller, ince soğuk-gri kenarlar, küçük köşe yarıçapları ve sınırlı gölgeler kullanılacaktır. Parlak gradyanlar, yoğun glow efektleri ve aşırı yuvarlatılmış pill biçimleri kullanılmayacaktır.

MoneyFlow mavisi yalnızca logo, birincil eylem, etkin menü durumu, temel bağlantı ve anlamsal pozitif vurgularda kullanılacaktır. Nötr gri yüzeyler form, tablo ve yardımcı bilgilerin ana taşıyıcısıdır.

MoneyFlow wordmark’ı, hesap makinesi simgesiyle kilitli bir marka öğesi kabul edilir; Manrope 700–800 ağırlıkta ve kontrol edilmiş aralıklarla kullanılır. Dashboard’un sol menüsü, metrik kartları, finans rozetleri ve iki kolonlu çalışma ritmi aynı sakin finans ürünü karakterini sürdürür.
