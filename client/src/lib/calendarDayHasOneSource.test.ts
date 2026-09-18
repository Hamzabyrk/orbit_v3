import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * "Bugün hangi gün" sorusunun tek bir kaynağı vardır (v1.4 kapanış taraması,
 * kapı v1.5-09'da **yeniden yazıldı**).
 *
 * Kurum saati **Europe/Istanbul** ve bu bir sunum tercihi değil bir iş kuralı:
 * `orbit_today()` v1.3-15'te tam bu yüzden yazıldı, #239 _"vadesi geçti hangi
 * güne göre"_ diye sorduğu için. İstemci ikizleri `trDate.ts`'te ve SQL'deki
 * ikiliyi birebir aynalıyor: `orbitLocalDate` ↔ `orbit_local_date(timestamptz)`,
 * `getOrbitToday` ↔ `orbit_today()`.
 *
 * ## 🔴 Bu kapı bir kez yazıldı ve üç gerçek ihlalde yeşil kaldı
 *
 * İlk hâli `new Date().toISOString().split("T")[0]` kalıbının **tek bir
 * yazımını** arıyordu. Mutasyonla sınandı (2026-09-16) ve **2/2 yeşil kaldı**;
 * kaçırdıkları ölçüldü:
 *
 *   1. `const iso = new Date().toISOString(); iso.slice(0, 10)` — iki ifadeye
 *      bölünmüş hâl; desen **komşuluk** istiyordu
 *   2. Çok satıra bölünmüş zincir — desen satır satır aranıyor
 *   3. `.substring(0, 10)` — desen yalnız `slice` ve `split` biliyordu
 *
 * Ve yeşil kalması teorik değildi: kapı yürürlükteyken depoda **iki gerçek
 * ihlal** duruyordu (2026-09-18'de ölçüldü, ikisi de `v1.5-09`'da düzeltildi):
 *
 *   - `CalendarEventFormDialog` — `startsAt.slice(0, 10)`
 *   - `PaymentPlanDetailDialog` — `paidAt?.slice(0, 10)`
 *
 * İkincisi kuralın neden var olduğunun tam örneği: veritabanı "zamanında mı
 * ödendi" sorusunu `orbit_local_date(paid_at)` ile cevaplıyor, arayüz aynı
 * soruya UTC kesmesiyle cevap veriyordu. Gece 00:00-03:00 arasında kaydedilen
 * bir ödeme için **ikisi ayrı gün söylüyordu** (**K-06**).
 *
 * ## Kapının şekli neden bu — ölçülerek seçildi
 *
 * **`toISOString()` tümüyle yasaklanamaz:** üretim kodunda **28** çağrısı var
 * ve 28'i de gerçek **an** damgası (`archived_at`, `paid_at`, `recordedAt`,
 * bir React `key`). An için UTC doğrudur; yakalanması gereken şey ondan bir
 * **takvim günü** kesmek.
 *
 * **Bu yüzden kesmenin kendisi yasaklandı, kaynağı değil.** Desen artık
 * `toISOString()`'in nerede olduğunu sormuyor — on karakterlik gün kesmesini
 * arıyor. Komşuluk şartı kalktığı için yukarıdaki üç biçim de yakalanıyor.
 *
 * **Neden tam olarak `(0, 10)`:** üretim kodundaki bütün `slice`/`substring`
 * kullanımları ölçüldü (2026-09-18). `10` dışındaki her sayı meşru bir işe
 * yarıyor — liste tavanı (`slice(0, limit)`, `(0, 3)`, `(0, 2)`), kısaltma
 * (`(0, 7)`, `(0, 8)`), giriş numarası ayrıştırma (`(0, 4)`), slug tavanı
 * (`80`) ve **`(0, 5)`**: `time` kolonundan `HH:MM`. Sonuncusu aynı şeklin
 * meşru hâli ve ayrımı kolonun tipi veriyor — `time` saat dilimi taşımaz,
 * `timestamptz` taşır. Kapı kolonun tipini göremez, sayıyı görür; `10` ise bu
 * depoda takvim günü uzunluğundan başka hiçbir şey değil. Yani yanlış alarm
 * sayısı **bugün sıfır** ve bu ölçüldü, varsayılmadı.
 *
 * **Muafiyet yok.** Kuralın kendi evi (`trDate.ts`) de bu desenden geçiyor,
 * çünkü doğru uygulama kesmiyor: `Intl.DateTimeFormat` ile saat dilimi
 * uyguluyor. Muaf bir dosya bırakmak, gevşetilecek bir kol bırakmak olurdu.
 *
 * ## Kapsam dışı — bilerek ve ölçülerek
 *
 *   - **`new Date()` değerinin `date-fns` `format()`'ına verilmesi**
 *     (`AdminDashboard.tsx`). O **tarayıcı yerel saatini** kullanıyor, UTC'yi
 *     değil — Türkiye'deki bir kullanıcı için doğru sonucu veriyor. Yanlış
 *     olduğu durum yurt dışındaki bir kullanıcı ve bu ayrı bir karar; aynı
 *     iddianın içine karıştırılmadı.
 *   - **Edge Function'lar** (`supabase/functions/**`). Aynı desen orada da
 *     arandı ve **0 bulundu** (2026-09-18). Kapsama alınmadı çünkü o tarafta
 *     karşılık gelen bir yardımcı henüz yok; kapıyı oraya genişletmek, önce
 *     verilmemiş bir tasarım kararını dolaylı olarak vermek olurdu.
 */

const istemciKoku = path.resolve(import.meta.dirname, "..");

/** Kuralın evi. Muaf değil — yalnız ikinci ve üçüncü iddianın ölçtüğü dosya. */
const KAYNAK_DOSYA = path.join(istemciKoku, "education", "trDate.ts");

/**
 * On karakterlik **takvim günü kesmesi**, kaynağından bağımsız.
 *
 * Komşuluk şartı bilerek YOK: `toISOString()`'in aynı satırda olmasını
 * istemek, kapının üç gerçek ihlalde yeşil kalmasının sebebiydi.
 */
const YASAK_GUN_KESMESI = [
  // .slice(0, 10) · .substring(0, 10) · .substr(0, 10)
  /\.\s*(?:slice|substring|substr)\(\s*0\s*,\s*10\s*\)/,
  // .split("T")[0] · .split("T").at(0) · .split("T").shift()
  /\.\s*split\(\s*["'`]T["'`]\s*\)\s*(?:\[\s*0\s*\]|\.\s*at\(\s*0\s*\)|\.\s*shift\(\s*\))/,
];

function kaynakDosyalar(kok: string): string[] {
  const cikan: string[] = [];
  for (const ad of readdirSync(kok)) {
    const yol = path.join(kok, ad);
    if (statSync(yol).isDirectory()) {
      cikan.push(...kaynakDosyalar(yol));
      continue;
    }
    if (!/[.](ts|tsx)$/.test(ad)) continue;
    if (/[.]test[.](ts|tsx)$/.test(ad)) continue;
    cikan.push(yol);
  }
  return cikan;
}

/** Desenlerden herhangi biri metinde geçiyor mu. */
function gunKesiyor(metin: string): boolean {
  // Desenlerde `g` bayrağı YOK, bu yüzden `lastIndex` çağrılar arasında
  // taşınmıyor. Eski hâlin tek `g` bayraklı örneğiyle ikinci eşleşmeyi
  // kaçırma tuzağı (`deadServiceExports`'ta bir kez ölçüldü) burada bayrağın
  // hiç kullanılmamasıyla çözüldü.
  return YASAK_GUN_KESMESI.some(desen => desen.test(metin));
}

describe("takvim gününün tek kaynağı vardır (v1.4 kapanış taraması · v1.5-09)", () => {
  it("hiçbir üretim dosyası on karakterlik takvim günü kesmiyor", () => {
    const bulunanlar: string[] = [];

    for (const yol of kaynakDosyalar(istemciKoku)) {
      const satirlar = readFileSync(yol, "utf8").split("\n");

      satirlar.forEach((satir, index) => {
        if (gunKesiyor(satir)) {
          bulunanlar.push(
            `${path.relative(istemciKoku, yol).split(path.sep).join("/")}:${index + 1}`
          );
        }
      });
    }

    expect(bulunanlar).toEqual([]);
  });

  it("kuralın yardımcısı gerçekten kurum saatini kullanıyor", () => {
    // Kapı yalnız yasağı sınasaydı, `orbitLocalDate` bir gün UTC'ye dönse
    // hiçbir şey kırmızıya dönmezdi — yasak yine sağlanır, sonuç yine yanlış
    // olurdu. İddia bu yüzden çifttir.
    const icerik = readFileSync(KAYNAK_DOSYA, "utf8");
    expect(icerik).toContain('timeZone: "Europe/Istanbul"');
  });

  it("`getOrbitToday` ile `orbitLocalDate` aynı kaynaktan besleniyor", () => {
    // SQL'de `orbit_today()` = `orbit_local_date(now())`. İstemcide de aynı
    // olmak zorunda: iki ayrı `Intl` kurulumu, bir gün birinin saat dilimi
    // değiştiğinde ikisinin sessizce ayrışması demek (**K-06**).
    const icerik = readFileSync(KAYNAK_DOSYA, "utf8");

    expect(icerik).toContain("return orbitLocalDate(referenceDate);");
    expect(icerik.match(/timeZone: "Europe\/Istanbul"/g)).toHaveLength(1);
  });

  it("🔴 kapı, ÖNCEKİ hâlinin kaçırdığı üç biçimi de yakalıyor", () => {
    // Bu iddia kapının kendi mutasyon testi. Önceki hâlin zayıflığı görünmez
    // olduğu için — yeşil geçiyordu ve depoda iki gerçek ihlal duruyordu —
    // kaçırdığı biçimler artık kapının içinde sabitlendi. Desen daraltılırsa
    // burası kırmızıya döner (**K-23**).
    const kacanlar = [
      // 1 · iki ifadeye bölünmüş: komşuluk şartının kaçırdığı hâl
      "const gun = iso.slice(0, 10);",
      // 2 · zincirin sonu ayrı satırda
      "  .slice(0, 10);",
      // 3 · `substring` — önceki desen yalnız `slice` ve `split` biliyordu
      "const gun = damga.substring(0, 10);",
    ];

    for (const satir of kacanlar) {
      expect(gunKesiyor(satir), satir).toBe(true);
    }

    // Ve hâlâ yakalanması gereken asıl biçim
    expect(gunKesiyor('new Date().toISOString().split("T")[0]')).toBe(true);
  });

  it("kapı meşru kullanımlara yanlış alarm vermiyor", () => {
    // Yanlış alarm sayısının sıfır olması ölçülmüş bir gerçek; bu iddia onu
    // sabitliyor. Biri deseni "her `slice`" diye genişletirse burası düşer ve
    // sebebini okur.
    const mesrular = [
      "const timeStr = startsAt.slice(0, 5);", // `time` kolonundan HH:MM
      "const slicedRows = hasMore ? rawRows.slice(0, limit) : rawRows;",
      "const visibleSchedule = schedule.slice(0, 3);",
      "organizationCode: Number(loginNumber.slice(0, 4)),",
      "return slug.slice(0, SLUG_MAX_LENGTH);",
      "{operator.userId.slice(0, 8)}…",
      "new Date().toISOString()", // an damgası: serbest
    ];

    for (const satir of mesrular) {
      expect(gunKesiyor(satir), satir).toBe(false);
    }
  });
});
