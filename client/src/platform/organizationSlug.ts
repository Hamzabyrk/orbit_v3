/**
 * Kurum adından slug üretimi.
 *
 * Slug'ı operatöre elle yazdırmıyoruz. `bootstrap-organization` Edge Function'ı
 * `^[a-z0-9]+(?:-[a-z0-9]+)*$` kalıbını dayatıyor ve elle yazılan her değer bu
 * kalıbı ihlal etme adayı; üstelik hedef kitle Türkçe kurum adları giriyor.
 * Ad yazılırken slug otomatik türetilir, operatör isterse düzeltir.
 *
 * Slug kalıcıdır: kurum kurulduktan sonra değiştirilmesi ileride URL'leri ve
 * paylaşılmış bağlantıları kırar. Bu yüzden oluşturma ekranında görünür bir
 * alan olarak duruyor — operatör ne kaydedildiğini görmeden onaylamamalı.
 */

/** Edge Function'daki `organizationSlug` şemasıyla birebir aynı sınırlar. */
export const SLUG_MIN_LENGTH = 2;
export const SLUG_MAX_LENGTH = 80;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Türkçe harflerin ASCII karşılıkları.
 *
 * `String.prototype.toLowerCase()` tek başına yetmez: "İ" için birleşik nokta
 * içeren `i̇` üretir ve bu karakter slug kalıbına uymaz. Bu yüzden önce
 * çeviriyoruz, sonra küçültüyoruz.
 */
const TRANSLITERATION: Record<string, string> = {
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  I: "i",
  İ: "i",
  i: "i",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u",
  â: "a",
  Â: "a",
  î: "i",
  Î: "i",
  û: "u",
  Û: "u",
};

function transliterate(value: string): string {
  let result = "";

  for (const character of value) {
    result += TRANSLITERATION[character] ?? character;
  }

  return result;
}

/**
 * Kurum adından slug türetir. Türetilemezse boş dize döner; çağıran taraf bu
 * durumda operatörden slug'ı elle yazmasını ister ve sessizce bozuk bir değer
 * göndermez.
 */
export function slugifyOrganizationName(name: string): string {
  const ascii = transliterate(name).toLowerCase();

  let slug = "";
  let pendingSeparator = false;

  for (const character of ascii) {
    const isAllowed =
      (character >= "a" && character <= "z") ||
      (character >= "0" && character <= "9");

    if (isAllowed) {
      // Ayırıcı yalnızca ardından geçerli bir karakter geldiğinde yazılır;
      // böylece baştaki ve sondaki tireler hiç oluşmaz.
      if (pendingSeparator && slug.length > 0) {
        slug += "-";
      }

      pendingSeparator = false;
      slug += character;
      continue;
    }

    pendingSeparator = true;
  }

  return slug.slice(0, SLUG_MAX_LENGTH);
}

/** Değerin Edge Function tarafından kabul edileceğini önceden söyler. */
export function isValidOrganizationSlug(slug: string): boolean {
  return (
    slug.length >= SLUG_MIN_LENGTH &&
    slug.length <= SLUG_MAX_LENGTH &&
    SLUG_PATTERN.test(slug)
  );
}
