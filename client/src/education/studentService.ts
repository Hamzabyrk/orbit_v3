import { supabase } from "@/lib/supabaseClient";
import type { Student } from "@/components/education/types";
import { loadStudentAttendancePercentages } from "./attendanceService";
import { loadStudentLatestExamScores } from "./examService";
import { loadStudentPaymentStatuses } from "./paymentService";

/**
 * Öğrenci listesi servis katmanı (v1.3-01 · A, C, D ve E parçaları).
 *
 * `students` tablosunu gerçek Supabase sorgusuna bağlar.
 *
 * **Kapsam sorgulanmıyor (K-06):** `organization_id` filtresi sorguya yazılmaz.
 * Kapsam veritabanı düzeyinde RLS ile çözülür (`students_select_admin`, `students_select_teacher`,
 * `students_select_guardian`, `students_select_self`). İstemcide ikinci kez filtrelemek,
 * tek doğruluk kaynağı ilkesini çiğner.
 *
 * **Arşiv filtresi zorunludur:** `archived_at is null` filtresi uygulanır. Bu sistemde
 * silme yerine arşivleme kullanılır; arşivlenmiş satırı getirmek silinen kaydı canlandırmaktır.
 *
 * **Devam yüzdesi türetimi (v1.3-01c · 2.D & K-06):**
 * `Student.attendance` alanı `attendanceService`'ten çağrılan toplu yardımcı
 * (`loadStudentAttendancePercentages`) ile doldurulur. Öğrenci başına tekil sorgu atılmaz (N+1 engellenir).
 * Payda sıfır ise veya hiç kayıt yoksa değer `undefined` bırakılır (K-22).
 *
 * **Sınav puanı türetimi (v1.3-01d · 2.D & K-06):**
 * `Student.score` alanı `examService`'ten çağrılan toplu yardımcı
 * (`loadStudentLatestExamScores`) ile doldurulur. Öğrenci başına tekil sorgu atılmaz (N+1 engellenir).
 * Sınavı olmayan öğrencinin puanı `undefined` bırakılır, kesinlikle `0` verilmez (K-22).
 *
 * **Ödeme durumu türetimi (v1.3-01e · 3.B/3.C & K-06):**
 * `Student.payment` alanı `paymentService`'ten çağrılan toplu yardımcı
 * (`loadStudentPaymentStatuses`) ile doldurulur. Öğrenci başına tekil sorgu atılmaz (N+1 engellenir).
 * Ödeme planı olmayan veya görmeye yetkisi olmayan öğrencinin durumu `undefined` bırakılır,
 * kesinlikle "Güncel" verilmez (K-22).
 *
 * **Tip dürüstlüğü (K-03):** Kaynağı olmayan veya henüz hesaplanmayan alanlar
 * (`code`, `homework`, `risk`) `undefined` bırakılır,
 * kesinlikle `0` veya uydurulmuş dizelerle doldurulmaz.
 */

export const DEFAULT_STUDENT_LIMIT = 100;

export type StudentListResult = {
  rows: Student[];
  truncated: boolean;
};

type RawStudentRow = {
  id: string;
  full_name: string;
  branch_id?: string | null;
  archived_at?: string | null;
  branches?: { name: string } | { name: string }[] | null;
  class_enrollments?:
    | {
        archived_at: string | null;
        classes?:
          | { name: string; archived_at?: string | null }
          | { name: string; archived_at?: string | null }[]
          | null;
      }[]
    | null;
  student_guardians?:
    | {
        archived_at: string | null;
        guardians?:
          | { full_name: string; archived_at?: string | null }
          | { full_name: string; archived_at?: string | null }[]
          | null;
      }[]
    | null;
};

export function extractBranchName(branches: unknown): string | null {
  if (!branches) return null;
  if (Array.isArray(branches)) {
    return branches[0]?.name || null;
  }
  if (typeof branches === "object" && "name" in branches) {
    return (branches as { name: string }).name || null;
  }
  return null;
}

export function extractClassName(enrollments: unknown): string | null {
  if (!Array.isArray(enrollments)) return null;
  const active = enrollments.find(e => {
    if (!e || typeof e !== "object") return false;
    if (e.archived_at !== null && e.archived_at !== undefined) return false;
    const cls = e.classes;
    if (!cls || typeof cls !== "object") return false;
    const clsObj = Array.isArray(cls) ? cls[0] : cls;
    return (
      !clsObj || clsObj.archived_at === null || clsObj.archived_at === undefined
    );
  });

  if (!active) return null;
  const cls = active.classes;
  if (Array.isArray(cls)) {
    return cls[0]?.name || null;
  }
  return cls?.name || null;
}

export function extractGuardianName(links: unknown): string | null {
  if (!Array.isArray(links)) return null;
  const activeGuardians = links
    .filter(link => {
      if (!link || typeof link !== "object") return false;
      if (link.archived_at !== null && link.archived_at !== undefined)
        return false;
      const g = link.guardians;
      if (!g || typeof g !== "object") return false;
      const gObj = Array.isArray(g) ? g[0] : g;
      return (
        !gObj || gObj.archived_at === null || gObj.archived_at === undefined
      );
    })
    .map(link => {
      const g = link.guardians;
      if (Array.isArray(g)) {
        return g[0]?.full_name;
      }
      return g?.full_name;
    })
    .filter(
      (name): name is string =>
        typeof name === "string" && name.trim().length > 0
    );

  return activeGuardians.length > 0 ? activeGuardians.join(", ") : null;
}

export function mapStudentRow(
  row: RawStudentRow,
  attendancePercentage?: number,
  latestExamScore?: number,
  paymentStatus?: "Güncel" | "Takip gerekli"
): Student {
  return {
    id: row.id,
    name: row.full_name,
    group: extractClassName(row.class_enrollments),
    branch: extractBranchName(row.branches),
    parent: extractGuardianName(row.student_guardians),
    attendance: attendancePercentage,
    score: latestExamScore,
    payment: paymentStatus,
    // Kaynağı olmayan ve henüz türetilmeyen alanlar dürüstçe undefined bırakılır:
    // code: v1.4-01'de gelecek (K-12 gereği asgari veri politikası)
    // homework: teslim tablosu yok; türetilemez (#237, ROADMAP §4.7)
    // risk: hesaplama kuralı henüz tanımlanmadı
  };
}

export async function loadStudents(
  limit = DEFAULT_STUDENT_LIMIT
): Promise<StudentListResult> {
  const { data, error } = await supabase
    .from("students")
    .select(
      `
      id,
      full_name,
      branch_id,
      branches ( name ),
      class_enrollments (
        archived_at,
        classes ( name, archived_at )
      ),
      student_guardians (
        archived_at,
        guardians ( full_name, archived_at )
      )
    `
    )
    .is("archived_at", null)
    .order("full_name", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error("Öğrenci listesi yüklenemedi.");
  }

  const rawRows = (data ?? []) as RawStudentRow[];
  const studentIds = rawRows.map(r => r.id);
  const [attendancePercentages, latestScores, paymentStatuses] =
    await Promise.all([
      loadStudentAttendancePercentages(studentIds),
      loadStudentLatestExamScores(studentIds),
      loadStudentPaymentStatuses(studentIds),
    ]);

  const rows = rawRows.map(r =>
    mapStudentRow(
      r,
      attendancePercentages.get(r.id),
      latestScores.get(r.id),
      paymentStatuses.get(r.id)
    )
  );

  return {
    rows,
    truncated: rows.length === limit,
  };
}
