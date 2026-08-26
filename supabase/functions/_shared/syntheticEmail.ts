/**
 * Sentetik giriş adresi üretimi.
 *
 * Bu değer istemci tarafındaki loginIdentifier.ts içindeki ikiziyle aynı olmak
 * zorunda. Derleme hedefleri ayrı olduğu için tek dosyada birleştirilemiyor;
 * iki taraf bu sözleşmeye bağlıdır.
 */
export const SYNTHETIC_EMAIL_DOMAIN = "orbit.invalid";

export function syntheticEmailFor(loginNumber: string): string {
  return loginNumber + "@" + SYNTHETIC_EMAIL_DOMAIN;
}
