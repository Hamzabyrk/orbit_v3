import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Dağıtım kapsamı testi (v1.2-13, **K-19**).
 *
 * Supabase GitHub entegrasyonu `main`'e merge edildiğinde Edge Function'ları
 * deploy eder — ama **yalnızca `config.toml`'da tanımlı olanları.** Dizin
 * eklemek yetmez ve eksik bırakmanın hiçbir belirtisi yoktur: CI yeşil kalır,
 * diğer fonksiyonlar güncellenir, eksik olan sessizce eski sürümünde donar.
 *
 * Bu tam olarak iki kez oldu:
 *
 *   * **2026-08-24** — `reset-admin-password` hiç oluşturulmadı. Teşhis edildi
 *     ve karşılığı `config.toml`'a bir **yorum** yazmak oldu: _"Yeni Edge
 *     Function ekleyen herkes buraya da satır ekler."_
 *   * **2026-08-26** — `create-member` yine unutuldu. Yorum yerindeydi, iki
 *     gün önce yazılmıştı ve okunmadı. Fonksiyon 2026-09-05'e kadar elle
 *     deploy edilmiş **v1** sürümünde dondu; o gün diğer dördü v103/77/77/51'e
 *     güncellendi ve hiçbir kapı kırmızı dönmedi.
 *
 * **Hatırlatma yetmedi, çünkü hatırlatma bir kapı değildir.** Bu dosya o
 * yorumun yerini almaz — onu zorunlu kılar.
 *
 * **Neden `vitest`, neden ayrı bir CI işi değil:** `pnpm test`, `quality-gate`
 * işinin içinde koşuyor ve `quality-gate` dal korumasında **zorunlu** bir
 * kontrol. Yeni bir CI işi ise ruleset'e eklenene kadar (repo yöneticisi işi)
 * hiçbir şeyi engellemezdi — yani kapı gibi görünüp kapı olmayan bir şey
 * olurdu. Ayrıca burada olması testin **yerelde de** koşması demek: iki ajan
 * da beş komutluk kapıyı çalıştırırken bunu görür.
 */

const depoKoku = path.resolve(import.meta.dirname, "..", "..", "..");
const fonksiyonlarKoku = path.join(depoKoku, "supabase", "functions");
const configYolu = path.join(depoKoku, "supabase", "config.toml");

/**
 * Deploy edilebilir fonksiyon dizinleri.
 *
 * `_` ile başlayanlar hariç: `_shared/` bir fonksiyon değil, fonksiyonların
 * import ettiği ortak modüllerdir ve kendi başına deploy edilmez.
 */
function deployEdilebilirDizinler(): string[] {
  return readdirSync(fonksiyonlarKoku, { withFileTypes: true })
    .filter(giris => giris.isDirectory() && !giris.name.startsWith("_"))
    .map(giris => giris.name)
    .sort();
}

function configOku(): string {
  return readFileSync(configYolu, "utf8");
}

/** `config.toml`'daki `[functions.<slug>]` başlıklarının tamamı. */
function tanimliFonksiyonlar(): string[] {
  return [...configOku().matchAll(/^\[functions\.([A-Za-z0-9_-]+)\]/gm)]
    .map(eslesme => eslesme[1])
    .sort();
}

describe("Edge Function dağıtım kapsamı", () => {
  it("her fonksiyon dizini config.toml'da tanımlıdır", () => {
    const dizinler = deployEdilebilirDizinler();
    const tanimlilar = tanimliFonksiyonlar();
    const eksikler = dizinler.filter(ad => !tanimlilar.includes(ad));

    expect(
      eksikler,
      `supabase/functions/ altında olup config.toml'da TANIMSIZ fonksiyon(lar): ${eksikler.join(", ")}. ` +
        "Bunlar merge edildiğinde production'a deploy EDİLMEZ; kod repoda durur, üretim eski sürümde kalır " +
        "ve hiçbir hata görünmez. supabase/config.toml'a `[functions.<ad>]` bloğu ekleyin."
    ).toEqual([]);
  });

  it("her config.toml tanımının karşılığında bir dizin vardır", () => {
    const dizinler = deployEdilebilirDizinler();
    const tanimlilar = tanimliFonksiyonlar();
    const sahipsizler = tanimlilar.filter(ad => !dizinler.includes(ad));

    // Ters yön de ölçülüyor: silinen bir fonksiyonun geride bıraktığı tanım,
    // listeyi okuyan herkese var olmayan bir fonksiyonu var gösterir.
    expect(
      sahipsizler,
      `config.toml'da tanımlı ama supabase/functions/ altında KARŞILIĞI OLMAYAN fonksiyon(lar): ${sahipsizler.join(", ")}. ` +
        "Fonksiyon silindiyse tanımı da silinmelidir."
    ).toEqual([]);
  });

  it("tanımlı her fonksiyon verify_jwt değerini açıkça yazar", () => {
    const config = configOku();

    // Bloğun başlığından bir sonraki blok başlığına (veya dosya sonuna) kadar
    // olan gövdesini alıp içinde ayarı arıyor.
    const ayarsizlar = [
      ...config.matchAll(
        /^\[functions\.([A-Za-z0-9_-]+)\]\r?\n([\s\S]*?)(?=^\[|\z)/gm
      ),
    ]
      .filter(([, , govde]) => !/^\s*verify_jwt\s*=/m.test(govde))
      .map(([, ad]) => ad)
      .sort();

    // Varsayılan bugün `true` ve bu doğru olan; ama varsayılana güvenmek,
    // `false` yazan birinin bunu bilerek yaptığını da doğrulanamaz kılar.
    // Açık yazım, kimliği doğrulanmamış çağrıya açılan bir fonksiyonun
    // diff'te görünmesini sağlar.
    expect(
      ayarsizlar,
      `verify_jwt ayarı açıkça yazılmamış fonksiyon(lar): ${ayarsizlar.join(", ")}. ` +
        "Varsayılana güvenmeyin: bu satır, bir fonksiyonun kimlik doğrulamasız çağrıya " +
        "açılmasının diff'te görünmesini sağlar."
    ).toEqual([]);
  });
});
