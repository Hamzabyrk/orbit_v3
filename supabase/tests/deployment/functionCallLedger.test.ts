import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Çağrı defteri özetleri kimlik belirteci taşımaz (v1.4-00, #261).
 *
 * `internal_function_calls`, tekrarlanan isteği ikinci kez yapmamak için
 * tutulan bir çağrı günlüğü. Kavramsal olarak bir **tenant kaydı değil** —
 * platform operatörünün çağrısının kurumu yoktur — ve bu yüzden
 * `organization_id` taşımıyor. Sonucu ölçülmüştü: `internal_delete_organization`
 * o tabloyu **görmüyor**, dolayısıyla silinen bir kurumun üyelerine ait
 * satırlar geride kalıyor.
 *
 * Karar (2026-09-10, `PLATFORM_SETTINGS` §5): satırı temizlemeye çalışmak
 * yerine **taşınacak bir şey bırakmamak.** Giriş numarası özetten çıkarıldı;
 * geriye yalnız "yapıldı" bayrakları kaldı.
 *
 * Kayıp yok: giriş numarası = kurum kodu + `person_code`, ikisi de yöneticiye
 * açık. Kalıcı kayıt zaten `audit_events` ve `platform_audit_events`'te
 * duruyor — ikisi de kurum kapsamlı, ikisi de kurumla birlikte gidiyor.
 *
 * **Neden test, neden yorum değil:** `internal_finish_function_call` gövdesine
 * ne verilirse onu yazar; kural veritabanında değil çağrı yerinde yaşıyor.
 * Bu depo yorumun kapı olmadığını iki kez ölçtü (K-19). Yeni bir Edge
 * Function yazan kişi özete giriş numarası koyduğunda bunu söyleyecek tek şey
 * buradaki kırmızı.
 */

const depoKoku = path.resolve(import.meta.dirname, "..", "..", "..");
const fonksiyonlarKoku = path.join(depoKoku, "supabase", "functions");

/** Özette bulunması yasak kimlik belirteçleri. */
const YASAKLI_ALANLAR = [
  "login_number",
  "person_code",
  "temporary_password",
  "email",
  "phone",
] as const;

function fonksiyonDizinleri(): string[] {
  return readdirSync(fonksiyonlarKoku, { withFileTypes: true })
    .filter(giris => giris.isDirectory() && !giris.name.startsWith("_"))
    .map(giris => giris.name)
    .sort();
}

/**
 * `finishFunctionCall(...)` çağrılarının argüman metni.
 *
 * Parantez sayarak çıkarılıyor: özet nesnesi çok satırlı ve iç içe olabilir,
 * tek satırlık bir regex onu yanlış keserdi.
 */
function ozetArgumanlari(kaynak: string): string[] {
  const cagrilar: string[] = [];
  const imza = "finishFunctionCall(";
  let arama = kaynak.indexOf(imza);

  while (arama !== -1) {
    let derinlik = 0;
    let konum = arama + imza.length - 1;

    for (; konum < kaynak.length; konum += 1) {
      if (kaynak[konum] === "(") derinlik += 1;
      if (kaynak[konum] === ")") {
        derinlik -= 1;
        if (derinlik === 0) break;
      }
    }

    cagrilar.push(kaynak.slice(arama + imza.length, konum));
    arama = kaynak.indexOf(imza, konum);
  }

  return cagrilar;
}

describe("çağrı defteri özetleri", () => {
  const dizinler = fonksiyonDizinleri();

  it("en az bir fonksiyon defteri kapatıyor", () => {
    // Bu iddia testin kendisini koruyor: `finishFunctionCall` yeniden
    // adlandırılırsa yukarıdaki arama sessizce sıfır çağrı bulur ve test
    // hiçbir şey ölçmeden yeşil kalırdı.
    const toplam = dizinler.reduce((sayac, dizin) => {
      const kaynak = readFileSync(
        path.join(fonksiyonlarKoku, dizin, "index.ts"),
        "utf8"
      );
      return sayac + ozetArgumanlari(kaynak).length;
    }, 0);

    expect(toplam).toBeGreaterThan(0);
  });

  it.each(dizinler)("%s özete kimlik belirteci yazmıyor", dizin => {
    const kaynak = readFileSync(
      path.join(fonksiyonlarKoku, dizin, "index.ts"),
      "utf8"
    );

    for (const arguman of ozetArgumanlari(kaynak)) {
      for (const alan of YASAKLI_ALANLAR) {
        expect(
          new RegExp(`\\b${alan}\\b`).test(arguman),
          `${dizin}: çağrı defteri özeti "${alan}" taşıyor`
        ).toBe(false);
      }
    }
  });
});
