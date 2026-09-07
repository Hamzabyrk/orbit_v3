/**
 * Hafta günleri, etiketleri ve ISO 8601 dönüşümleri — tek kaynak (v1.3-00, **K-06**).
 *
 * Karar 2026-09-05'te alındı (`.ai/DECISION_LOG.md` — "Hafta yedi gündür").
 * Dershaneler ve eğitim kurumları haftanın yedi günü çalışır (özellikle hafta sonu
 * deneme sınavları, etütler ve hafta sonu grupları kurumun ana omurgasıdır).
 *
 * **Kritik saat/gün tuzağı (K-06):**
 * - Veritabanında `schedule_entries.day_of_week` kolonu ISO 8601 standardında tutulur:
 *   **Pazartesi = 1, Salı = 2, ..., Pazar = 7**.
 * - JavaScript yerleşik `Date.prototype.getDay()` ise **Pazar = 0**, Pazartesi = 1,
 *   ..., Cumartesi = 6 döner.
 *
 * Bu iki kuralı birbirine karıştırmak bir günlük kaymaya yol açar. Bu modül iki
 * dünya arasındaki dönüşümün tek doğruluk kaynağıdır.
 */

export type WeekDay =
  | "Pazartesi"
  | "Salı"
  | "Çarşamba"
  | "Perşembe"
  | "Cuma"
  | "Cumartesi"
  | "Pazar";

export type IsoWeekDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Pazartesi'den Pazar'a sıralı 7 gün listesi. */
export const WEEK_DAYS: readonly WeekDay[] = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
] as const;

const ISO_TO_WEEK_DAY: Record<IsoWeekDay, WeekDay> = {
  1: "Pazartesi",
  2: "Salı",
  3: "Çarşamba",
  4: "Perşembe",
  5: "Cuma",
  6: "Cumartesi",
  7: "Pazar",
};

const WEEK_DAY_TO_ISO: Record<WeekDay, IsoWeekDay> = {
  Pazartesi: 1,
  Salı: 2,
  Çarşamba: 3,
  Perşembe: 4,
  Cuma: 5,
  Cumartesi: 6,
  Pazar: 7,
};

/**
 * ISO 8601 gün numarasını (1=Pazartesi ... 7=Pazar) WeekDay Türkçe etiketine çevirir.
 * Geçersiz sayılarda (ör. 0 veya 8) null döner (fail-closed, K-04).
 */
export function isoToWeekDay(isoDay: number): WeekDay | null {
  if (isoDay >= 1 && isoDay <= 7) {
    return ISO_TO_WEEK_DAY[isoDay as IsoWeekDay];
  }
  return null;
}

/**
 * WeekDay Türkçe etiketini ISO 8601 gün numarasına (1=Pazartesi ... 7=Pazar) çevirir.
 */
export function weekDayToIso(day: WeekDay): IsoWeekDay {
  return WEEK_DAY_TO_ISO[day];
}

/**
 * Verilen bir `Date` nesnesinin gününü `WeekDay` Türkçe etiketine çevirir.
 *
 * JavaScript `Date.prototype.getDay()` (0=Pazar, 1=Pazartesi, ..., 6=Cumartesi)
 * yapısını doğru şekilde 7 güne eşler.
 */
export function getTodayWeekDay(date: Date = new Date()): WeekDay {
  const dayIndex = date.getDay();
  switch (dayIndex) {
    case 1:
      return "Pazartesi";
    case 2:
      return "Salı";
    case 3:
      return "Çarşamba";
    case 4:
      return "Perşembe";
    case 5:
      return "Cuma";
    case 6:
      return "Cumartesi";
    case 0:
      return "Pazar";
    default:
      return "Pazartesi";
  }
}

/**
 * Date nesnesini ISO 8601 gün numarasına (1=Pazartesi ... 7=Pazar) çevirir.
 * JavaScript'in Pazar=0 değerini ISO'nun Pazar=7 değerine dönüştürür.
 */
export function dateToIsoWeekDay(date: Date = new Date()): IsoWeekDay {
  const dayIndex = date.getDay();
  return dayIndex === 0 ? 7 : (dayIndex as IsoWeekDay);
}

/**
 * Ders programı sayfası ilk açıldığında seçili gelecek günü belirler.
 * Yedi günlük dünyada haftanın her günü ders veya etüt olabileceğinden,
 * varsayılan gün bugünün kendisidir.
 */
export function getDefaultScheduleDay(date: Date = new Date()): WeekDay {
  return getTodayWeekDay(date);
}
