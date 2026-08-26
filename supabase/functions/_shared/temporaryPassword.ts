/**
 * Geçici şifrenin üretimi ve ömrü — tek kaynak.
 *
 * Bu dosya var olmadan önce aşağıdaki sabitler ve üretici
 * `bootstrap-organization`, `reset-admin-password` ve `reset-member-password`
 * içinde **üç ayrı kopya** hâlindeydi ve kopyaların birinde şu uyarı yazılıydı:
 * üçü aynı kalmak zorunda, yoksa aynı kuruma aynı gün verilen iki fişten biri
 * erken ölür ve sebebi kimseye görünmez.
 *
 * Uyarıyı yazmak yetmedi; `create-member` dördüncü kopyayı ekleyecekti. Kopya
 * çoğaltmak yerine tek kaynağa indirildi — bkz. `AGENT_WORKFLOW.md` K-06,
 * "Aynı olgu iki yerde tutulursa biri mutlaka eskir".
 */

/**
 * Geçici şifrenin ömrü.
 *
 * Hesabın nasıl açıldığından bağımsızdır: kurum kurulurken açılan yönetici,
 * yöneticinin açtığı öğretmen ve sıfırlanan bir şifre aynı süreyi alır.
 */
export const TEMPORARY_PASSWORD_TTL_DAYS = 7;

/** Geçici şifrenin geçerlilik bitişini ISO metni olarak verir. */
export function temporaryPasswordExpiresAt(now: number = Date.now()): string {
  return new Date(
    now + TEMPORARY_PASSWORD_TTL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
}

// Karışan karakterler yok: 0/O, 1/l/I. Şifre kâğıda yazılıp elden veriliyor.
const PASSWORD_LOWER = "abcdefghijkmnopqrstuvwxyz";
const PASSWORD_UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const PASSWORD_DIGIT = "23456789";
const PASSWORD_ALPHABET = PASSWORD_LOWER + PASSWORD_UPPER + PASSWORD_DIGIT;
const PASSWORD_LENGTH = 12;

/**
 * Kriptografik olarak güvenli geçici şifre üretir.
 *
 * Her sınıftan en az bir karakter garanti edilir, sonra kalan uzunluk karışık
 * alfabeden doldurulur ve tamamı karıştırılır — aksi halde ilk üç karakterin
 * sınıfı sabit olur ve tahmin uzayı daralırdı.
 *
 * Modulo sapması reddetme yöntemiyle engelleniyor: alfabe uzunluğunun tam
 * katına düşmeyen bayt değerleri atılıyor. Doğrudan `% alphabet.length`
 * kullanmak baştaki karakterleri gözle görülmeyecek kadar az ama ölçülebilir
 * biçimde sıklaştırırdı.
 */
export function generateTemporaryPassword(): string {
  const pick = (alphabet: string): string => {
    const limit = 256 - (256 % alphabet.length);
    const buffer = new Uint8Array(1);

    for (;;) {
      crypto.getRandomValues(buffer);
      if (buffer[0] < limit) {
        return alphabet[buffer[0] % alphabet.length];
      }
    }
  };

  const characters = [
    pick(PASSWORD_LOWER),
    pick(PASSWORD_UPPER),
    pick(PASSWORD_DIGIT),
  ];

  while (characters.length < PASSWORD_LENGTH) {
    characters.push(pick(PASSWORD_ALPHABET));
  }

  const randomIndices = new Uint32Array(characters.length);
  crypto.getRandomValues(randomIndices);

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapWith = randomIndices[index] % (index + 1);
    [characters[index], characters[swapWith]] = [
      characters[swapWith],
      characters[index],
    ];
  }

  return characters.join("");
}
