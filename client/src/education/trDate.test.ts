import { describe, expect, it } from "vitest";
import {
  formatTrDate,
  formatTrWeekLabel,
  getOrbitToday,
  orbitLocalDate,
  TR_MONTHS,
} from "./trDate";

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

  it("orbitLocalDate: SAKLANMIŞ bir anın kurum saatindeki takvim gününü verir (v1.5-09)", () => {
    // Bu, `getOrbitToday`'den farklı bir soru: "bugün hangi gün" değil,
    // "BU AN hangi güne ait". Veritabanı aynı soruyu
    // `orbit_local_date(timestamptz)` ile cevaplıyor ve istemci onunla aynı
    // cevabı vermek zorunda (K-06).
    //
    // 2026-09-18 22:00:00Z → İstanbul 2026-09-19 01:00 — **ERTESİ GÜN**.
    // İlk on karakteri kesmek "2026-09-18" verirdi, yani yanlış gün.
    expect(orbitLocalDate("2026-09-18T22:00:00Z")).toBe("2026-09-19");

    // Gündüz vaktinde UTC ile kurum günü aynı; kesme de doğru sonucu verirdi.
    // İddia bu yüzden tek başına yeterli değil, üstteki ile birlikte duruyor.
    expect(orbitLocalDate("2026-09-18T10:00:00Z")).toBe("2026-09-18");

    // Ters yön: gün başı UTC, İstanbul'da aynı gün sabah 03:00.
    expect(orbitLocalDate("2026-09-19T00:00:00Z")).toBe("2026-09-19");
  });

  it("orbitLocalDate: Date örneği de kabul eder ve getOrbitToday ile aynı cevabı verir", () => {
    const an = new Date("2026-09-08T22:30:00Z");

    expect(orbitLocalDate(an)).toBe("2026-09-09");
    // SQL'de `orbit_today()` = `orbit_local_date(now())`; istemcide de öyle.
    expect(orbitLocalDate(an)).toBe(getOrbitToday(an));
  });

  it("orbitLocalDate: boş, tanımsız ve çözümlenemeyen değerde boş dizge döner (K-04)", () => {
    // Olmayan bir günü uydurmaktansa hiç yazmamak. `formatTrDate` aynı
    // davranışta ve ikisi zincir hâlinde kullanılıyor
    // (`formatTrDate(orbitLocalDate(inst.paidAt))`), yani boş değer sessizce
    // boş ekrana dönüyor — "1 Ocak 1970" değil.
    expect(orbitLocalDate(undefined)).toBe("");
    expect(orbitLocalDate(null)).toBe("");
    expect(orbitLocalDate("")).toBe("");
    expect(orbitLocalDate("olmayan-tarih")).toBe("");
    expect(orbitLocalDate(new Date("olmayan-tarih"))).toBe("");
  });

  it("formatTrWeekLabel: hafta başlangıcını kısa Türkçe gün ve ay formatına dönüştürür (v1.4-16 / K-06)", () => {
    expect(formatTrWeekLabel("2026-08-24")).toBe("24 Ağu");
    expect(formatTrWeekLabel("2026-08-31")).toBe("31 Ağu");
    expect(formatTrWeekLabel("2026-09-07")).toBe("7 Eyl");
    expect(formatTrWeekLabel("2026-09-14")).toBe("14 Eyl");
    expect(formatTrWeekLabel("")).toBe("");
    expect(formatTrWeekLabel(null)).toBe("");
    expect(formatTrWeekLabel("invalid")).toBe("invalid");
  });
});
