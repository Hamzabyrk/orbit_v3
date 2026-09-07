/**
 * Ders programı gün yardımcıları (v1.3-00).
 *
 * Beş günlük eski mantık `@/education/weekDays` alan modülüne taşınmıştır (K-06).
 * Bu modül geriye dönük uyumluluk amacıyla yeni modülü yeniden ihraç eden
 * bir yönlendirme köprüsüdür.
 */
export {
  WEEK_DAYS,
  getTodayWeekDay,
  getDefaultScheduleDay,
} from "@/education/weekDays";
