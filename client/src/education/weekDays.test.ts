import { describe, expect, it } from "vitest";
import {
  dateToIsoWeekDay,
  getDefaultScheduleDay,
  getTodayWeekDay,
  isoToWeekDay,
  WEEK_DAYS,
  weekDayToIso,
} from "./weekDays";

describe("weekDays — Yedi günlük hafta ve ISO 8601 dönüşümleri", () => {
  it("WEEK_DAYS yedi günü Pazartesi'den Pazar'a sıralı içerir", () => {
    expect(WEEK_DAYS).toHaveLength(7);
    expect(WEEK_DAYS).toEqual([
      "Pazartesi",
      "Salı",
      "Çarşamba",
      "Perşembe",
      "Cuma",
      "Cumartesi",
      "Pazar",
    ]);
  });

  describe("isoToWeekDay (ISO 1–7 -> Türkçe Etiket)", () => {
    it("1'den 7'ye ISO günlerini doğru etiketlere çevirir", () => {
      expect(isoToWeekDay(1)).toBe("Pazartesi");
      expect(isoToWeekDay(2)).toBe("Salı");
      expect(isoToWeekDay(3)).toBe("Çarşamba");
      expect(isoToWeekDay(4)).toBe("Perşembe");
      expect(isoToWeekDay(5)).toBe("Cuma");
      expect(isoToWeekDay(6)).toBe("Cumartesi");
      expect(isoToWeekDay(7)).toBe("Pazar");
    });

    it("Geçersiz ISO değerlerinde fail-closed olarak null döner", () => {
      expect(isoToWeekDay(0)).toBeNull();
      expect(isoToWeekDay(8)).toBeNull();
      expect(isoToWeekDay(-1)).toBeNull();
      expect(isoToWeekDay(99)).toBeNull();
    });
  });

  describe("weekDayToIso (Türkçe Etiket -> ISO 1–7)", () => {
    it("Türkçe gün etiketlerini ISO 1-7 sayılarına çevirir", () => {
      expect(weekDayToIso("Pazartesi")).toBe(1);
      expect(weekDayToIso("Salı")).toBe(2);
      expect(weekDayToIso("Çarşamba")).toBe(3);
      expect(weekDayToIso("Perşembe")).toBe(4);
      expect(weekDayToIso("Cuma")).toBe(5);
      expect(weekDayToIso("Cumartesi")).toBe(6);
      expect(weekDayToIso("Pazar")).toBe(7);
    });

    it("İki yönlü dönüşüm birbirini birebir doğrular (roundtrip)", () => {
      for (const day of WEEK_DAYS) {
        const iso = weekDayToIso(day);
        expect(isoToWeekDay(iso)).toBe(day);
      }
      for (let i = 1; i <= 7; i++) {
        const day = isoToWeekDay(i);
        expect(day).not.toBeNull();
        expect(weekDayToIso(day!)).toBe(i);
      }
    });
  });

  describe("getTodayWeekDay ve Date.getDay() ayrımı (K-06)", () => {
    it("Haftanın 7 gününü de eksiksiz çözer (hafta sonu null dönmez)", () => {
      // 2026-08-24 Pazartesi
      expect(getTodayWeekDay(new Date("2026-08-24T10:00:00"))).toBe(
        "Pazartesi"
      );
      // 2026-08-25 Salı
      expect(getTodayWeekDay(new Date("2026-08-25T10:00:00"))).toBe("Salı");
      // 2026-08-26 Çarşamba
      expect(getTodayWeekDay(new Date("2026-08-26T10:00:00"))).toBe("Çarşamba");
      // 2026-08-27 Perşembe
      expect(getTodayWeekDay(new Date("2026-08-27T10:00:00"))).toBe("Perşembe");
      // 2026-08-28 Cuma
      expect(getTodayWeekDay(new Date("2026-08-28T10:00:00"))).toBe("Cuma");
      // 2026-08-29 Cumartesi
      expect(getTodayWeekDay(new Date("2026-08-29T10:00:00"))).toBe(
        "Cumartesi"
      );
      // 2026-08-30 Pazar
      expect(getTodayWeekDay(new Date("2026-08-30T10:00:00"))).toBe("Pazar");
    });

    it("Date.getDay() Pazar için 0 dönerken dateToIsoWeekDay ISO 7 döner", () => {
      const pazar = new Date("2026-08-30T10:00:00");
      expect(pazar.getDay()).toBe(0); // JavaScript'in tehlikeli 0 indeksi
      expect(dateToIsoWeekDay(pazar)).toBe(7); // Veritabanı ISO 8601 standardı
      expect(getTodayWeekDay(pazar)).toBe("Pazar");
    });

    it("Cumartesi için Date.getDay() 6 iken dateToIsoWeekDay da 6 döner", () => {
      const cumartesi = new Date("2026-08-29T10:00:00");
      expect(cumartesi.getDay()).toBe(6);
      expect(dateToIsoWeekDay(cumartesi)).toBe(6);
      expect(getTodayWeekDay(cumartesi)).toBe("Cumartesi");
    });
  });

  describe("getDefaultScheduleDay", () => {
    it("Haftanın 7 gününde de günün kendisini varsayılan seçer", () => {
      expect(getDefaultScheduleDay(new Date("2026-08-24T10:00:00"))).toBe(
        "Pazartesi"
      );
      expect(getDefaultScheduleDay(new Date("2026-08-29T10:00:00"))).toBe(
        "Cumartesi"
      );
      expect(getDefaultScheduleDay(new Date("2026-08-30T10:00:00"))).toBe(
        "Pazar"
      );
    });
  });
});
