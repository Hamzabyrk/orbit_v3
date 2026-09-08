import { describe, expect, it } from "vitest";
import { formatTrDate, TR_MONTHS } from "./trDate";

describe("trDate (v1.3-01e & K-06)", () => {
  it("12 ayı eksiksiz ve doğru sırada içerir", () => {
    expect(TR_MONTHS).toEqual([
      "Ocak",
      "Şubat",
      "Mart",
      "Nisan",
      "Mayıs",
      "Haziran",
      "Temmuz",
      "Ağustos",
      "Eylül",
      "Ekim",
      "Kasım",
      "Aralık",
    ]);
  });

  it("ISO tarih dizgesini Türkçe biçime dönüştürür", () => {
    expect(formatTrDate("2026-08-14")).toBe("14 Ağustos 2026");
    expect(formatTrDate("2026-01-01")).toBe("1 Ocak 2026");
    expect(formatTrDate("2026-12-31")).toBe("31 Aralık 2026");
  });

  it("başında sıfır olan günleri sayıya çevirir (5 Eylül, 05 Eylül değil)", () => {
    expect(formatTrDate("2026-09-05")).toBe("5 Eylül 2026");
    expect(formatTrDate("2026-04-09")).toBe("9 Nisan 2026");
  });

  it("boş veya tanımsız değerde boş dizge döner (K-04)", () => {
    expect(formatTrDate("")).toBe("");
  });

  it("geçersiz biçimli dizgeleri olduğu gibi döndürür", () => {
    expect(formatTrDate("invalid-date")).toBe("invalid-date");
    expect(formatTrDate("2026/08/14")).toBe("2026/08/14");
    expect(formatTrDate("not-a-number-date")).toBe("not-a-number-date");
  });
});
