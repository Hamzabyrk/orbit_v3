# Görev A1 — Kapsamlı repo analizi: kod **ve** belge (salt okuma)

> Bu bir **inceleme** görevidir. Hiçbir dosya değiştirilmeyecek, hiçbir düzeltme yapılmayacak.

## Amaç

Gözden kaçmış sorunları bulmak. Proje hızlı ilerledi ve her adımda birkaç şey birikti; senin işin **taze bir gözle** bakmak.

İki alanı birden tarayacaksın:

- **Kod** — çalışan sistemdeki hatalar, ölü yollar, sınır durumları.
- **Belge** — `.ai/` altındaki kayıtlarda mantık hataları, eksik kalmış kararlar, birbiriyle çelişen ifadeler.

Düzeltme **yapma**. Bulguları raporla; hangisinin ele alınacağına inceleyen taraf karar verecek.

## Önce bunları oku

1. `AGENTS.md` — giriş noktası; hangi dosya hangi soruyu cevaplıyor
2. `.ai/AGENT_WORKFLOW.md` — çalışma düzeni ve bağlayıcı kurallar
3. `.ai/PROJECT_STATE.md` — ürün, roller, klasör yapısı
4. `.ai/ROADMAP.md` **bölüm 0** — hangi aşamadayız
5. `.ai/PLATFORM_SETTINGS.md` **bölüm 5** — **kabul edilmiş açıklar** (kritik, aşağıya bak)

## ⛔ Bunları rapor etme

### 1. Kabul edilmiş açıklar

`PLATFORM_SETTINGS.md` bölüm 5'teki her madde **bilinçli bir karardır**, hata değildir. Örnekler (tamamı için o bölümü oku):

- Sızmış şifre koruması kapalı — Pro plan gerektiriyor
- `current_user_has_membership` `authenticated` rolüne açık — RLS politikaları çağırıyor
- `workspace_documents` RLS açık, policy yok — özellik işlevsiz, çift korumalı
- `lib/documents.ts` ölü kod — yukarıdaki maddeye bağlı, bilinçli
- Google Fonts dış sunucudan yükleniyor — pilot öncesi ele alınacak
- Veri `eu-central-1`'de — karar kayıtlı
- İndekssiz foreign key'ler — tablolar boş
- Auth e-postaları paylaşımlı SMTP ile
- Preview derlemeleri demo modunda

### 2. Yapılacaklar listesinde zaten olanlar

`ROADMAP.md`'de **henüz yapılmamış** olarak işaretlenmiş işleri "eksik" diye raporlama. Özellikle: mock verinin hâlâ durması (E5), e-posta/kurtarma zincirinin eksikliği (E4), iş tablolarının yokluğu (v1.2). Bunlar plan, hata değil.

### 3. 2026-08-25 belge denetiminde zaten kapatılanlar

Bu tarihte kapsamlı bir belge denetimi yapıldı (Issue #77). Aşağıdakiler **bulundu ve düzeltildi**, tekrar raporlama:

- `PROJECT_ARCHITECT.md` ve `WORK_LOG.md` emekliye ayrıldı
- `ROADMAP.md` §0 durum tablosunun Faz E'yi yanlış göstermesi
- README ile `PROJECT_STATE.md` arasında yinelenen klasör ağacı
- Git kurallarının üç yerde olması ve çelişmesi
- `CONTRIBUTING.md`'nin var olmayan `CLAUDE.md` ve `components/modules/` atıfları
- `PLATFORM_SETTINGS.md`'nin operatör sayısı konusunda kendisiyle çelişmesi
- `DECISION_LOG.md`'de indeks bulunmaması

**Aradığımız şey:** kimsenin farkında olmadığı, hiçbir yerde yazmayan sorunlar.

---

## A · Kod mercekleri

Her mercek için ayrı ayrı düşün; hepsini birden taramaya çalışma.

### M1 · Kod ile belge uyuşmuyor

Belgeler kodun bugünkü hâlini doğru anlatıyor mu? Bir karar yazılıp uygulanmamış ya da uygulanıp yazılmamış olabilir.

_Örnek tür: bir ekranın metni artık geçersiz bir akışı anlatıyor._

### M2 · Ölü kod ve erişilemez yollar

Hiçbir yerden çağrılmayan modül, fonksiyon, tip, CSS sınıfı. Ulaşılamayan rota. Kullanılmayan dışa aktarım. Referans alınmayan yapılandırma dosyası.

**Dikkat:** "Uzun süredir değişmemiş" ölü demek **değildir**. Bir yapılandırma dosyası yıllarca değişmeden çalışabilir. Doğru sinyal, dosyaya **referans olup olmadığıdır** — `package.json`, bir başka config, bir script veya bir import zinciri onu okuyor mu? Okumuyorsa yaz; okuyorsa yazma.

### M3 · Sessiz hata yolları

Bir hata yakalanıp yutuluyor mu? Kullanıcı yanlış bir şeyin olduğunu **fark etmeden** devam edebiliyor mu? Bir `catch` bloğu sorunu gizliyor mu?

Özellikle: bir işlem yarıda kalırsa sistem tutarsız bir durumda kalıyor mu?

### M4 · Sınır durumları

`null`, boş dizi, sıfır, negatif sayı, çok uzun metin, geçersiz tarih, eşzamanlı iki istek. Kod bunlarda ne yapıyor?

### M5 · Tutarsız desen

Aynı iş iki farklı yerde iki farklı biçimde yapılıyor mu? Biri diğerinden sonra yazılıp öncekiyle hizalanmamış olabilir.

### M6 · Erişilebilirlik ve mobil

Etiketsiz form alanı, klavyeyle ulaşılamayan düğme, dar ekranda taşan içerik, yalnızca renkle anlatılan bilgi.

---

## B · Belge mercekleri

`.ai/` altındaki dosyalar, `AGENTS.md`, `CONTRIBUTING.md` ve `README.md` için.

Bu dosyalar projenin hafızasıdır. İçlerindeki bir mantık hatası, aylar sonra yanlış bir kararın gerekçesi olur.

### B1 · Kendi içinde çelişki

Aynı dosya iki farklı yerde birbirini tutmayan iki şey söylüyor mu? Bir bölüm "X kapalı" derken başka bir bölüm X'in açık olduğunu varsayıyor olabilir.

### B2 · Belgeler arası çelişki

İki dosya aynı konuda farklı şey söylüyor mu? Hangisinin güncel olduğu belli mi?

### B3 · Mantık hatası ve tamamlanmamış akıl yürütme

Bir kararın gerekçesi kendi sonucunu desteklemiyor olabilir. Ya da bir kural konmuş ama **kuralın uygulanacağı durum tarif edilmemiş** olabilir.

Özellikle ara: bir karar "şu şart sağlanınca şunu yapacağız" diyorsa, **şartın sağlanıp sağlanmadığını kim kontrol edecek?** Yazılmamışsa o karar sessizce ölür.

### B4 · Yarım kalmış karar

Bir karar alınmış ama sonucu hiçbir yere bağlanmamış olabilir: ne bir yol haritası maddesi, ne bir kod değişikliği, ne bir kontrol adımı. Kayıtta duruyor, sistemde karşılığı yok.

### B5 · Kırık veya belirsiz atıf

Bir dosya, bölüm veya karar başlığına yapılan atıf gerçekten çözümleniyor mu? "Bkz. yukarıdaki bölüm" gibi ifadeler taşındıktan sonra anlamsızlaşmış olabilir.

**Not:** `DECISION_LOG.md`'de 2026-08-25 öncesi kayıtlarda geçen `PROJECT_ARCHITECT.md` ve `WORK_LOG.md` atıfları **bilinçli olarak korunmuş tarihsel kayıtlardır**. Bunları kırık atıf diye yazma.

### B6 · Söylenen ile yapılan

Belge bir kural koyuyor ama repo o kurala uymuyor olabilir. Kuralı ve ihlal eden yeri birlikte göster.

_Örnek tür: "her PR'da şu dosya güncellenir" yazıyor ama son on PR'da güncellenmemiş._

---

## Sınırlar

- **En fazla 20 bulgu** — koddan en fazla 12, belgeden en fazla 8. Daha fazlasını bulursan en önemlilerini seç.
- Her bulgu **`dosya:satır`** kanıtı taşımalı.
- **Düzeltme önerisi yazma.** Sorunu tarif et, çözümü değil.
- Emin olmadığın bulguyu **"emin değilim"** diye işaretle; atlamak yerine işaretle.

## Yapılmayacaklar

- ❌ Hiçbir dosyayı değiştirme, oluşturma veya silme
- ❌ `git commit`, `git push`, branch açma
- ❌ Supabase, Vercel veya GitHub'a çağrı
- ❌ Bağımlılık kurma
- ✅ Salt okuma komutları serbest: `grep`, `find`, `cat`, `git log`, `git diff`

## Rapor biçimi

Her bulgu için tam olarak şu beş satır:

```
### B<numara> · <tek cümlelik başlık>

Mercek      : M1–M6 (kod) / B1–B6 (belge)
Konum       : dosya:satır
Ne oluyor   : Gözlemlenen durum. Tahmin değil, dosyada gördüğün.
Neden önemli: Somut sonuç. "İyi olmaz" değil, "şu durumda şu olur".
Emin miyim  : Evet / Hayır — hayırsa nedenini yaz
```

Sonda kısa bir özet: kaç bulgu, kaçı koddan, kaçı belgeden, hangi mercekten kaç tane.

## Bitince

Rapordan başka bir şey verme.

Sona `git status --short` çıktısını ekle. **Boş olmalı.** Bu bir inceleme görevi; tek bir dosya bile değişmişse görev kuralı çiğnenmiş demektir ve rapor incelenmeden reddedilir.
