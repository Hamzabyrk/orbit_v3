/**
 * Yoklama durumları, etiketleri ve veritabanı enum dönüşümleri — tek kaynak (v1.3-01c, **K-06**).
 *
 * Veritabanı enum'u (`attendance_status`):
 * 'present' | 'late' | 'absent' | 'excused'
 *
 * Arayüz Türkçe durumları (`AttendanceState`):
 * 'Katıldı' | 'Geç kaldı' | 'Gelmedi' | 'İzinli'
 *
 * Migration kuralı (20260904220000_attendance.sql):
 * "Yoklama durumu. Arayüzdeki Türkçe karşılıkları (Katıldı/Geç kaldı/Gelmedi/İzinli)
 * istemcide eşlenir; veritabanı değerleri diğer enum'lar gibi İngilizce tanımlayıcıdır."
 *
 * Tanınmayan veya geçersiz değerlerde fail-closed ilkesiyle `null` dönülür (K-04).
 */

import type { AttendanceState } from "@/components/education/types";

export type AttendanceDbStatus = "present" | "late" | "absent" | "excused";

export const ATTENDANCE_DB_STATUSES: readonly AttendanceDbStatus[] = [
  "present",
  "late",
  "absent",
  "excused",
] as const;

export const ATTENDANCE_STATES: readonly AttendanceState[] = [
  "Katıldı",
  "Geç kaldı",
  "Gelmedi",
  "İzinli",
] as const;

const DB_STATUS_TO_STATE: Record<AttendanceDbStatus, AttendanceState> = {
  present: "Katıldı",
  late: "Geç kaldı",
  absent: "Gelmedi",
  excused: "İzinli",
};

const STATE_TO_DB_STATUS: Record<AttendanceState, AttendanceDbStatus> = {
  Katıldı: "present",
  "Geç kaldı": "late",
  Gelmedi: "absent",
  İzinli: "excused",
};

/**
 * Veritabanı enum değerini (`present`, `late`, `absent`, `excused`)
 * arayüz Türkçe durumuna (`Katıldı`, `Geç kaldı`, `Gelmedi`, `İzinli`) çevirir.
 *
 * Tanınmayan veya boş değerlerde kesinlikle uydurma yapılmaz; fail-closed olarak `null` döner (K-04).
 */
export function dbStatusToAttendanceState(
  status: string | null | undefined
): AttendanceState | null {
  if (!status) return null;
  if (status in DB_STATUS_TO_STATE) {
    return DB_STATUS_TO_STATE[status as AttendanceDbStatus];
  }
  return null;
}

/**
 * Arayüz Türkçe durumunu (`Katıldı`, `Geç kaldı`, `Gelmedi`, `İzinli`)
 * veritabanı enum değerine (`present`, `late`, `absent`, `excused`) çevirir.
 *
 * Tanınmayan veya geçersiz değerlerde fail-closed olarak `null` döner (K-04).
 */
export function attendanceStateToDbStatus(
  state: AttendanceState | string | null | undefined
): AttendanceDbStatus | null {
  if (!state) return null;
  if (state in STATE_TO_DB_STATUS) {
    return STATE_TO_DB_STATUS[state as AttendanceState];
  }
  return null;
}

export type AttendanceTone = "green" | "amber" | "rose" | "blue" | "slate";

/**
 * Yoklama durumu için görsel renk tonu döner.
 */
export function getAttendanceTone(
  state: AttendanceState | null | undefined
): AttendanceTone {
  switch (state) {
    case "Katıldı":
      return "green";
    case "Geç kaldı":
      return "amber";
    case "Gelmedi":
      return "rose";
    case "İzinli":
      return "blue";
    default:
      return "slate";
  }
}
