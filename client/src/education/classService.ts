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
 * **Mentor isim çözümü:** `classes.mentor_membership_id` `organization_memberships`
 * tablosuna gider; üyelik ise `auth.users` üzerinden `public.profiles` tablosuna
 * bağlanır. PostgREST doğrudan gömülü join yapamaz; bu nedenle mentor adları
 * `auditService.ts` ve `platformService.ts`'te olduğu gibi ayrı bir sorguyla çözümlenir.
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
  membershipIds: string[]
): Promise<Map<string, string>> {
  const unique = membershipIds.filter(
    (id, index) => Boolean(id) && membershipIds.indexOf(id) === index
  );
  if (unique.length === 0) {
    return new Map();
  }

  const { data: memberships, error: memError } = await supabase
    .from("organization_memberships")
    .select("id, user_id")
    .in("id", unique);

  if (memError || !memberships) {
    return new Map();
  }

  const userIds = memberships
    .map(m => m.user_id)
    .filter((id): id is string => Boolean(id));

  const uniqueUserIds = userIds.filter(
    (id, index) => userIds.indexOf(id) === index
  );

  if (uniqueUserIds.length === 0) {
    return new Map();
  }

  const { data: profiles, error: profError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", uniqueUserIds);

  if (profError || !profiles) {
    return new Map();
  }

  const profileMap = new Map(profiles.map(p => [p.id, p.display_name]));
  const result = new Map<string, string>();
  for (const mem of memberships) {
    if (mem.user_id && profileMap.has(mem.user_id)) {
      result.set(mem.id, profileMap.get(mem.user_id)!);
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
  const mentorMembershipIds = rawRows
    .map(row => row.mentor_membership_id)
    .filter((id): id is string => Boolean(id));

  const mentorNames = await loadMentorNames(mentorMembershipIds);
  const rows = rawRows.map(row => mapClassRow(row, mentorNames));

  return {
    rows,
    truncated: rows.length === limit,
  };
}
