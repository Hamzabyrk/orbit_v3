import { supabase } from "@/lib/supabaseClient";
import type { AttendanceState } from "@/components/education/types";
import { dbStatusToAttendanceState } from "./attendanceStatus";

/**
 * Yoklama servis katmanı (v1.3-01 · C parçası).
 *
 * `attendance_sessions` ve `attendance_records` tablolarını gerçek Supabase sorgusuna bağlar.
 *
 * **Kapsam sorgulanmıyor (K-06):** `organization_id` filtresi sorguya yazılmaz.
 * Kapsam veritabanı düzeyinde RLS ile çözülür (`attendance_sessions_select_admin`,
 * `attendance_sessions_select_teacher`, `attendance_sessions_select_student`,
 * `attendance_sessions_select_guardian`).
 *
 * **⚠️ Arşiv filtresi tuzağı (K-06):**
 * `attendance_records` tablosunda `archived_at` sütunu YOK; `attendance_sessions` tablosunda VAR.
 * Bu nedenle doğrudan `attendance_records` üzerinde `archived_at is null` filtresi uygulanamaz;
 * sorgu `attendance_sessions!inner` üzerinden arşiv durumunu denetler.
 *
 * **Sıralama açık yazılır:** En son oturum için önce oturum tarihi (`session_date` azalan),
 * sonra başlangıç saati (`starts_at` azalan) sıralanır.
 *
 * **Devam yüzdesi formülü (DECISION_LOG 2026-09-08):**
 * Devam % = (Katıldı + Geç kaldı) / (Katıldı + Geç kaldı + Gelmedi) * 100
 * İzinli (excused) ne paya ne paydaya katılır. Payda sıfır ise yüzde hesaplanmaz,
 * kesinlikle `0` değil `undefined` döner (K-22).
 */

export const DEFAULT_ATTENDANCE_SESSION_LIMIT = 50;

export type AttendanceRecordDetail = {
  id: string;
  studentId: string;
  studentName: string;
  status: AttendanceState | null;
};

export type AttendanceSessionDetail = {
  id: string;
  classId: string;
  className: string | null;
  subjectId: string | null;
  subjectName: string | null;
  sessionDate: string;
  startsAt: string | null;
  records: AttendanceRecordDetail[];
};

export type LatestAttendanceSessionResult = {
  session: AttendanceSessionDetail | null;
};

export type AttendanceSessionListResult = {
  rows: AttendanceSessionDetail[];
  truncated: boolean;
};

/**
 * Devam yüzdesi formülü (DECISION_LOG 2026-09-08):
 *
 * Devam % = (Katıldı + Geç kaldı) / (Katıldı + Geç kaldı + Gelmedi) * 100
 *
 * - Geç kalma devam sayılır (öğrenci derstedir).
 * - İzinli dersler (excused) ne paya ne paydaya katılır (kurum onaylı muafiyet).
 * - Payda (Katıldı + Geç kaldı + Gelmedi) sıfır ise yüzde HESAPLANMAZ;
 *   kesinlikle `0` değil `undefined` döner (K-22: yokluk etiketi de bir iddiadır).
 */
export function calculateAttendancePercentage(counts: {
  present: number;
  late: number;
  absent: number;
}): number | undefined {
  const numerator = counts.present + counts.late;
  const denominator = counts.present + counts.late + counts.absent;
  if (denominator === 0) {
    return undefined;
  }
  return Math.round((numerator / denominator) * 100);
}

const TR_MONTHS = [
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
];

/**
 * Oturum tarih ve saatini Türkçe arayüz formatına çevirir (ör. "8 Eylül 2026, 09:00" veya "8 Eylül 2026").
 */
export function formatSessionDateTime(
  sessionDate: string,
  startsAt?: string | null
): string {
  if (!sessionDate) return "";
  const parts = sessionDate.split("-");
  if (parts.length !== 3) return sessionDate;

  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const monthName = TR_MONTHS[monthIdx] || parts[1];
  const dateStr = `${day} ${monthName} ${year}`;

  if (startsAt) {
    const timeStr = startsAt.slice(0, 5);
    return `${dateStr}, ${timeStr}`;
  }
  return dateStr;
}

/**
 * Oturum başlık metnini oluşturur (v1.3-01c · 2.C).
 *
 * Örnek: "TYT Matematik · YKS 12-A · 8 Eylül 2026, 09:00"
 * Günlük yoklamada (subject_id boş): "Günlük Yoklama · YKS 12-A · 8 Eylül 2026"
 */
export function formatSessionTitle(session: AttendanceSessionDetail): string {
  const titleParts: string[] = [];
  if (session.subjectName) {
    titleParts.push(session.subjectName);
  } else {
    titleParts.push("Günlük Yoklama");
  }

  if (session.className) {
    titleParts.push(session.className);
  }

  const dt = formatSessionDateTime(session.sessionDate, session.startsAt);
  if (dt) {
    titleParts.push(dt);
  }

  return titleParts.join(" · ");
}

export function extractActiveName(relation: unknown): string | null {
  if (!relation) return null;
  const obj = Array.isArray(relation) ? relation[0] : relation;
  if (!obj || typeof obj !== "object") return null;
  const item = obj as { name?: string; archived_at?: string | null };
  if (item.archived_at !== null && item.archived_at !== undefined) {
    return null;
  }
  return item.name?.trim() || null;
}

type RawAttendanceRecord = {
  id: string;
  student_id: string;
  status: string;
  students?:
    | { id?: string; full_name?: string; archived_at?: string | null }
    | { id?: string; full_name?: string; archived_at?: string | null }[]
    | null;
};

type RawAttendanceSessionRow = {
  id: string;
  class_id: string;
  subject_id?: string | null;
  session_date: string;
  starts_at?: string | null;
  archived_at?: string | null;
  classes?:
    | { id?: string; name: string; archived_at?: string | null }
    | { id?: string; name: string; archived_at?: string | null }[]
    | null;
  subjects?:
    | { id?: string; name: string; archived_at?: string | null }
    | { id?: string; name: string; archived_at?: string | null }[]
    | null;
  attendance_records?: RawAttendanceRecord[] | null;
};

export function mapSessionRow(
  row: RawAttendanceSessionRow
): AttendanceSessionDetail {
  const className = extractActiveName(row.classes);
  const subjectName = extractActiveName(row.subjects);

  const rawRecords = Array.isArray(row.attendance_records)
    ? row.attendance_records
    : [];
  const records: AttendanceRecordDetail[] = rawRecords.map(r => {
    const studentObj = Array.isArray(r.students) ? r.students[0] : r.students;
    const studentName = studentObj?.full_name?.trim() || "";
    return {
      id: r.id,
      studentId: r.student_id,
      studentName,
      status: dbStatusToAttendanceState(r.status),
    };
  });

  // Kayıtları öğrenci adına göre alfabetik sırala
  records.sort((a, b) => a.studentName.localeCompare(b.studentName, "tr"));

  return {
    id: row.id,
    classId: row.class_id,
    className,
    subjectId: row.subject_id || null,
    subjectName,
    sessionDate: row.session_date,
    startsAt: row.starts_at ? row.starts_at.slice(0, 5) : null,
    records,
  };
}

/**
 * Öğrencilerin devam yüzdelerini toplu olarak hesaplar (v1.3-01c · Revizyon 1).
 *
 * İstemciye binlerce ham yoklama satırını taşımak ve istemcide saymak yerine,
 * sayım işi doğrudan veritabanındaki `student_attendance_counts` RPC fonksiyonuna
 * bırakılır. Böylece sessiz satır sınırı ve bellek/ağ yükü ortadan kalkar.
 *
 * Fonksiyon öğrenci başına (present_count, late_count, absent_count) döner.
 * `excused` ve arşivlenmiş oturumların kayıtları veritabanında filtrelenmiştir.
 *
 * Yüzde hesabı istemcide `calculateAttendancePercentage` ile yapılır;
 * payda sıfır ise (veya hiç kayıt yoksa) değer kesinlikle `0` değil `undefined` kalır (K-22).
 *
 * `studentService` içinden tek seferde çağrılır. N+1 sorgusu yapılmaz (K-06).
 */
export async function loadStudentAttendancePercentages(
  studentIds: string[]
): Promise<Map<string, number>> {
  const uniqueIds = Array.from(
    new Set(studentIds.filter(id => Boolean(id) && typeof id === "string"))
  );
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase.rpc("student_attendance_counts", {
    target_student_ids: uniqueIds,
  });

  if (error || !data) {
    // Fail-closed (K-04): Veritabanı hatasında uydurma yüzde üretilmez
    return new Map();
  }

  const resultMap = new Map<string, number>();

  for (const row of data as {
    student_id: string;
    present_count: number | string | bigint;
    late_count: number | string | bigint;
    absent_count: number | string | bigint;
  }[]) {
    const studentId = row.student_id;
    if (!studentId) continue;

    const present = Number(row.present_count) || 0;
    const late = Number(row.late_count) || 0;
    const absent = Number(row.absent_count) || 0;

    const percentage = calculateAttendancePercentage({
      present,
      late,
      absent,
    });
    if (percentage !== undefined) {
      resultMap.set(studentId, percentage);
    }
  }

  return resultMap;
}

/**
 * Aktif kurumun en son yoklama oturumunu ve kayıtlarını çeker (v1.3-01c · 2.C).
 *
 * Oturum yoksa `{ session: null }` döner.
 */
export async function loadLatestAttendanceSession(): Promise<LatestAttendanceSessionResult> {
  const { data, error } = await supabase
    .from("attendance_sessions")
    .select(
      `
      id,
      class_id,
      subject_id,
      session_date,
      starts_at,
      archived_at,
      classes ( id, name, archived_at ),
      subjects ( id, name, archived_at ),
      attendance_records (
        id,
        student_id,
        status,
        students ( id, full_name, archived_at )
      )
    `
    )
    .is("archived_at", null)
    .order("session_date", { ascending: false })
    .order("starts_at", { ascending: false, nullsFirst: false })
    .limit(1);

  if (error) {
    throw new Error("Yoklama oturumu yüklenemedi.");
  }

  const rawRows = (data ?? []) as RawAttendanceSessionRow[];
  if (rawRows.length === 0) {
    return { session: null };
  }

  return {
    session: mapSessionRow(rawRows[0]),
  };
}

/**
 * Aktif kurumun yoklama oturumlarını listeler.
 */
export async function loadAttendanceSessions(
  limit = DEFAULT_ATTENDANCE_SESSION_LIMIT
): Promise<AttendanceSessionListResult> {
  const { data, error } = await supabase
    .from("attendance_sessions")
    .select(
      `
      id,
      class_id,
      subject_id,
      session_date,
      starts_at,
      archived_at,
      classes ( id, name, archived_at ),
      subjects ( id, name, archived_at ),
      attendance_records (
        id,
        student_id,
        status,
        students ( id, full_name, archived_at )
      )
    `
    )
    .is("archived_at", null)
    .order("session_date", { ascending: false })
    .order("starts_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    throw new Error("Yoklama oturumları yüklenemedi.");
  }

  const rawRows = (data ?? []) as RawAttendanceSessionRow[];
  const rows = rawRows.map(mapSessionRow);

  return {
    rows,
    truncated: rawRows.length === limit,
  };
}
