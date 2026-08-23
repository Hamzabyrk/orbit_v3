/**
 * Production Supabase Auth şifre politikasının istemci tarafı karşılığı.
 *
 * Kaynak doğruluk sunucudadır; buradaki kontrol yalnızca kullanıcıya anlamlı
 * hata gösterebilmek içindir. Sunucu zaten reddeder, ancak "Password should be
 * at least 8 characters" gibi İngilizce ham hatalar yerine hangi kuralın
 * eksik olduğunu Türkçe söylemek istiyoruz.
 *
 * Politika `.ai/PLATFORM_SETTINGS.md` bölüm 3.1'de kayıtlıdır:
 * minimum 8 karakter, küçük harf + büyük harf + rakam.
 * Politika panelden değiştirilirse bu dosya ve testleri de güncellenmelidir.
 */

export const MINIMUM_PASSWORD_LENGTH = 8;

/**
 * Büyük/küçük harf kontrolü, `\p{Lu}` gibi Unicode özellik sınıfları yerine
 * karakterin kendi büyük/küçük hâliyle karşılaştırılmasıyla yapılır.
 *
 * Sebep: bu projenin `tsconfig` hedefi regex `u` bayrağını desteklemiyor ve
 * yalnızca `[a-z]` / `[A-Z]` kullanmak Türkçe harfleri (ş, ğ, İ, ı) harf
 * saymayarak geçerli şifreleri reddederdi.
 */
function hasLowercaseLetter(value: string): boolean {
  return Array.from(value).some(
    char => char === char.toLowerCase() && char !== char.toUpperCase()
  );
}

function hasUppercaseLetter(value: string): boolean {
  return Array.from(value).some(
    char => char === char.toUpperCase() && char !== char.toLowerCase()
  );
}

export type PasswordRule = {
  id: "length" | "lowercase" | "uppercase" | "digit";
  label: string;
  satisfied: boolean;
};

export function evaluatePassword(password: string): PasswordRule[] {
  return [
    {
      id: "length",
      label: `En az ${MINIMUM_PASSWORD_LENGTH} karakter`,
      satisfied: password.length >= MINIMUM_PASSWORD_LENGTH,
    },
    {
      id: "lowercase",
      label: "En az bir küçük harf",
      satisfied: hasLowercaseLetter(password),
    },
    {
      id: "uppercase",
      label: "En az bir büyük harf",
      satisfied: hasUppercaseLetter(password),
    },
    {
      id: "digit",
      label: "En az bir rakam",
      satisfied: /\d/.test(password),
    },
  ];
}

export function isPasswordValid(password: string): boolean {
  return evaluatePassword(password).every(rule => rule.satisfied);
}

/**
 * Formu göndermeden önceki tek kontrol noktası. Hata yoksa `null` döner.
 */
export function findPasswordProblem(
  password: string,
  confirmation: string
): string | null {
  if (!isPasswordValid(password)) {
    return "Şifre, aşağıdaki kuralların tamamını karşılamalıdır.";
  }

  if (password !== confirmation) {
    return "Şifreler birbiriyle eşleşmiyor.";
  }

  return null;
}
