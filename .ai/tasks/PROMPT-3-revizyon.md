# Codex'e verilecek 3. prompt — revizyon

> Görev çıktısı incelendi. Aşağıdaki üç düzeltmeyi yap, sonra aynı beş çıktıyı yeniden ver.

---

İnceleme yapıldı. Kod büyük ölçüde doğru: `AuthShell` doğru kullanılmış, ortak sınıf sabitleri yeniden kullanılmış, kaçış yolu bırakılmamış, kapsam dışına çıkılmamış.

Üç düzeltme gerekiyor. Hepsi `remainingDays` hesabının çevresinde.

## 1. Kalan süre yukarı değil AŞAĞI yuvarlanmalı

Şu an `Math.ceil` kullanılıyor. Sonuç: **kalan süre olduğundan fazla gösteriliyor.**

| Gerçek kalan | Ekranda yazan | Sorun                                     |
| ------------ | ------------- | ----------------------------------------- |
| 2,1 gün      | "3 gün"       | ~1 gün fazla                              |
| 5 saat       | "1 gün"       | Kullanıcı bir günü var sanır, 5 saati var |

Bir son tarih **asla olduğundan uzun gösterilmemeli**. Kullanıcı "yarın hallederim" der ve hesabı kilitlenir.

Düzeltme:

- 1 günden fazla kalmışsa **aşağı yuvarla** (`Math.floor`) ve gün olarak yaz.
- 1 günden az kalmışsa **saat** olarak yaz ("Geçici şifreniz yaklaşık 5 saat sonra geçersiz olacak"). Burada da aşağı yuvarla.
- 1 saatten az kalmışsa "1 saatten az" yaz.

## 2. Geçersiz tarih ekrana `NaN` basıyor

`expiresAt` bozuk bir değer olursa (`new Date(...)` → `Invalid Date`):

```
Geçici şifreniz NaN gün sonra geçersiz olacak.
```

Şu an bu satır kullanıcıya böyle görünür.

Düzeltme: tarih çözümlenemiyorsa **süre bilgisini hiç gösterme** — `expiresAt` `null` gelmiş gibi davran. Uydurma bir sayı göstermektense hiç göstermemek doğru.

`Number.isFinite(...)` ile kontrol etmen yeterli.

## 3. "Süresi doldu" kararı yuvarlanmış sayıdan türetilmemeli

Şu an:

```ts
const expired = remainingDays !== null && remainingDays <= 0;
```

Yani **gösterim için yapılan yuvarlama, güvenlik kararını da belirliyor.** Bugün tesadüfen doğru çalışıyor, ancak yuvarlama biçimi değişirse (ki 1. maddede değiştiriyorsun) karar da sessizce değişir.

Düzeltme: `expired` doğrudan zaman damgası karşılaştırmasından gelsin — kalan süreyi ekranda yazmak için hesapladığın değerden değil.

Gösterim ile karar birbirinden ayrılmalı: biri kullanıcıya bilgi verir, diğeri ekranın hangi hâlinin görüneceğini belirler.

## Değiştirme

- Dosyanın geri kalanına dokunma.
- Başka dosya açma, başka dosya değiştirme.
- Yeni bağımlılık ekleme.
- Commit/push yapma.

## Bitince yine beş çıktıyı ver

`git status --short`, `git diff`, kalite kapısı sonuçları, varsayımlar, emin olamadıkların.
