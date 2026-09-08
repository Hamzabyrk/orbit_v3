import { supabase } from "@/lib/supabaseClient";
import type { ClassGroup } from "@/components/education/types";

/**
 * Sınıf listesi servis katmanı (v1.3-01 · A parçası).
 *
 * `classes` tablosunu gerçek Supabase sorgusuna bağlar.
 *
 * **Kapsam sorgulanmıyor (K-06):** `organization_id` filtresi sorguya yazılmaz.
 * Kapsam RLS ile çözülür (`classes_select_admin`, `classes_select_teacher`,
 * `classes_select_student`, `classes_select_guardian`).
 *
 * **Arşiv filtresi zorunludur:** `archived_at is null` filtresi uygulanır.
 *
 * **Mentor isim çözümü:** `class_staff_names` veritabanı fonksiyonu üzerinden yapılır (#231).
 * `profiles` tablosuna doğrudan sorgu atılmaz; çünkü `profiles` aynı satırda `recovery_email`,
 * `phone` ve şifre kilidi durumunu taşır ve RLS sütun gizleyemez (#228).
 *
 * Fonksiyon çağrıyı yapanın görebildiği sınıfların personel adlarını döndürür.
 *
 * **Tip dürüstlüğü (K-03):** Kaynağı olmayan veya henüz hesaplanmayan alanlar
 * (`attendance`, `nextLesson`) `undefined` bırakılır, kesinlikle `0` veya uydurulmuş
 * dizeler verilmez.
 */

export const DEFAULT_CLASS_LIMIT = 100;

export type ClassListResult = {
  rows: ClassGroup[];
  truncated: boolean;
};

type RawClassRow = {
  id: string;
  name: string;
  program: string | null;
  mentor_membership_id: string | null;
  archived_at?: string | null;
  class_enrollments?: { id: string; archived_at: string | null }[] | null;
};

export async function loadMentorNames(
  classIds: string[]
): Promise<Map<string, string>> {
  const unique = classIds.filter(
    (id, index) => Boolean(id) && classIds.indexOf(id) === index
  );
  if (unique.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase.rpc("class_staff_names", {
    target_class_ids: unique,
  });

  if (error || !data) {
    return new Map();
  }

  const result = new Map<string, string>();
  for (const row of data as {
    class_id: string;
    membership_id: string;
    display_name: string;
  }[]) {
    if (row.membership_id && row.display_name) {
      result.set(row.membership_id, row.display_name);
    }
  }
  return result;
}

export function mapClassRow(
  row: RawClassRow,
  mentorNames: Map<string, string>
): ClassGroup {
  const enrollments = Array.isArray(row.class_enrollments)
    ? row.class_enrollments
    : [];
  const activeStudentCount = enrollments.filter(
    e => e && (e.archived_at === null || e.archived_at === undefined)
  ).length;

  const mentorName = row.mentor_membership_id
    ? (mentorNames.get(row.mentor_membership_id) ?? null)
    : null;

  return {
    id: row.id,
    name: row.name,
    program: row.program || null,
    mentor: mentorName,
    studentCount: activeStudentCount,
    // attendance: yoklama türetmesi (C parçası)
    // nextLesson: ders programı türetmesi (B parçası)
  };
}

export async function loadClasses(
  limit = DEFAULT_CLASS_LIMIT
): Promise<ClassListResult> {
  const { data, error } = await supabase
    .from("classes")
    .select(
      `
      id,
      name,
      program,
      mentor_membership_id,
      class_enrollments (
        id,
        archived_at
      )
    `
    )
    .is("archived_at", null)
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error("Sınıf listesi yüklenemedi.");
  }

  const rawRows = (data ?? []) as RawClassRow[];
  const classIds = rawRows.map(row => row.id).filter(Boolean);

  const mentorNames = await loadMentorNames(classIds);
  const rows = rawRows.map(row => mapClassRow(row, mentorNames));

  return {
    rows,
    truncated: rows.length === limit,
  };
}
