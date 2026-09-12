import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Çağıranı olmayan servis ihracı kalmaz (v1.4 ara denetimi, **K-19**).
 *
 * Bu test bir davranışı değil bir **tekrarı** ölçüyor. v1.4 boyunca aynı kusur
 * üç kez çıktı: servis yazıldı, testi yazıldı, kapı yeşil geçti — ve ekranda
 * onu çağıran hiçbir şey yoktu.
 *
 *   - v1.4-04: `updateExam` ve `archiveExam` (sınav düzenleme hiç açılmadı)
 *   - v1.4-05: ödev tarafında üç fonksiyon
 *   - v1.4-08'e kadar: `restoreStudent` ve `restoreClass`
 *
 * Üçü de teslim incelemesinde **elle** yakalandı ("ihraç ettiğin her fonksiyonun
 * çağıranı olduğunu ayrıca kontrol edeceğim"). Elle yapılan bir kontrol, onu
 * yapan kişi yorulduğunda biter; bu dosya o kontrolü kapıya taşıyor.
 *
 * ## Kapsam açıkça dardır (**K-19**)
 *
 * Yalnız **`export async function`** sayılır. Gerekçe: `async` bir ihraç
 * neredeyse her zaman bir ağ çağrısıdır — yani bir **servis**. Çağıranı olmayan
 * bir servis, ekranda karşılığı olmayan bir yetenektir ve tam olarak yukarıdaki
 * kusurdur.
 *
 * Senkron ihraçlar **bilerek** dışarıda: saf bir yardımcıyı yalnız kendi birim
 * testi için ihraç etmek meşru bir desendir ve bugün depoda dördü öyle
 * (`buildLoginNumber`, `weekDayToIso`, `dateToIsoWeekDay`, `__writeRawForTest`).
 * Onları da kapsasaydı bu test kuralı değil gürültüyü zorunlu kılardı.
 *
 * ## Bir fonksiyon "çağrılıyor" sayılır
 *
 *   - adı kendi dosyasında tanımından **başka bir yerde** geçiyorsa
 *     (dosya içi yardımcı; tanımın altında da olabilir, üstünde de), **veya**
 *   - test olmayan başka bir kaynak dosyada geçiyorsa.
 *
 * Test dosyaları **çağıran sayılmaz** — kusurun tanımı zaten "testi var,
 * çağıranı yok".
 */

const istemciKoku = path.resolve(import.meta.dirname, "..");

/**
 * Yorumları söker.
 *
 * ⚠️ Bu gerekli, süs değil: bu testin ilk hali `restoreStudent`'ı "çağrılıyor"
 * saydı çünkü adı `EducationPlatform.tsx`'te **yalnızca bir yorumda** geçiyordu.
 * Bir yorum çağıran değildir; tam tersine, ölü bir fonksiyonun en sık bulunduğu
 * yer onu anlatan yorumdur. K-23 mutasyonu (bağlantıyı geri alma) bu zaafı
 * gösterdi ve testin kendisi düzeltildi.
 */
function yorumlariSok(icerik: string): string {
  return icerik
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/gm, "$1");
}

/** `client/src` altındaki test olmayan tüm TypeScript kaynaklarını toplar. */
function kaynakDosyalar(kok: string): string[] {
  const bulunan: string[] = [];
  for (const girdi of readdirSync(kok, { withFileTypes: true })) {
    const tamYol = path.join(kok, girdi.name);
    if (girdi.isDirectory()) {
      bulunan.push(...kaynakDosyalar(tamYol));
      continue;
    }
    if (!/\.tsx?$/.test(girdi.name)) continue;
    if (/\.(test|spec)\.tsx?$/.test(girdi.name)) continue;
    bulunan.push(tamYol);
  }
  return bulunan;
}

/**
 * Kabul edilmiş ölü yüzey. Buraya bir satır eklemek bir **karar**dır: nerede
 * kayıtlı olduğunu ve kimin sahiplendiğini yazmadan ekleme.
 */
const KABUL_EDILMIS_OLU = new Map<string, string>([
  [
    "lib/documents.ts",
    // `PROJECT_STATE.md` §"lib/documents.ts ölü koddur": dayandığı
    // `workspace_documents` tablosunda hiç policy yok ve tablo yetkileri
    // 20260822221832'de kaldırıldı. "Belgeler" özelliği v1.6-01'de yeniden
    // ele alınana kadar bu şekilde kalır — sahibi ve kontrol noktası var.
    "PROJECT_STATE.md'de kayıtlı, v1.6-01'e ertelendi (#148)",
  ],
]);

describe("servis katmanında ölü ihraç kalmaz (v1.4 ara denetimi)", () => {
  const dosyalar = kaynakDosyalar(istemciKoku);
  const icerikler = new Map(
    dosyalar.map(yol => [yol, yorumlariSok(readFileSync(yol, "utf8"))])
  );

  it("her `export async function` en az bir yerden çağrılıyor", () => {
    const cagiransiz: string[] = [];

    for (const [yol, icerik] of icerikler) {
      const goreceli = path
        .relative(istemciKoku, yol)
        .split(path.sep)
        .join("/");
      if (KABUL_EDILMIS_OLU.has(goreceli)) continue;

      for (const eslesme of icerik.matchAll(/export async function (\w+)/g)) {
        const ad = eslesme[1];
        // ⚠️ Sayma ve arama AYRI regex'ler. `/g` bayraklı bir regex `.test()`
        // çağrıları arasında `lastIndex` taşır; tek bir örneği yeniden
        // kullanmak dosyaların yarısını "geçmiyor" gösteriyordu (ölçüldü: 87
        // yanlış pozitif).
        const sayma = new RegExp(String.raw`\b${ad}\b`, "g");
        const arama = new RegExp(String.raw`\b${ad}\b`);

        // Kendi dosyasında tanım dışında bir kez daha geçiyorsa kullanılıyor.
        if ((icerik.match(sayma) ?? []).length > 1) continue;

        // Ya da test olmayan başka bir kaynakta geçiyorsa.
        const baskaDosyada = [...icerikler].some(
          ([digerYol, digerIcerik]) =>
            digerYol !== yol && arama.test(digerIcerik)
        );
        if (baskaDosyada) continue;

        cagiransiz.push(`${ad} :: ${goreceli}`);
      }
    }

    // Hata mesajı "false !== true" değil, hangi fonksiyon olduğunu söylesin.
    expect(cagiransiz).toEqual([]);
  });

  it("kabul edilmiş ölü yüzey hâlâ ölü — kullanılmaya başlandıysa listeden çıkmalı", () => {
    // Muafiyet listesi bir kez yazılıp unutulan bir şey olmasın: muaf tutulan
    // dosya canlandığında bu iddia kırmızıya döner ve satırın silinmesini
    // ister. Aksi halde liste, gerçek kuralı sessizce yiyen bir çöplük olur.
    for (const [goreceli] of KABUL_EDILMIS_OLU) {
      const yol = path.join(istemciKoku, goreceli);
      const ad = path.basename(goreceli, path.extname(goreceli));
      const iceAktaran = [...icerikler].filter(
        ([digerYol, icerik]) =>
          digerYol !== yol && new RegExp(`["'][^"']*${ad}["']`).test(icerik)
      );
      expect(iceAktaran.map(([y]) => y)).toEqual([]);
    }
  });
});
