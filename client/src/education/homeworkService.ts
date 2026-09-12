import { supabase } from "@/lib/supabaseClient";
import type { Homework, HomeworkStatus } from "@/components/education/types";
import { formatTrDate, getOrbitToday } from "./trDate";

/**
 * Ödev servis katmanı (v1.4-05 · #273).
 *
 * `homework_assignments` tablosunu gerçek Supabase sorgularına bağlar.
 *
 * =========================================================================
 * Şemanın kısıtları ve kuralları
 * =========================================================================
 *
 * 1. Açık `organization_id` süzgeci şarttır (§4.12 kısıtı).
 * 2. `id` ve `assigned_by_membership_id` `authenticated` için salt okunurdur.
 *    Kayıt yüküne (`createHomework`) KESİNLİKLE konmaz. Atayan üyelik
 *    `set_homework_assigner` tetikleyicisi tarafından doldurulur.
 * 3. UPDATE yetkisi yalnız 5 sütundadır: `title`, `description`, `due_date`,
 *    `subject_id`, `archived_at`. Başka sütun SET edilemez; `.upsert()` kullanılmaz.
 * 4. Silme yoktur: arşiv deseni (`archived_at`) kullanılır.
 * 5. Durum türetimi: "Tamamlandı" yoktur. Teslim tablosu olmadığı için durum
 *    `due_date < getOrbitToday()` ile "Süresi Doldu" ya da "Aktif" olarak türetilir.
 * 6. Ders adı: Sabit tipten değil `subjects` tablosundan okunur. `subject_id` boşsa
 *    ders rozeti çizilmez; "Genel" gibi bir etiket uydurulmaz (K-22).
 * 7. Atayan adı: `class_staff_names` RPC fonksiyonu üzerinden çözülür.
 *    Çözülemezse `null` bırakılır; isim uydurulmaz (K-22).
 */

export const DEFAULT_HOMEWORK_LIMIT = 100;

export type HomeworkListResult = {
  rows: Homework[];
  truncated: boolean;
};

export type CreateHomeworkInput = {
  organizationId: string;
  classId: string;
  subjectId?: string | null;
  title: string;
  description?: string | null;
  dueDate: string;
  assignedOn?: string;
};

export type UpdateHomeworkInput = {
  title?: string;
  description?: string | null;
  dueDate?: string;
  subjectId?: string | null;
  archivedAt?: string | null;
};

export type SubjectDetail = {
  id: string;
  name: string;
};

export type RawHomeworkRow = {
  id: string;
  organization_id: string;
  class_id: string;
  subject_id?: string | null;
  title: string;
  description?: string | null;
  assigned_by_membership_id?: string | null;
  assigned_on: string;
  due_date: string;
  archived_at?: string | null;
  classes?:
    | { id?: string; name: string; archived_at?: string | null }
    | { id?: string; name: string; archived_at?: string | null }[]
    | null;
  subjects?:
    | { id?: string; name: string; archived_at?: string | null }
    | { id?: string; name: string; archived_at?: string | null }[]
    | null;
};

/**
 * Ödev işlemlerinde oluşan veritabanı hatalarını kullanıcı dostu Türkçe mesajlara dönüştürür.
 */
export function translateHomeworkError(error: unknown): string {
  if (!error) {
    return "Beklenmeyen bir hata oluştu.";
  }

  let code: string | undefined;
  let message = "";
  if (typeof error === "object" && error !== null) {
    if ("code" in error) {
      code = String((error as { code: unknown }).code);
    }
    if (
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
    ) {
      message = (error as { message: string }).message;
    }
  } else if (error instanceof Error) {
    message = error.message;
    for (const known of ["42501", "23503", "23514"]) {
      if (error.message.includes(known)) {
        code = known;
        break;
      }
    }
  }

  if (code === "42501") {
    return "Bu işlem için yetkiniz yok veya şifre değişimi bekleniyor. Ödev kaydını yalnızca kurum yöneticisi veya sınıfın öğretmeni oluşturabilir ve güncelleyebilir.";
  }
  if (code === "23503") {
    return "Seçilen sınıf veya ders bulunamadı ya da arşivlenmiş. Listeyi tazeleyip tekrar deneyin.";
  }
  if (code === "23514") {
    if (message.includes("homework_assignments_due_check")) {
      return "Son teslim tarihi ödevin verildiği tarihten önce olamaz.";
    }
    return "Ödev başlığı 1 ile 200 karakter arasında olmalıdır.";
  }

  if (message && !message.includes("PGRST") && !message.includes("PostgREST")) {
    return message;
  }

  return "Ödev işlemi sırasında bir hata oluştu.";
}

export function extractClassName(classes: unknown): string | null {
  if (!classes) return null;
  const clsObj = Array.isArray(classes) ? classes[0] : classes;
  if (!clsObj || typeof clsObj !== "object") return null;
  const cls = clsObj as { name?: string; archived_at?: string | null };
  if (cls.archived_at !== null && cls.archived_at !== undefined) {
    return null;
  }
  return cls.name?.trim() || null;
}

export function extractSubjectName(subjects: unknown): string | null {
  if (!subjects) return null;
  const subObj = Array.isArray(subjects) ? subjects[0] : subjects;
  if (!subObj || typeof subObj !== "object") return null;
  const sub = subObj as { name?: string; archived_at?: string | null };
  if (sub.archived_at !== null && sub.archived_at !== undefined) {
    return null;
  }
  return sub.name?.trim() || null;
}

export async function loadStaffNames(
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

export function mapHomeworkRow(
  row: RawHomeworkRow,
  staffNames: Map<string, string>,
  today: string = getOrbitToday()
): Homework {
  const className = extractClassName(row.classes);
  const subjectName = row.subject_id ? extractSubjectName(row.subjects) : null;
  const assignedBy = row.assigned_by_membership_id
    ? (staffNames.get(row.assigned_by_membership_id) ?? null)
    : null;

  const isOverdue = row.due_date < today;
  const status: HomeworkStatus = isOverdue ? "Süresi Doldu" : "Aktif";

  return {
    id: row.id,
    classId: row.class_id,
    classGroup: className || "",
    subjectId: row.subject_id || null,
    subject: subjectName,
    title: row.title,
    description: row.description || "",
    assignedBy,
    assignedDate: formatTrDate(row.assigned_on),
    dueDate: formatTrDate(row.due_date),
    rawDueDate: row.due_date,
    status,
  };
}

/**
 * Kurumun aktif ödevlerini listeler.
 * Açık `organization_id` süzgeci taşır (§4.12 kısıtı).
 * Açık `.limit(limit)` ile PostgREST tavanını yönetir ve `truncated` bayrağı döner.
 */
export async function loadHomework(
  organizationId: string,
  options?: { limit?: number }
): Promise<HomeworkListResult> {
  const limit = options?.limit ?? DEFAULT_HOMEWORK_LIMIT;

  const { data, error } = await supabase
    .from("homework_assignments")
    .select(
      `
      id,
      organization_id,
      class_id,
      subject_id,
      title,
      description,
      assigned_by_membership_id,
      assigned_on,
      due_date,
      archived_at,
      classes ( id, name, archived_at ),
      subjects ( id, name, archived_at )
    `
    )
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("due_date", { ascending: true })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(translateHomeworkError(error));
  }

  const rawRows = (data ?? []) as RawHomeworkRow[];
  const classIds = rawRows.map(r => r.class_id).filter(Boolean);
  const staffNames = await loadStaffNames(classIds);
  const today = getOrbitToday();

  const rows = rawRows.map(row => mapHomeworkRow(row, staffNames, today));

  return {
    rows,
    truncated: rawRows.length === limit,
  };
}

/**
 * Yeni bir ödev kaydı oluşturur.
 *
 * ⛔ 1. YASAK (ÖLÇÜLDÜ): Yüke `id` ve `assigned_by_membership_id` KOYMA!
 * `homework_assignments.id` ve `assigned_by_membership_id` authenticated için salt okunurdur.
 * Atayan üyeliği tetikleyici doldurur; kimliği veritabanı üretir.
 */
export async function createHomework(
  input: CreateHomeworkInput
): Promise<{ id: string }> {
  const payload: {
    organization_id: string;
    class_id: string;
    subject_id?: string | null;
    title: string;
    description?: string | null;
    due_date: string;
    assigned_on?: string;
  } = {
    organization_id: input.organizationId,
    class_id: input.classId,
    title: input.title.trim(),
    due_date: input.dueDate,
  };

  if (input.subjectId) {
    payload.subject_id = input.subjectId;
  }
  if (input.description !== undefined && input.description !== null) {
    payload.description = input.description.trim() || null;
  }
  if (input.assignedOn) {
    payload.assigned_on = input.assignedOn;
  }

  const { data, error } = await supabase
    .from("homework_assignments")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    throw new Error(translateHomeworkError(error));
  }

  return { id: data.id };
}

/**
 * Mevcut bir ödevi günceller.
 * Açık `organization_id` ve `id` süzgeci taşır (§4.12 kısıtı).
 *
 * ⛔ 2. YASAK (ÖLÇÜLDÜ): Yalnız izin verilen beş sütun SET edilebilir!
 * `title`, `description`, `due_date`, `subject_id`, `archived_at`.
 */
export async function updateHomework(
  organizationId: string,
  homeworkId: string,
  updates: UpdateHomeworkInput
): Promise<void> {
  const payload: {
    title?: string;
    description?: string | null;
    due_date?: string;
    subject_id?: string | null;
    archived_at?: string | null;
  } = {};

  if (updates.title !== undefined) payload.title = updates.title.trim();
  if (updates.description !== undefined) {
    payload.description = updates.description?.trim() || null;
  }
  if (updates.dueDate !== undefined) payload.due_date = updates.dueDate;
  if (updates.subjectId !== undefined) payload.subject_id = updates.subjectId;
  if (updates.archivedAt !== undefined)
    payload.archived_at = updates.archivedAt;

  const { data, error } = await supabase
    .from("homework_assignments")
    .update(payload)
    .eq("organization_id", organizationId)
    .eq("id", homeworkId)
    .select("id");

  if (error) {
    throw new Error(translateHomeworkError(error));
  }

  if (!data || data.length === 0) {
    throw new Error("Ödev bulunamadı veya güncellenemedi.");
  }
}

/**
 * Bir ödevi arşivler (archived_at ile).
 * Açık `organization_id` ve `id` süzgeci taşır (§4.12 kısıtı).
 */
export async function archiveHomework(
  organizationId: string,
  homeworkId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("homework_assignments")
    .update({ archived_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("id", homeworkId)
    .select("id");

  if (error) {
    throw new Error(translateHomeworkError(error));
  }

  if (!data || data.length === 0) {
    throw new Error("Ödev bulunamadı veya arşivlenemedi.");
  }
}

/**
 * Arşivlenmiş bir ödevi geri yükler.
 * Açık `organization_id` ve `id` süzgeci taşır (§4.12 kısıtı).
 */
export async function restoreHomework(
  organizationId: string,
  homeworkId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("homework_assignments")
    .update({ archived_at: null })
    .eq("organization_id", organizationId)
    .eq("id", homeworkId)
    .select("id");

  if (error) {
    throw new Error(translateHomeworkError(error));
  }

  if (!data || data.length === 0) {
    throw new Error("Ödev bulunamadı veya geri yüklenemedi.");
  }
}

/**
 * Kurumun aktif derslerini çeker.
 * Yeni ödev oluşturma diyaloğunda ders seçimi için kullanılır.
 */
export async function loadSubjects(
  organizationId: string
): Promise<SubjectDetail[]> {
  if (!organizationId) {
    return [];
  }

  const { data, error } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("name", { ascending: true });

  if (error) {
    return [];
  }

  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name.trim(),
  }));
}
