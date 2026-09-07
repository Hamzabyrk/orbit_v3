import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Edge Function bağımlılık kapsamı ve pin senkronizasyonu testi (v1.3-10, **K-19**).
 *
 * Edge Function'lar Deno çalışma ortamında çalışır ve harici paketleri `npm:`
 * protokolüyle çeker. Her fonksiyon dosyasında satır içi (`inline`) sürüm
 * sabitlemek (`npm:@supabase/supabase-js@2.45.4`) üç sorun yaratıyordu:
 *
 *   1. Sürümler dosyalara saçıldığı için bir fonksiyonda yapılan yama veya
 *      güncelleme diğerlerinde unutuluyordu.
 *   2. Node tarafındaki `package.json` bağımlılıkları ile Edge Function
 *      tarafındaki sürümler zamanla ayrışıyordu (drift).
 *   3. CI veya tip denetimi satır içi importların sürüm uyumsuzluğunu
 *      otomatik yakalayamıyordu.
 *
 * Bu test üç kuralı zorunlu kılar:
 *   - `_shared/deps.ts` içindeki pin sürümleri, `package.json`'daki ana sürümlerle
 *     (caret temizlenerek) birebir eşleşmelidir.
 *   - `_shared/deps.ts` hariç hiçbir Edge Function dosyasında satır içi `npm:`
 *     import/export'u bulunamaz (tüm bağımlılıklar `deps.ts` üzerinden geçer).
 *   - `_shared/deps.ts` içinde tanımlı her paketin `package.json`'da karşılığı
 *     olmalıdır.
 */

const depoKoku = path.resolve(import.meta.dirname, "..", "..", "..");
const fonksiyonlarKoku = path.join(depoKoku, "supabase", "functions");
const depsYolu = path.join(fonksiyonlarKoku, "_shared", "deps.ts");
const packageJsonYolu = path.join(depoKoku, "package.json");

/**
 * `supabase/functions/_shared/deps.ts` dosyasından sabitlenmiş paket adlarını ve
 * sürümlerini ayıklar.
 */
function depsPinleriniOku(): Map<string, string> {
  const icerik = readFileSync(depsYolu, "utf8");
  const eslesmeler = icerik.matchAll(
    /["']npm:((?:@[^/@"']+\/)?[^/@"']+)@([^"'@\s]+)["']/g
  );
  const pinler = new Map<string, string>();
  for (const m of eslesmeler) {
    pinler.set(m[1], m[2]);
  }
  return pinler;
}

/**
 * `package.json` içindeki bağımlılıkları ve caret/tilde temizlenmiş sürümlerini
 * döner.
 */
function packageJsonBagimliliklari(): Map<string, string> {
  const icerik = JSON.parse(readFileSync(packageJsonYolu, "utf8"));
  const bagimliliklar = new Map<string, string>();
  const tumu = {
    ...(icerik.dependencies || {}),
    ...(icerik.devDependencies || {}),
  };
  for (const [ad, semver] of Object.entries(tumu)) {
    const temiz = (semver as string).replace(/^[\^~=v]/, "").trim();
    bagimliliklar.set(ad, temiz);
  }
  return bagimliliklar;
}

/**
 * `supabase/functions/` altındaki tüm `.ts` dosyalarının yollarını rekürsif olarak
 * toplar.
 */
function tumFonksiyonDosyalari(dizin: string): string[] {
  const sonuclar: string[] = [];
  const girisler = readdirSync(dizin, { withFileTypes: true });
  for (const giris of girisler) {
    const tamYol = path.join(dizin, giris.name);
    if (giris.isDirectory()) {
      sonuclar.push(...tumFonksiyonDosyalari(tamYol));
    } else if (giris.isFile() && giris.name.endsWith(".ts")) {
      sonuclar.push(tamYol);
    }
  }
  return sonuclar;
}

describe("Edge Function bağımlılık kapsamı", () => {
  it("deps.ts pinleri package.json sürümleriyle birebir eşleşir", () => {
    const pinler = depsPinleriniOku();
    const pkgBagimliliklar = packageJsonBagimliliklari();

    expect(
      pinler.size,
      "supabase/functions/_shared/deps.ts içinde en az bir npm: bağımlılık pini bulunmalıdır."
    ).toBeGreaterThan(0);

    const uyumsuzluklar: string[] = [];
    for (const [paket, pinSurum] of pinler.entries()) {
      const pkgSurum = pkgBagimliliklar.get(paket);
      if (pkgSurum !== pinSurum) {
        uyumsuzluklar.push(
          `${paket}: deps.ts=${pinSurum}, package.json=${pkgSurum ?? "YOK"}`
        );
      }
    }

    expect(
      uyumsuzluklar,
      `deps.ts pinleri package.json ile uyuşmuyor: ${uyumsuzluklar.join("; ")}. ` +
        "Edge Function bağımlılıkları package.json ile aynı sürümde sabitlenmelidir (K-19)."
    ).toEqual([]);
  });

  it("deps.ts haricinde hiçbir Edge Function dosyasında satır içi npm: importu bulunamaz", () => {
    const dosyalar = tumFonksiyonDosyalari(fonksiyonlarKoku);
    const depsGoreceliYol = path.join("_shared", "deps.ts");

    const hataliKullanimlar: { dosya: string; satirlar: string[] }[] = [];

    for (const tamYol of dosyalar) {
      const goreceliYol = path.relative(fonksiyonlarKoku, tamYol);
      if (goreceliYol === depsGoreceliYol) {
        continue;
      }

      const icerik = readFileSync(tamYol, "utf8");
      const satirlar = icerik.split(/\r?\n/);
      const npmSatirlari = satirlar
        .map((satir, indeks) => ({ satir: satir.trim(), no: indeks + 1 }))
        .filter(({ satir }) => /["']npm:[^"']+["']/.test(satir))
        .map(({ satir, no }) => `L${no}: ${satir}`);

      if (npmSatirlari.length > 0) {
        hataliKullanimlar.push({
          dosya: goreceliYol.replace(/\\/g, "/"),
          satirlar: npmSatirlari,
        });
      }
    }

    expect(
      hataliKullanimlar,
      `deps.ts haricinde satır içi npm: importu tespit edildi: ${JSON.stringify(
        hataliKullanimlar,
        null,
        2
      )}. ` +
        "Tüm Edge Function bağımlılıkları supabase/functions/_shared/deps.ts üzerinden import edilmelidir (K-19)."
    ).toEqual([]);
  });

  it("deps.ts'te tanımlı her paketin package.json'da karşılığı vardır", () => {
    const pinler = depsPinleriniOku();
    const pkgBagimliliklar = packageJsonBagimliliklari();

    const sahipsizler: string[] = [];
    for (const paket of pinler.keys()) {
      if (!pkgBagimliliklar.has(paket)) {
        sahipsizler.push(paket);
      }
    }

    expect(
      sahipsizler,
      `deps.ts'te tanımlı ama package.json'da KARŞILIĞI OLMAYAN paket(ler): ${sahipsizler.join(", ")}. ` +
        "Edge Function bağımlılıkları package.json listesine de eklenmelidir."
    ).toEqual([]);
  });
});
