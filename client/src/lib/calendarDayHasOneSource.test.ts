import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * "Bugün hangi gün" sorusunun tek bir kaynağı vardır (v1.4 kapanış taraması).
 *
 * Kurum saati **Europe/Istanbul** ve bu bir sunum tercihi değil bir iş kuralı:
 * `orbit_today()` v1.3-15'te tam bu yüzden yazıldı, #239 _"vadesi geçti hangi
 * güne göre"_ diye sorduğu için. İstemci tarafındaki ikizi
 * `trDate.ts`'teki `getOrbitToday()`.
 *
 * ⚠️ **Yasaklanan kalıp `new Date().toISOString()` ile takvim günü üretmek.**
 * `toISOString()` **UTC** döndürür; Türkiye UTC+3 olduğu için gece yarısı ile
 * 03:00 arasında bu ifade **dünkü** tarihi verir.
 *
 * Kapanış taramasında ölçüldü (2026-09-14): kural dört yerde doğru
 * uygulanmış, **dört yerde atlanmıştı** — ve en ağırı yoklama ekranıydı,
 * çünkü oradaki değer bir gösterim değil, açılan oturumun **tarihi**.
 *
 * Kuralın var olması, yardımcının yazılmış olması ve dört yerde
 * kullanılıyor olması yetmedi. Bu yüzden kapıya taşındı (**K-24**).
 *
 * **Kapsam dışı bırakılan, bilerek:** `new Date()` değerinin `date-fns`
 * `format()`'ına verilmesi (`AdminDashboard.tsx`). O **tarayıcı yerel saatini**
 * kullanıyor, UTC'yi değil — Türkiye'deki bir kullanıcı için doğru sonucu
 * veriyor. Yanlış olduğu durum yurt dışındaki bir kullanıcı ve bu ayrı bir
 * karar; aynı iddianın içine karıştırılmadı.
 *
 * Ve `new Date().toISOString()`'in **tam hâli** serbest: o bir **an** damgası
 * (`createdAt`, `recordedAt`) ve an için UTC doğrudur. Yakalanan şey yalnız
 * ondan bir **takvim günü** kesmek.
 */

const istemciKoku = path.resolve(import.meta.dirname, "..");

/** Kuralın kendi evi: tanım burada, dolayısıyla muaf. */
const KAYNAK_DOSYA = path.join(istemciKoku, "education", "trDate.ts");

/**
 * `new Date()` → `toISOString()` → takvim günü kesimi.
 *
 * İki kesme biçimi de yakalanıyor çünkü ikisi de depoda bulundu:
 * `.split("T")[0]` ve `.slice(0, 10)`.
 */
const YASAK =
  /new Date\(\)\s*\.toISOString\(\)\s*\.\s*(?:split\(\s*["']T["']\s*\)\s*\[\s*0\s*\]|slice\(\s*0\s*,\s*10\s*\))/g;

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

describe("takvim gününün tek kaynağı vardır (v1.4 kapanış taraması)", () => {
  it("hiçbir üretim dosyası `new Date().toISOString()` ile takvim günü kesmiyor", () => {
    const bulunanlar: string[] = [];

    for (const yol of kaynakDosyalar(istemciKoku)) {
      if (yol === KAYNAK_DOSYA) continue;

      const icerik = readFileSync(yol, "utf8");
      const satirlar = icerik.split("\n");

      satirlar.forEach((satir, index) => {
        // Desen her satırda yeniden aranıyor; tek bir `RegExp` örneği `g`
        // bayrağıyla çağrılar arasında `lastIndex` taşır ve ikinci eşleşmeyi
        // kaçırır (bu depoda bir kez ölçüldü, `deadServiceExports`).
        if (new RegExp(YASAK.source).test(satir)) {
          bulunanlar.push(
            `${path.relative(istemciKoku, yol).split(path.sep).join("/")}:${index + 1}`
          );
        }
      });
    }

    expect(bulunanlar).toEqual([]);
  });

  it("kuralın yardımcısı gerçekten kurum saatini kullanıyor", () => {
    // Kapı yalnız yasağı sınasaydı, `getOrbitToday` bir gün UTC'ye dönse
    // hiçbir şey kırmızıya dönmezdi — yasak yine sağlanır, sonuç yine yanlış
    // olurdu. İddia bu yüzden çifttir.
    const icerik = readFileSync(KAYNAK_DOSYA, "utf8");
    expect(icerik).toContain('timeZone: "Europe/Istanbul"');
  });
});
