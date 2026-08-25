# Görev C3 — Ekranlar veri olmadığında da çalışsın

> Kaynak: `ROADMAP.md` Faz E5, ikinci dilim. C2 (`mockData` ayrımı) tamamlandı.
> Bu görevde **hiçbir ekran boşalmayacak.** Demo verisi yerinde kalıyor; yapılan şey, boşaldığında ne olacağını hazırlamak.

## Önce bunları oku

1. `AGENTS.md` — giriş noktası ve kod kuralları
2. `.ai/AGENT_WORKFLOW.md` — çalışma düzeni; özellikle **K-03**, **K-04** ve **K-07**
3. `client/src/components/education/demoData.ts`
4. `client/src/components/education/shared.tsx`

## Neden

Production bugün **sahte öğrenci, sahte sınıf ve sahte ödeme gösteriyor.** Ekranlar demo verisini doğrudan import ediyor ve hiçbir yerde "veri yoksa" durumu yok.

Bunu tek hamlede kapatmak mümkün değil: veriyi kesersek ekranlar sahte veri yerine **bozuk ekran** gösterir — boş tablolar, sıfır bölmeler, anlamsız başlıklar. Bu yüzden sıra **ayır → boşa dayan → anahtarı çevir** ve bu görev ortadaki adım.

Bu görev bittiğinde ekranlar boş veriyle doğru davranıyor olacak ama **hâlâ demo verisi görecekler.** Anahtarı bir sonraki dilim çevirecek.

## Yapılacaklar

### 1. Tek bir veri kaynağı modülü: `educationData.ts`

`client/src/components/education/educationData.ts` oluştur. Bugün **saf bir geçiş katmanı** olacak — `demoData`'dan aldığını olduğu gibi dışa aktaracak:

```ts
/**
 * Eğitim ekranlarının veri kaynağı.
 *
 * Bugün demo verisini olduğu gibi geçiriyor. Faz E5'in son diliminde burası
 * ortama göre dallanacak: demo modunda demo verisi, production'da gerçek
 * (bugün boş) veri. Ekranların tek bir yerden beslenmesinin sebebi o anahtarın
 * tek bir dosyada çevrilebilmesi.
 */
export {
  classes,
  dayPlanEventsByRole,
  paymentRows,
  schedule,
  students,
  // ... ekranların ihtiyaç duyduğu diğerleri
} from "./demoData";
```

Sonra **demo verisi kullanan ekranların import'unu** `../demoData` yerine `../educationData`'ya çevir.

**İki istisna — bunlar `demoData`'da kalır ve import'ları değişmez:**

- `LoginScreen.tsx` → `roleEmail`. Demo giriş kartları için; zaten yalnızca demo modunda görünüyor.
- `EducationPlatform.tsx` → `initialAttendances`, `initialAutomations`, `initialHomework`, `dayPlanTasksByRole`. Bunlar ekranda gösterilen liste değil, React state'inin başlangıç tohumu. Ayrı bir iş.

`EducationPlatform.tsx`'in `students` import'u ise ekrana veri besliyor; o `educationData`'ya taşınır.

### 2. Ortak boş durum bileşeni

`shared.tsx` içine `EmptyState` ekle. Tek bir bileşen olması bilinçli: on ekranda on farklı boş ekran görüntüsü, ürünü baştan savma gösterir.

```ts
export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) { ... }
```

Görünüm: mevcut kart/panel diliyle uyumlu, ortalanmış, sessiz bir kutu. Hata gibi görünmemeli — boş olmak bir arıza değil.

**Bilgi yalnızca renkle anlatılmasın**, metin her durumda okunabilir olsun.

### 3. Her ekrana boş durumunu ekle

**Kontrol, filtrelenmiş sonuç üzerinde yapılmalı.** Sayfalar önce role göre filtreliyor, sonra basıyor; ham dizi dolu ama filtrelenmiş sonuç boş olabilir ve kullanıcının gördüğü ikincisi.

Metinleri aynen kullan:

| Dosya                             | Liste                 | Başlık                            | Açıklama                                                              |
| --------------------------------- | --------------------- | --------------------------------- | --------------------------------------------------------------------- |
| `pages/ClassesPage.tsx`           | `classes`             | Henüz sınıf kaydı yok             | —                                                                     |
| `pages/AttendancePage.tsx`        | `students`            | Henüz öğrenci kaydı yok           | Yoklama alabilmek için önce öğrenci eklenmesi gerekir.                |
| `pages/SchedulePage.tsx`          | `schedule`            | Ders programı henüz oluşturulmadı | —                                                                     |
| `pages/PaymentsPage.tsx`          | `paymentRows`         | Henüz ödeme kaydı yok             | —                                                                     |
| `pages/DayPlanPage.tsx`           | `dayPlanEventsByRole` | Bugün için planlanmış bir şey yok | —                                                                     |
| `dashboards/AdminDashboard.tsx`   | `classes`, `schedule` | Gösterilecek kayıt yok            | İlgili bölüm için ayrı ayrı; kartın kendi içinde küçük bir boş durum. |
| `dashboards/TeacherDashboard.tsx` | `schedule`            | Bugün ders programınız görünmüyor | —                                                                     |

**`pages/HomeworkCreateDialog.tsx` farklı ele alınır.** Sınıf listesi boşsa ödev oluşturulamaz. Boş durum kutusu yerine: gönder düğmesi devre dışı bırakılır ve sebebi yazılır — _"Ödev verilebilecek bir sınıf yok."_ Sessizce boş bir açılır liste gösterme; kullanıcı neden seçemediğini anlamalı.

**Açıklama alanı boş bırakılanlarda uydurma metin yazma.** Örneğin _"Yönetici ekledikçe burada görünecek"_ **yazma** — o özellik henüz yok ve tutamayacağımız bir söz veriyor.

## Dokunabileceğin dosyalar

- `client/src/components/education/educationData.ts` (yeni)
- `client/src/components/education/shared.tsx`
- Yukarıdaki tabloda geçen 7 dosya
- `client/src/components/education/pages/HomeworkCreateDialog.tsx`
- `client/src/components/education/EducationPlatform.tsx` — **yalnızca `students` import satırı**

Başka bir dosyaya dokunman gerektiğini düşünüyorsan **yapma — dur ve sor.**

## Yapılmayacaklar

- ❌ `isDemoMode` koşulu ekleme — anahtar sıradaki dilimde çevrilecek, bu görevde **yok**
- ❌ Demo verisini silme, kısaltma veya değiştirme
- ❌ Filtreleme mantığına dokunma. Sayfalarda `mentor === "Merve Karaca"` gibi sabit isimlerle filtreleme var; **bunlar yanlış ve biliniyor**, gerçek kapsam üyelikten gelecek. Bu görevde düzeltilmiyor, olduğu gibi bırak.
- ❌ Yeni sayfa, yeni rota, yeni özellik
- ❌ `supabase/`, `.ai/`, `client/src/auth/`, `client/src/platform/` altına dokunma
- ❌ `git commit`, `git push`, branch açma
- ❌ Yeni bağımlılık
- ❌ `eslint-disable` veya `@ts-ignore`

## Nasıl doğrulayacaksın

Kalite kapısı boş durumları **çalıştırmaz**, çünkü demo verisi hâlâ dolu. Kendin sınamak zorundasın:

`educationData.ts` içindeki bir dışa aktarımı geçici olarak boş dizi yap, ekranı gözle kontrol et, sonra **geri al.** Teslimde hangi ekranları böyle sınadığını yaz.

Geçici değişikliğin teslim edilen diff'te **kalmadığından emin ol.**

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

1. `git status --short` (yeni dosyalar `git diff`te görünmez, bunu ekle)
2. `git diff --stat`
3. Tam diff
4. Kalite kapısının beş komutunun **gerçek çıktısı**
5. Varsayımların, **ve hangi ekranları boş veriyle gözle sınadığın**

## Aklında tut

**K-03 · Çözümlenemeyen veri uydurulmuş değerle gösterilmez.** Boş bir liste "0 kayıt" değil, "kayıt yok"tur — ve olmayan bir özelliği vaat eden bir açıklama, uydurulmuş değerdir.

**K-07 · Ortak git ağacı.** `git add -A` kullanma, dal değiştirme, başka birinin dosyasını geri alma.

**Kapının yeşil olduğunu bildirmek kanıt değildir.** Denetleyen beşini de kendisi çalıştıracak.
