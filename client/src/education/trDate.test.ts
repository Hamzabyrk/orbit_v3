import { describe, expect, it } from "vitest";
import { formatTrDate, getOrbitToday, TR_MONTHS } from "./trDate";

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

  it("getOrbitToday: kurum saatindeki (Europe/Istanbul) takvim gününü döner ve gece yarısı tuzağını doğru çözer (v1.3-15)", () => {
    // 2026-09-08 saat 22:30:00 UTC -> Istanbul saat 01:30:00 (2026-09-09)
    const midnightEdgeDate = new Date("2026-09-08T22:30:00Z");
    expect(getOrbitToday(midnightEdgeDate)).toBe("2026-09-09");

    // Normal gündüz vakti: 2026-09-11 saat 10:00:00 UTC -> Istanbul saat 13:00:00 (2026-09-11)
    const middayDate = new Date("2026-09-11T10:00:00Z");
    expect(getOrbitToday(middayDate)).toBe("2026-09-11");
  });
});
