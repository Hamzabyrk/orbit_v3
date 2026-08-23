/**
 * Giriş belirtecinin çözümlenmesi.
 *
 * Giriş formu tek bir alan sorar. Kullanıcı ya gerçek e-posta adresini ya da
 * 8 haneli kişi numarasını yazar. Numara global olarak benzersiz olduğu için
 * kurum kodu ayrıca sorulmaz.
 *
 * Sentetik adres burada, **istemcide** kuruluyor. Yaygın alternatif her girişte
 * kullanıcı adını e-postaya çeviren `service_role` yetkili bir sunucu uç
 * noktasıdır; bu tasarım bilinçli olarak reddedildi çünkü kullanıcı şifresi
 * bizim sunucu kodumuzdan geçerdi. Numara benzersiz olduğu için aramaya gerek
 * yok, adres deterministik olarak üretilebiliyor.
 *
 * Karar ve gerekçeler: `.ai/DECISION_LOG.md` — "Kimlik ve Giriş Bilgisi Mimarisi".
 */

/**
 * RFC 2606 gereği `.invalid` hiçbir zaman çözümlenmez; bu adreslere kimse posta
 * gönderemez ve gerçek bir adresle çakışamaz. `.local` kullanılmaz — o uzantı
 * mDNS için ayrılmıştır (RFC 6762) ve yerel ağlarda çözümleme sorunu çıkarır.
 *
 * Alan adı satın alındığında burası gerçek bir alt alan adıyla değiştirilebilir
 * (örn. `users.orbit.app`). O noktada adresler geçerli hale gelir ve
 * "sağlayıcı teslim edilemez alan adını kabul eder mi" varsayımı tamamen
 * ortadan kalkar. Adreslere yine posta gönderilmez.
 */
export const SYNTHETIC_EMAIL_DOMAIN = "orbit.invalid";

/** Kurum ve kişi bölümlerinin her biri dört hane ve 1000'den başlar. */
export const CODE_MIN = 1000;
export const CODE_MAX = 9999;

/**
 * Sekiz hane: `<kurum:4><kişi:4>`. Her iki bölüm de 1000'den başladığı için
 * baştaki sıfır hiç oluşmaz; kullanıcı `0042`'yi `42` diye yazıp giriş
 * yapamaz duruma düşmez.
 */
const LOGIN_NUMBER_PATTERN = /^[1-9]\d{3}[1-9]\d{3}$/;

export type LoginIdentifier =
  | { kind: "email"; email: string }
  | {
      kind: "number";
      email: string;
      loginNumber: string;
      organizationCode: number;
      personCode: number;
    };

function isInCodeRange(value: number): boolean {
  return Number.isInteger(value) && value >= CODE_MIN && value <= CODE_MAX;
}

/**
 * Kurum ve kişi kodundan giriş numarası üretir.
 * Kodlardan biri aralık dışındaysa `null` döner; sessizce bozuk numara üretmez.
 */
export function buildLoginNumber(
  organizationCode: number,
  personCode: number
): string | null {
  if (!isInCodeRange(organizationCode) || !isInCodeRange(personCode)) {
    return null;
  }

  return `${organizationCode}${personCode}`;
}

/** Giriş numarasını kurum ve kişi bölümlerine ayırır. */
export function parseLoginNumber(
  loginNumber: string
): { organizationCode: number; personCode: number } | null {
  if (!LOGIN_NUMBER_PATTERN.test(loginNumber)) {
    return null;
  }

  return {
    organizationCode: Number(loginNumber.slice(0, 4)),
    personCode: Number(loginNumber.slice(4)),
  };
}

/** Giriş numarasının Supabase Auth tarafındaki karşılığı. */
export function syntheticEmailFor(loginNumber: string): string | null {
  if (!LOGIN_NUMBER_PATTERN.test(loginNumber)) {
    return null;
  }

  return `${loginNumber}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

/**
 * Giriş formundaki tek alanı çözümler.
 *
 * `@` içeren her girdi e-posta kabul edilir ve olduğu gibi kullanılır; biçim
 * doğrulaması bilinçli olarak Supabase'e bırakılır. Kendi e-posta doğrulama
 * kuralımızı yazmak, geçerli ama sıra dışı adresleri reddetme riski taşır.
 *
 * Girdi çözümlenemezse `null` döner. Çağıran taraf bu durumda da giriş
 * hatasıyla aynı, ayrım yapmayan mesajı göstermelidir; aksi halde hangi
 * numaraların var olduğu dışarıya sızar.
 */
export function resolveLoginIdentifier(input: string): LoginIdentifier | null {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.includes("@")) {
    return { kind: "email", email: trimmed };
  }

  const parts = parseLoginNumber(trimmed);
  const email = syntheticEmailFor(trimmed);

  if (!parts || !email) {
    return null;
  }

  return {
    kind: "number",
    email,
    loginNumber: trimmed,
    organizationCode: parts.organizationCode,
    personCode: parts.personCode,
  };
}
