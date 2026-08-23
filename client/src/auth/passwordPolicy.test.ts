import { describe, expect, it } from "vitest";
import {
  MINIMUM_PASSWORD_LENGTH,
  evaluatePassword,
  findPasswordProblem,
  isPasswordValid,
} from "./passwordPolicy";

describe("passwordPolicy", () => {
  it("politikayı karşılayan şifreyi kabul eder", () => {
    expect(isPasswordValid("Orbit2026")).toBe(true);
  });

  it("minimum uzunluğun altındaki şifreyi reddeder", () => {
    expect("Orbit26".length).toBeLessThan(MINIMUM_PASSWORD_LENGTH);
    expect(isPasswordValid("Orbit26")).toBe(false);
  });

  it("büyük harf, küçük harf veya rakam eksikse reddeder", () => {
    expect(isPasswordValid("orbit2026")).toBe(false);
    expect(isPasswordValid("ORBIT2026")).toBe(false);
    expect(isPasswordValid("OrbitOrbit")).toBe(false);
  });

  it("hangi kuralın karşılanmadığını tek tek bildirir", () => {
    const rules = evaluatePassword("orbit");
    const byId = Object.fromEntries(rules.map(r => [r.id, r.satisfied]));

    expect(byId.length).toBe(false);
    expect(byId.lowercase).toBe(true);
    expect(byId.uppercase).toBe(false);
    expect(byId.digit).toBe(false);
  });

  it("Türkçe karakterleri harf olarak tanır", () => {
    // "İ" büyük, "ş" küçük harftir; ASCII aralığı dışında kaldıkları için
    // Unicode özellik sınıflarıyla eşleştirilmeleri gerekir.
    expect(isPasswordValid("İstanbuş1")).toBe(true);
  });

  it("eşleşmeyen şifre tekrarını yakalar", () => {
    expect(findPasswordProblem("Orbit2026", "Orbit2027")).toBe(
      "Şifreler birbiriyle eşleşmiyor."
    );
  });

  it("politika ihlalini eşleşme kontrolünden önce bildirir", () => {
    expect(findPasswordProblem("kisa", "farkli")).toBe(
      "Şifre, aşağıdaki kuralların tamamını karşılamalıdır."
    );
  });

  it("geçerli ve eşleşen şifrede sorun bildirmez", () => {
    expect(findPasswordProblem("Orbit2026", "Orbit2026")).toBeNull();
  });
});
