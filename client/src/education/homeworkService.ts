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

export type HomeworkSubmissionItem = {
  id: string;
  organizationId: string;
  homeworkId: string;
  studentId: string;
  recordedByMembershipId: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HomeworkSubmissionListResult = {
  rows: HomeworkSubmissionItem[];
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
  submissions_recorded_at?: string | null;
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

/**
 * Ödev teslim işlemlerinde oluşan veritabanı hatalarını kullanıcı dostu Türkçe mesajlara dönüştürür.
 * Ham hata kodları veya PostgREST detayları arayüze sızdırılmaz (K-19).
 */
export function translateHomeworkSubmissionError(error: unknown): string {
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
    for (const known of ["42501", "23505", "ORB02"]) {
      if (error.message.includes(known)) {
        code = known;
        break;
      }
    }
  }

  if (code === "ORB02" || message.includes("ORB02")) {
    return "Öğrenci bu ödevin sınıfına kayıtlı değil.";
  }
  if (code === "23505" || message.includes("23505")) {
    return "Bu öğrencinin ödev teslimi zaten işaretlenmiş.";
  }
  if (code === "42501" || message.includes("42501")) {
    return "Bu işlem için yetkiniz yok veya şifre değişimi bekleniyor. Ödev teslimini yalnızca kurum yöneticisi veya sınıfın öğretmeni işaretleyebilir.";
  }

  if (message && !message.includes("PGRST") && !message.includes("PostgREST")) {
    return message;
  }

  return "Ödev teslim işlemi sırasında bir hata oluştu.";
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

async function loadClassStudentCounts(
  organizationId: string,
  classIds: string[]
): Promise<Map<string, number>> {
  const unique = Array.from(new Set(classIds.filter(Boolean)));
  if (unique.length === 0 || !organizationId) return new Map();

  try {
    const query = supabase.from("class_enrollments");
    if (!query || typeof query.select !== "function") return new Map();

    const { data, error } = await query
      .select("class_id, student_id")
      .eq("organization_id", organizationId)
      .in("class_id", unique)
      .is("archived_at", null);

    if (error || !data) return new Map();

    const countMap = new Map<string, number>();
    for (const row of data as { class_id: string; student_id: string }[]) {
      if (!row.class_id) continue;
      countMap.set(row.class_id, (countMap.get(row.class_id) ?? 0) + 1);
    }
    return countMap;
  } catch {
    return new Map();
  }
}

async function loadHomeworkSubmissionCounts(
  organizationId: string,
  homeworkIds: string[]
): Promise<Map<string, number>> {
  const unique = Array.from(new Set(homeworkIds.filter(Boolean)));
  if (unique.length === 0 || !organizationId) return new Map();

  try {
    const query = supabase.from("homework_submissions");
    if (!query || typeof query.select !== "function") return new Map();

    const { data, error } = await query
      .select("homework_id, student_id")
      .eq("organization_id", organizationId)
      .in("homework_id", unique)
      .is("archived_at", null);

    if (error || !data) return new Map();

    const countMap = new Map<string, number>();
    for (const row of data as { homework_id: string; student_id: string }[]) {
      if (!row.homework_id) continue;
      countMap.set(row.homework_id, (countMap.get(row.homework_id) ?? 0) + 1);
    }
    return countMap;
  } catch {
    return new Map();
  }
}

export function mapHomeworkRow(
  row: RawHomeworkRow,
  staffNames: Map<string, string>,
  today: string = getOrbitToday(),
  submissionCount?: number,
  totalStudents?: number
): Homework {
  const className = extractClassName(row.classes);
  const subjectName = row.subject_id ? extractSubjectName(row.subjects) : null;
  const assignedBy = row.assigned_by_membership_id
    ? (staffNames.get(row.assigned_by_membership_id) ?? null)
    : null;

  const isOverdue = row.due_date < today;
  let status: HomeworkStatus;
  if (
    totalStudents !== undefined &&
    totalStudents > 0 &&
    submissionCount !== undefined &&
    submissionCount >= totalStudents
  ) {
    status = "Tamamlandı";
  } else {
    status = isOverdue ? "Süresi Doldu" : "Aktif";
  }

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
    submissionCount:
      submissionCount !== undefined && submissionCount > 0
        ? submissionCount
        : undefined,
    totalStudents:
      totalStudents !== undefined && totalStudents > 0
        ? totalStudents
        : undefined,
    submissionsRecordedAt: row.submissions_recorded_at ?? null,
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
      submissions_recorded_at,
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
  const homeworkIds = rawRows.map(r => r.id);
  const today = getOrbitToday();

  const [staffNames, classStudentCounts, homeworkSubmissionCounts] =
    await Promise.all([
      loadStaffNames(classIds),
      loadClassStudentCounts(organizationId, classIds),
      loadHomeworkSubmissionCounts(organizationId, homeworkIds),
    ]);

  const rows = rawRows.map(row =>
    mapHomeworkRow(
      row,
      staffNames,
      today,
      homeworkSubmissionCounts.get(row.id),
      classStudentCounts.get(row.class_id)
    )
  );

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
 * Bir ödeve ait aktif teslimleri listeler.
 * Açık `organization_id` ve `homework_id` süzgeci taşır (§4.12 kısıtı).
 * Açık `.limit(limit)` ile PostgREST tavanını yönetir ve `truncated` bayrağı döner.
 */
export async function loadHomeworkSubmissions(
  organizationId: string,
  homeworkId: string,
  options?: { limit?: number }
): Promise<HomeworkSubmissionListResult> {
  const limit = options?.limit ?? DEFAULT_HOMEWORK_LIMIT;

  const { data, error } = await supabase
    .from("homework_submissions")
    .select(
      `
      id,
      organization_id,
      homework_id,
      student_id,
      recorded_by_membership_id,
      archived_at,
      created_at,
      updated_at
    `
    )
    .eq("organization_id", organizationId)
    .eq("homework_id", homeworkId)
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(translateHomeworkSubmissionError(error));
  }

  const rawRows = (data ?? []) as {
    id: string;
    organization_id: string;
    homework_id: string;
    student_id: string;
    recorded_by_membership_id: string;
    archived_at: string | null;
    created_at: string;
    updated_at: string;
  }[];

  const rows: HomeworkSubmissionItem[] = rawRows.map(r => ({
    id: r.id,
    organizationId: r.organization_id,
    homeworkId: r.homework_id,
    studentId: r.student_id,
    recordedByMembershipId: r.recorded_by_membership_id,
    archivedAt: r.archived_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  return {
    rows,
    truncated: rawRows.length === limit,
  };
}

/**
 * Bir öğrencinin ödev teslimini işaretler (yeni satır ekler).
 *
 * ⛔ 1. YASAK (ÖLÇÜLDÜ): Yüke `id` ve `recorded_by_membership_id` KOYMA!
 * `id` veritabanı tarafından üretilir. `recorded_by_membership_id` tetikleyici
 * (`set_homework_submission_recorder`) tarafından doldurulur ve authenticated yetkisinde yoktur.
 */
export async function markSubmission(
  organizationId: string,
  homeworkId: string,
  studentId: string
): Promise<{ id: string }> {
  const payload = {
    organization_id: organizationId,
    homework_id: homeworkId,
    student_id: studentId,
  };

  const { data, error } = await supabase
    .from("homework_submissions")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    throw new Error(translateHomeworkSubmissionError(error));
  }

  return { id: data.id };
}

/**
 * Bir ödev tesliminin işaretini kaldırır (satırı arşivler).
 * Açık `organization_id` ve `id` süzgeci taşır (§4.12 kısıtı).
 * UPDATE yetkisi yalnız `archived_at` sütunundadır.
 *
 * K-14: Sıfır satır etkilendiğinde hata fırlatılır.
 */
export async function unmarkSubmission(
  organizationId: string,
  submissionId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("homework_submissions")
    .update({ archived_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("id", submissionId)
    .select("id");

  if (error) {
    throw new Error(translateHomeworkSubmissionError(error));
  }

  if (!data || data.length === 0) {
    throw new Error("Ödev teslimi bulunamadı veya işareti kaldırılamadı.");
  }
}

/**
 * Bir ödevin teslim işaretleme sürecinin tamamlandığını veya yeniden açıldığını kaydeder (v1.4-15 R1).
 * Öğretmen "işaretlemeyi bitirdim" dediğinde `submissions_recorded_at` zaman damgasıyla dolar;
 * geri alındığında `null` yapılır.
 *
 * K-14: Sıfır satır etkilendiğinde hata fırlatılır.
 */
export async function setSubmissionsRecorded(
  organizationId: string,
  homeworkId: string,
  recorded: boolean
): Promise<{ submissionsRecordedAt: string | null }> {
  const timestamp = recorded ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from("homework_assignments")
    .update({ submissions_recorded_at: timestamp })
    .eq("organization_id", organizationId)
    .eq("id", homeworkId)
    .select("id, submissions_recorded_at");

  if (error) {
    throw new Error(translateHomeworkError(error));
  }

  if (!data || data.length === 0) {
    throw new Error(
      "Ödev kaydı bulunamadı veya güncelleme gerçekleştirilemedi."
    );
  }

  return { submissionsRecordedAt: timestamp };
}

/**
 * Verilen öğrencilerin ödev teslim oranlarını toplu (batch) olarak hesaplar (v1.4-15 · #294 / R1).
 * `studentService` içinden tek seferde çağrılır. N+1 sorgusu yapılmaz (K-06).
 *
 * 🔴 R1 Kararı: Bir ödevin oran hesaplamasına dahil edilmesi (takip ediliyor sayılması),
 * ancak öğretmenin teslim işaretlemesini bitirdiğini beyan etmesiyle
 * (`submissions_recorded_at is not null`) mümkündür.
 *
 * Yarım işaretlenmiş (öğretmenin henüz tamamlamadığı) ödevler orana HİÇ GİRMEZ (ne payda ne pay).
 * İşaretlemesi bitirilmiş hiçbir ödev yoksa öğrenci için oran üretilmez (`undefined`).
 */
export async function loadStudentHomeworkRatios(
  organizationId: string,
  studentIds: string[]
): Promise<Map<string, string>> {
  const uniqueStudentIds = Array.from(
    new Set(studentIds.filter(id => Boolean(id) && typeof id === "string"))
  );
  if (uniqueStudentIds.length === 0 || !organizationId) {
    return new Map();
  }

  // 1. Öğrencilerin aktif sınıf kayıtlarını çek
  const { data: enrollData, error: enrollError } = await supabase
    .from("class_enrollments")
    .select("student_id, class_id")
    .eq("organization_id", organizationId)
    .in("student_id", uniqueStudentIds)
    .is("archived_at", null);

  if (enrollError || !enrollData) {
    return new Map();
  }

  const studentClassesMap = new Map<string, Set<string>>();
  const classIdsSet = new Set<string>();

  for (const row of enrollData as { student_id: string; class_id: string }[]) {
    if (!row.student_id || !row.class_id) continue;
    let classes = studentClassesMap.get(row.student_id);
    if (!classes) {
      classes = new Set();
      studentClassesMap.set(row.student_id, classes);
    }
    classes.add(row.class_id);
    classIdsSet.add(row.class_id);
  }

  if (classIdsSet.size === 0) {
    return new Map();
  }

  // 2. Bu sınıflara ait aktif ve teslim işaretlemesi bitirilmiş ödevleri çek (R1)
  const { data: hwData, error: hwError } = await supabase
    .from("homework_assignments")
    .select("id, class_id, submissions_recorded_at")
    .eq("organization_id", organizationId)
    .in("class_id", Array.from(classIdsSet))
    .is("archived_at", null)
    .not("submissions_recorded_at", "is", null);

  if (hwError || !hwData) {
    return new Map();
  }

  // Hem sunucu filtrelemesi hem JS tarafı kesinliği: submissions_recorded_at dolu olanlar
  const recordedHomeworkRows = (
    hwData as {
      id: string;
      class_id: string;
      submissions_recorded_at?: string | null;
    }[]
  ).filter(
    h =>
      h.submissions_recorded_at !== null &&
      h.submissions_recorded_at !== undefined
  );

  if (recordedHomeworkRows.length === 0) {
    return new Map();
  }

  const homeworkIds = recordedHomeworkRows.map(h => h.id);

  // 3. Bu bitirilmiş ödevlere ait aktif teslimleri çek
  const { data: subData, error: subError } = await supabase
    .from("homework_submissions")
    .select("homework_id, student_id")
    .eq("organization_id", organizationId)
    .in("homework_id", homeworkIds)
    .is("archived_at", null);

  if (subError || !subData) {
    return new Map();
  }

  // Öğrenci -> teslim ettiği bitirilmiş ödev kimlikleri kümesi
  const studentSubmittedHomeworks = new Map<string, Set<string>>();
  for (const row of subData as { homework_id: string; student_id: string }[]) {
    if (!row.homework_id || !row.student_id) continue;
    let submitted = studentSubmittedHomeworks.get(row.student_id);
    if (!submitted) {
      submitted = new Set();
      studentSubmittedHomeworks.set(row.student_id, submitted);
    }
    submitted.add(row.homework_id);
  }

  // Sınıf -> o sınıfa ait ve işaretlemesi bitirilmiş ödevlerin kimlikleri
  const classRecordedHomeworksMap = new Map<string, string[]>();
  for (const hw of recordedHomeworkRows) {
    const list = classRecordedHomeworksMap.get(hw.class_id) ?? [];
    list.push(hw.id);
    classRecordedHomeworksMap.set(hw.class_id, list);
  }

  const resultMap = new Map<string, string>();

  for (const studentId of uniqueStudentIds) {
    const studentClasses = studentClassesMap.get(studentId);
    if (!studentClasses || studentClasses.size === 0) {
      continue;
    }

    const studentRecordedHwIds = new Set<string>();
    for (const cId of studentClasses) {
      const hwIds = classRecordedHomeworksMap.get(cId);
      if (hwIds) {
        for (const hid of hwIds) {
          studentRecordedHwIds.add(hid);
        }
      }
    }

    const totalRecorded = studentRecordedHwIds.size;
    // R1 & K-22: İşaretlemesi bitirilmiş ödev yoksa "0/0" veya "0/9" uydurulmaz, undefined kalır
    if (totalRecorded === 0) {
      continue;
    }

    const submittedSet = studentSubmittedHomeworks.get(studentId);
    let submittedCount = 0;
    if (submittedSet) {
      for (const hid of studentRecordedHwIds) {
        if (submittedSet.has(hid)) {
          submittedCount++;
        }
      }
    }

    resultMap.set(studentId, `${submittedCount}/${totalRecorded}`);
  }

  return resultMap;
}
