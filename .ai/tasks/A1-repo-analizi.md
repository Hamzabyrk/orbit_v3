# Görev A1 — Kapsamlı repo analizi (salt okuma)

> Bu bir **inceleme** görevidir. Hiçbir dosya değiştirilmeyecek, hiçbir düzeltme yapılmayacak.

## Amaç

Gözden kaçmış sorunları bulmak. Proje hızlı ilerledi ve her adımda birkaç şey birikti; senin işin **taze bir gözle** bakmak.

Düzeltme **yapma**. Bulguları raporla; hangisinin ele alınacağına inceleyen taraf karar verecek.

## Önce bunları oku

1. `.ai/AGENT_WORKFLOW.md` — çalışma düzeni ve bağlayıcı kurallar
2. `.ai/PROJECT_STATE.md` — ürün, roller, klasör yapısı
3. `.ai/ROADMAP.md` **bölüm 0** — hangi aşamadayız
4. `.ai/PLATFORM_SETTINGS.md` **bölüm 5** — **kabul edilmiş açıklar** (kritik, aşağıya bak)

## ⛔ Bunları rapor etme

`PLATFORM_SETTINGS.md` bölüm 5'te **"kabul edilmiş açıklar"** başlığı altındaki her madde **bilinçli bir karardır**, hata değildir. Bunları bulgu olarak yazma.

Örnekler (tamamı için o bölümü oku):

- Sızmış şifre koruması kapalı — Pro plan gerektiriyor
- `current_user_has_membership` `authenticated` rolüne açık — RLS politikaları çağırıyor
- `workspace_documents` RLS açık, policy yok — özellik işlevsiz, çift korumalı
- Google Fonts dış sunucudan yükleniyor — pilot öncesi ele alınacak
- Veri `eu-central-1`'de — karar kayıtlı
- İndekssiz foreign key'ler — tablolar boş
- Auth e-postaları paylaşımlı SMTP ile
- Preview derlemeleri demo modunda

Aynı şekilde `ROADMAP.md`'de **henüz yapılmamış** olarak işaretlenmiş işleri "eksik" diye raporlama. Yapılacaklar listesi zaten var.

**Aradığımız şey:** kimsenin farkında olmadığı, hiçbir yerde yazmayan sorunlar.

## Mercekler

Aşağıdaki altı açıdan bak. Her mercek için ayrı ayrı düşün; hepsini birden taramaya çalışma.

### M1 · Tutarsızlık — kod ile doküman

`.ai/` altındaki kayıtlar kodun bugünkü hâlini doğru anlatıyor mu? Bir karar yazılıp uygulanmamış ya da uygulanıp yazılmamış olabilir.

_Örnek tür: bir ekranın metni artık geçersiz bir akışı anlatıyor._

### M2 · Ölü kod ve erişilemez yollar

Hiçbir yerden çağrılmayan modül, fonksiyon, tip, CSS sınıfı. Ulaşılamayan rota. Kullanılmayan dışa aktarım.

### M3 · Sessiz hata yolları

Bir hata yakalanıp yutuluyor mu? Kullanıcı yanlış bir şeyin olduğunu **fark etmeden** devam edebiliyor mu? Bir `catch` bloğu sorunu gizliyor mu?

Özellikle: bir işlem yarıda kalırsa sistem tutarsız bir durumda kalıyor mu?

### M4 · Sınır durumları

`null`, boş dizi, sıfır, negatif sayı, çok uzun metin, geçersiz tarih, eşzamanlı iki istek. Kod bunlarda ne yapıyor?

### M5 · Tutarsız desen

Aynı iş iki farklı yerde iki farklı biçimde yapılıyor mu? Biri diğerinden sonra yazılıp öncekiyle hizalanmamış olabilir.

### M6 · Erişilebilirlik ve mobil

Etiketsiz form alanı, klavyeyle ulaşılamayan düğme, dar ekranda taşan içerik, yalnızca renkle anlatılan bilgi.

## Sınırlar

- **En fazla 15 bulgu.** Daha fazlasını bulursan en önemli 15'ini seç.
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

Mercek     : M1 / M2 / M3 / M4 / M5 / M6
Konum      : dosya:satır
Ne oluyor  : Gözlemlenen durum. Tahmin değil, kodda gördüğün.
Neden önemli: Somut sonuç. "İyi olmaz" değil, "şu durumda şu olur".
Emin miyim : Evet / Hayır — hayırsa nedenini yaz
```

Sonda kısa bir özet: kaç bulgu, hangi mercekten kaç tane.

## Bitince

Rapordan başka bir şey verme. `git status --short` çıktısını da ekle — **boş olmalı**.
