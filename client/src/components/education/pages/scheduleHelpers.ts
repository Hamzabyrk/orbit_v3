import type { WeekDay } from "../types";

export const WEEK_DAYS: WeekDay[] = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
];

/**
 * Verilen tarihin haftanın iş günlerinden hangisine denk geldiğini döner.
 * Pazartesi (1) ... Cuma (5). Hafta sonu (Cumartesi 6, Pazar 0) ise null döner.
 */
export function getTodayWeekDay(date: Date = new Date()): WeekDay | null {
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
    default:
      return null;
  }
}

/**
 * Ders programı sayfası ilk açıldığında seçili gelecek günü belirler.
 * Hafta içi ise bugünün iş günü; hafta sonu (Cumartesi/Pazar) ise haftanın ilk
 * iş günü olan "Pazartesi" seçili gelir (önümüzdeki ders haftasının başlangıcı).
 */
export function getDefaultScheduleDay(date: Date = new Date()): WeekDay {
  const today = getTodayWeekDay(date);
  return today ?? "Pazartesi";
}
