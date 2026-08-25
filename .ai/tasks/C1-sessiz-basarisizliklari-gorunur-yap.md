# Görev C1 — Sessizce başarısız olan işlemleri operatöre göster

> Kaynak: Issue #80, A1 analizinin B03, B04 ve B07 bulguları.
> Bu görev **yalnızca istemci tarafıdır.** Sunucu tarafı denetleyende, ayrı bir işte.

## Önce bunları oku

1. `AGENTS.md` — giriş noktası
2. `.ai/AGENT_WORKFLOW.md` — çalışma düzeni; özellikle **K-03** ve **K-04**
3. `client/src/platform/platformService.ts`
4. `client/src/platform/CredentialsPanel.tsx`

## Sorun

Kurum oluşturma ve yönetici şifresi sıfırlama işlemleri, **kısmen başarısız olduklarında bile tam başarı gibi görünüyor.**

Edge Function yanıtında bunu bildiren alanlar **zaten var**, ancak istemci onları hiç okumuyor:

| Alan                | Anlamı                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `password_lock_set` | `false` ise **ilk giriş kilidi kurulamadı** — kullanıcı geçici şifreyle süresiz dolaşabilir |
| `audit_written`     | `false` ise **denetim kaydı yazılamadı** — işlemin izi yok                                  |

En somut sonucu: `CredentialsPanel` bastığı fişe _"İlk girişte şifrenizi değiştirmeniz istenecektir"_ yazıyor. Kilit kurulamadıysa bu cümle **kâğıda basılmış bir yalandır** ve kimse yanlış olduğunu bilemez.

## Yapılacaklar

### 1. Yanıttaki iki bayrağı oku

`platformService.ts` içinde `createOrganization` ve `resetAdminPassword` fonksiyonları bugün yalnızca `temporary_password` ve giriş numarasını okuyor. `password_lock_set` ve `audit_written` alanlarını da oku ve `OrganizationCredentials` tipine taşı.

**Bayrakları üç durumlu ele al:**

- `false` → uyarı göster
- `true` → uyarı yok
- **alan yok / `undefined` → uyarı yok**

Üçüncü madde önemli: `audit_written` alanı sunucuya **henüz eklenmedi** (denetleyen ayrı bir işte ekliyor). Alan gelmediğinde uyarı göstermemelisin, aksi halde bugün her işlem yanlışlıkla uyarı verir. Kod, alan eklendiğinde **kendiliğinden** çalışmalı.

### 2. `CredentialsPanel`'de uyarıyı göster

Uyarı, geçici şifrenin **yanında ve göz ardı edilemeyecek belirginlikte** olmalı. İki bayrak ayrı ayrı bildirilir; ikisi birden `false` olabilir.

Metinler operatöre **ne yapması gerektiğini** söylemeli, teknik hata adı vermemeli:

- `password_lock_set === false` →
  _"İlk giriş kilidi kurulamadı. Bu hesap geçici şifresini değiştirmeden sisteme girebilir. Kurum yöneticisine şifresini ilk girişte kendisinin değiştirmesi gerektiğini bildirin ve panelden şifre sıfırlamayı tekrar deneyin."_
- `audit_written === false` →
  _"Bu işlemin denetim kaydı yazılamadı. İşlem gerçekleşti ancak platform denetim listesinde görünmeyecek."_

**Yazdırılan fişi de düzelt.** `plainText` içindeki _"İlk girişte şifrenizi değiştirmeniz istenecektir."_ satırı yalnızca `password_lock_set !== false` iken basılmalıdır. Kilit kurulamadıysa o satır çıkarılır — yerine bir uyarı koyma, fiş kuruma teslim ediliyor ve operatörün iç sorunları orada yazmaz.

**Bilgi yalnızca renkle anlatılmasın.** Uyarı metni her durumda okunabilir olmalı; kırmızı çerçeve tek başına yeterli değildir.

### 3. Bozuk istatistik sıfır gösterilmesin (B07)

`platformService.ts` içinde kurum istatistiklerini okuyan fonksiyon, alanları `Number(payload.member_count ?? 0)` biçiminde çeviriyor. Alan eksikse veya sayıya çevrilemiyorsa sonuç `0` ya da `NaN` oluyor.

Bu değer **geri alınamaz bir silme işleminin onay ekranında** kullanılıyor. Dolu bir kurum için "0 üye" göstermek, operatörün kurumu boş sanıp silmesine yol açar.

Fonksiyonun başında `error || !data` kontrolü **zaten var** ve `null` dönüyor — çağıran taraf `null` durumunda sayı yerine uyarı gösteriyor. Eksik olan, verinin geldiği ama **alanların bozuk olduğu** durum.

Dört alandan **herhangi biri** sonlu bir tam sayıya çevrilemiyorsa fonksiyon tamamının `null` dönmesi gerekir. Kısmi sonuç dönme; üç doğru sayı ve bir uydurma sıfır, dört uydurma sayıdan daha tehlikelidir çünkü güvenilir görünür.

## Dokunabileceğin dosyalar

- `client/src/platform/platformService.ts`
- `client/src/platform/CredentialsPanel.tsx`

Başka bir dosyaya dokunman gerektiğini düşünüyorsan **yapma — dur ve sor.**

## Yapılmayacaklar

- ❌ `supabase/` altında hiçbir şey — Edge Function ve şema denetleyende
- ❌ `.ai/` altında hiçbir şey
- ❌ `git commit`, `git push`, branch açma
- ❌ Yeni bağımlılık
- ❌ `eslint-disable` veya `@ts-ignore`
- ❌ Brifingde yazmayan ek özellik
- ❌ `client/src/auth/` altına dokunma — orada ayrı bir iş sürüyor

## Kalite kapısı

Bitirdiğinde **hepsini** çalıştır ve çıktılarını teslimde ver:

```bash
npx prettier --check .
npx eslint .
npx tsc --noEmit
npx vitest run
```

## Teslim — beş çıktı

1. Değişen dosyaların listesi (`git diff --name-only`)
2. `git diff --stat` çıktısı
3. Tam diff
4. Kalite kapısının dört komutunun çıktısı
5. Yaptığın varsayımlar — brifingde net olmayan bir şeyi nasıl yorumladın

## Aklında tut

**K-04 · Bilinmeyende güvenli tarafta kal.** Bir bayrak okunamıyorsa veya bir sayı çözümlenemiyorsa, iyimser değeri gösterme.

**K-03 · Çözümlenemeyen veri uydurulmuş değerle gösterilmez.** Bilinmeyen bir sayı `0` değildir; bilinmeyen bir durum "başarılı" değildir.
