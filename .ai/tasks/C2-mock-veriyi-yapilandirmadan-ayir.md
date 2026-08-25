# Görev C2 — `mockData.ts`'i üçe ayır: sahte veri, rol bilgisi, menü

> Kaynak: `ROADMAP.md` Faz E5, ilk dilim.
> Bu görev **mekaniktir.** Hiçbir davranış değişmeyecek; yalnızca dışa aktarımlar doğru dosyalara taşınacak.

## Önce bunları oku

1. `AGENTS.md` — giriş noktası ve kod kuralları
2. `.ai/AGENT_WORKFLOW.md` — çalışma düzeni; özellikle **K-07**
3. `client/src/components/education/mockData.ts`
4. `client/src/components/education/types.ts`

## Sorun

`mockData.ts` adı yüzünden hepsi mock sanılıyor ama dosya **üç farklı türde şey** taşıyor:

| Tür                         | Dışa aktarımlar                                                                                                                                              | Production'da gerekli mi                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| **Sahte iş verisi**         | `students`, `classes`, `schedule`, `initialAutomations`, `paymentRows`, `initialHomework`, `initialAttendances`, `dayPlanTasksByRole`, `dayPlanEventsByRole` | ❌ Hayır — yalnızca demo sunumu için         |
| **Uygulama yapılandırması** | `roleMeta` (etiket, kısa ad, açıklama, ikon, renk), `allNav` (menü yapısı ve rol görünürlüğü)                                                                | ✅ **Evet** — gerçek kullanıcı da bunu görür |
| **Demo giriş bilgisi**      | `roleEmail`                                                                                                                                                  | ❌ Hayır — demo giriş ekranı için            |

Karışıklığın somut bedeli: `client/src/auth/AuthProvider.tsx` — yani **kimlik katmanı** — `roleMeta` için `mockData`'yı import etmek zorunda kalıyor. Kimlik katmanının "mock" adlı bir dosyaya bağlı olması yanlış görünüyor ve aslında bağlı olduğu şey mock değil, rol etiketleri.

Ayrıca sıradaki dilim bunu gerektiriyor: sahte veriyi demo moduna hapsedebilmek için önce **hangisinin sahte olduğunun** dosya düzeyinde ayrılmış olması lazım.

## Yapılacaklar

`mockData.ts` **silinecek** ve yerine üç dosya gelecek. Hepsi `client/src/components/education/` altında:

### 1. `demoData.ts`

Yukarıdaki tablodaki **sahte iş verisi** satırının tamamı **ve** `roleEmail`.

Dosyanın başına şu yorumu koy:

```ts
/**
 * Yalnızca demo sunumu içindir. Bu dosyadaki hiçbir şey gerçek bir kuruma ait
 * değildir ve production'da gösterilmemelidir.
 *
 * Bugün hâlâ production'da da okunuyor; demo moduna hapsedilmesi Faz E5'in
 * sıradaki dilimidir. Buraya yeni veri eklerken bunu aklında tut.
 */
```

### 2. `roleMeta.ts`

Yalnızca `roleMeta`.

### 3. `navigation.ts`

Yalnızca `allNav`.

### Sonra import'ları düzelt

`mockData`'yı import eden **13 dosya** var. Her biri artık ihtiyacı olan dosyadan alacak. Bir dosya birden fazlasına ihtiyaç duyabilir; o zaman birden fazla import satırı olur.

Bulmak için:

```bash
grep -rln "mockData" client/src
```

İş bittiğinde bu komut **hiçbir şey döndürmemeli.**

## Bu bir taşıma işidir

- Kodun içeriğini **değiştirme.** Diziler, nesneler, tipler aynen taşınacak.
- Yeni dışa aktarım **ekleme**, var olanı **yeniden adlandırma.**
- `types.ts`'e dokunma; üç dosya da tiplerini oradan import etmeye devam eder.
- İkon import'ları (`lucide-react`) hangi dosyada kullanılıyorsa oraya gider. `roleMeta` ve `allNav` ikon kullanıyor, `demoData` kullanmıyor olabilir — kontrol et, kullanılmayan import bırakma.

**Doğrulama ölçütü:** `git diff` yalnızca satırların yer değiştirdiğini göstermeli. Testler ve build, değişiklik öncesiyle **aynı** sonucu vermeli.

## Dokunabileceğin dosyalar

- `client/src/components/education/mockData.ts` (silinecek)
- `client/src/components/education/demoData.ts` (yeni)
- `client/src/components/education/roleMeta.ts` (yeni)
- `client/src/components/education/navigation.ts` (yeni)
- `mockData`'yı import eden 13 dosya — **yalnızca import satırları**

Başka bir dosyaya dokunman gerektiğini düşünüyorsan **yapma — dur ve sor.**

## Yapılmayacaklar

- ❌ Davranış değiştirme, mantık düzeltme, refactor
- ❌ `isDemoMode` koşulu ekleme — o sıradaki dilim, bu görevde **yok**
- ❌ Veriyi silme veya kısaltma
- ❌ `supabase/` ve `.ai/` altına dokunma
- ❌ `git commit`, `git push`, branch açma
- ❌ Yeni bağımlılık
- ❌ `eslint-disable` veya `@ts-ignore`

## Kalite kapısı

Beşi de salt okumadır; çalıştırmak için ayrıca izin istemene gerek yok.

```bash
npx prettier --check .
npx eslint .
npx tsc --noEmit
npx vitest run
npx vite build
```

Kendi yazdığın dosyaları biçimlendirmek için `npx prettier --write <yol>` serbesttir.

## Teslim — beş çıktı

1. `git diff --name-only`
2. `git diff --stat`
3. Tam diff
4. Kalite kapısının beş komutunun **gerçek çıktısı** — "geçti" yazmak yetmez, çıktıyı ver
5. Varsayımların — brifingde net olmayan bir şeyi nasıl yorumladın

Ek olarak `grep -rln "mockData" client/src` çıktısını ver. **Boş olmalı.**

## Aklında tut

**K-07 · Ortak git ağacı.** `git add -A` kullanma, dal değiştirme, başka birinin dosyasını geri alma. Yalnızca yukarıda listelenen dosyalara dokun.

**Kapının yeşil olduğunu bildirmek kanıt değildir.** Denetleyen beşini de kendisi çalıştıracak. Bir önceki teslimde `prettier --check` yeşil bildirilmişti ve kırmızıydı.
