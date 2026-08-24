import { describe, expect, it } from "vitest";
import {
  IDLE_TIMEOUT_MS,
  IDLE_WARNING_MS,
  remainingIdleMs,
  resolveIdleState,
} from "./idleTimeout";

const NOW = 1_800_000_000_000;

describe("resolveIdleState", () => {
  it("yeni etkinlikte oturum açık kalır", () => {
    expect(resolveIdleState(NOW - 1000, NOW)).toBe("active");
  });

  it("eşiğe yaklaşınca uyarır", () => {
    const lastActivity = NOW - (IDLE_TIMEOUT_MS - IDLE_WARNING_MS + 1);

    expect(resolveIdleState(lastActivity, NOW)).toBe("warning");
  });

  it("eşiğe ulaşınca süresi dolar", () => {
    expect(resolveIdleState(NOW - IDLE_TIMEOUT_MS, NOW)).toBe("expired");
  });

  it("kayıt yoksa süresi dolmuş sayar", () => {
    // Fail-open olmak — bilinmeyende oturumu açık bırakmak — bu fonksiyonun
    // var olma sebebini ortadan kaldırırdı.
    expect(resolveIdleState(null, NOW)).toBe("expired");
  });

  it("bozuk kayıtta süresi dolmuş sayar", () => {
    expect(resolveIdleState(Number.NaN, NOW)).toBe("expired");
  });

  it("gelecekteki zaman damgasını geçerli saymaz", () => {
    // Sistem saati geri alınmış veya depo kurcalanmış olabilir; oturumu
    // sonsuza kadar açık tutmak yerine hareketsizlik sayılır.
    expect(resolveIdleState(NOW + 60_000, NOW)).toBe("expired");
  });

  it("tarayıcı kapatılıp ertesi gün açıldığında süresi dolmuş olur", () => {
    // Zaman damgası localStorage'da tutulduğu için sayfa yenilemesi sayacı
    // sıfırlamaz; bu testin koruduğu davranış tam olarak budur.
    const yesterday = NOW - 24 * 60 * 60 * 1000;

    expect(resolveIdleState(yesterday, NOW)).toBe("expired");
  });
});

describe("remainingIdleMs", () => {
  it("kalan süreyi hesaplar", () => {
    expect(remainingIdleMs(NOW - 60_000, NOW)).toBe(IDLE_TIMEOUT_MS - 60_000);
  });

  it("süre dolduysa negatif dönmez", () => {
    expect(remainingIdleMs(NOW - IDLE_TIMEOUT_MS * 2, NOW)).toBe(0);
  });

  it("kayıt yoksa sıfır döner", () => {
    expect(remainingIdleMs(null, NOW)).toBe(0);
  });
});
