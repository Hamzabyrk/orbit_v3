import { supabase } from "@/lib/supabaseClient";
import type { ScheduleItem } from "@/components/education/types";
import { isoToWeekDay } from "./weekDays";

/**
 * Ders programı servis katmanı (v1.3-01 · B parçası).
 *
 * `schedule_entries` tablosunu gerçek Supabase sorgusuna bağlar.
 *
 * **Kapsam sorgulanmıyor (K-06):** `organization_id` filtresi sorguya yazılmaz.
 * Kapsam veritabanı düzeyinde RLS ile çözülür (`schedule_entries_select_admin`,
 * `schedule_entries_select_teacher`, `schedule_entries_select_student`,
 * `schedule_entries_select_guardian`).
 *
 * **Arşiv filtresi zorunludur:** `archived_at is null` filtresi uygulanır.
 *
 * **Sıralama açık yazılır:** Gün (day_of_week), sonra başlangıç saati (starts_at)
 * artan sırada sıralanır.
 *
 * **Öğretmen adı çözümü (#231):** `class_staff_names` RPC fonksiyonu üzerinden
 * yapılır. `profiles` tablosuna doğrudan sorgu atılmaz; çünkü `profiles` aynı
 * satırda `recovery_email`, `phone` ve şifre kilidi durumunu taşır ve RLS
 * sütun gizleyemez (#228). Ad çözülemezse alan `null` kalır; uydurma dizge
 * üretilmez (K-22).
 *
 * **Tip dürüstlüğü (K-03 & K-22):**
 * - Gün ISO 8601'dir (1..7); `isoToWeekDay()` tek kaynaktır (K-06).
 * - Ders adı: `subject_id` doluysa dersten, boşsa `title` sütunundan gelir.
 * - Süre: `ends_at - starts_at`'ten türetilir; `ends_at` boşsa süre üretilmez (null).
 * - `tone`: Servis tone üretmez; görsel bir Tailwind stili olup arayüzde nötr varsayılan uygulanır.
 */

export const DEFAULT_SCHEDULE_LIMIT = 200;

export type ScheduleListResult = {
  rows: ScheduleItem[];
  truncated: boolean;
};

export type RawScheduleRow = {
  id: string;
  day_of_week: number;
  starts_at: string;
  ends_at?: string | null;
  title?: string | null;
  room?: string | null;
  class_id: string;
  subject_id?: string | null;
  membership_id?: string | null;
  classes?:
    | { id?: string; name: string; archived_at?: string | null }
    | { id?: string; name: string; archived_at?: string | null }[]
    | null;
  subjects?:
    | { id?: string; name: string; archived_at?: string | null }
    | { id?: string; name: string; archived_at?: string | null }[]
    | null;
};

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

/** Ders adını arşiv durumuna BAKMADAN okur. Yalnız `resolveLessonTitle` kullanır. */
function readSubjectName(subjects: unknown): string | null {
  const subObj = Array.isArray(subjects) ? subjects[0] : subjects;
  if (!subObj || typeof subObj !== "object") return null;
  return ((subObj as { name?: string }).name ?? "").trim() || null;
}

export function extractSubjectName(subjects: unknown): string | null {
  if (!subjects) return null;
  const subObj = Array.isArray(subjects) ? subjects[0] : subjects;
  if (!subObj || typeof subObj !== "object") return null;
  const subject = subObj as { name?: string; archived_at?: string | null };
  if (subject.archived_at !== null && subject.archived_at !== undefined) {
    return null;
  }
  return subject.name?.trim() || null;
}

/**
 * Ders adını belirler (v1.3-01b · 2.B.2).
 *
 * Migration kuralı: `subject_id` doluysa ad dersten okunur; boşsa `title`
 * sütunundan. İkisi birden dolu olabilir ve ad iki yerde tutulmaz (K-06).
 */
export function resolveLessonTitle(
  subjectId: string | null | undefined,
  subjects: unknown,
  title: string | null | undefined
): string {
  if (subjectId) {
    // Arşiv durumuna BAKILMAZ ve bu bilinçli. Migration kuralı istisnasız:
    // "dolu olan `subject_id` ise ad dersten okunur". Arşivlenmek adı silmez;
    // geçmişte planlanmış bir dersin adı hâlâ o derstir.
    //
    // Arşivlenmişi eleyip `title`a düşseydik bir delik açılırdı: şema kısıtı
    // `subject_id is not null or title is not null` olduğu için `subject_id`
    // dolu bir satırda `title` BOŞ olabilir — ve ekranda ADSIZ bir ders satırı
    // çizilirdi.
    const subjectName = readSubjectName(subjects);
    if (subjectName) return subjectName;
  }
  return title?.trim() || "";
}

/**
 * Saat dizesini HH:MM biçiminde kırpar (ör. "09:00:00" -> "09:00").
 */
export function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  return timeStr.slice(0, 5);
}

/**
 * Ders süresini starts_at ve ends_at zamanlarından dakika cinsinden türetir (v1.3-01b · 2.B.4).
 *
 * `ends_at` boş ise kesinlikle süre üretilmez (null döner, K-22).
 */
export function calculateDuration(
  startsAt: string,
  endsAt?: string | null
): string | null {
  if (!endsAt) return null;
  const [startH, startM] = startsAt.split(":").map(Number);
  const [endH, endM] = endsAt.split(":").map(Number);
  if (
    Number.isNaN(startH) ||
    Number.isNaN(startM) ||
    Number.isNaN(endH) ||
    Number.isNaN(endM)
  ) {
    return null;
  }
  const diffMinutes = endH * 60 + endM - (startH * 60 + startM);
  if (diffMinutes <= 0) return null;
  return `${diffMinutes} dk`;
}

/**
 * Görüntülenen sınıfların öğretmen/vekil adlarını tek seferde çözer (v1.3-01b · 2.B.3).
 *
 * `profiles` tablosuna doğrudan sorgu gitmez; `class_staff_names` RPC kullanılır (#231).
 */
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

export function mapScheduleRow(
  row: RawScheduleRow,
  staffNames: Map<string, string>
): ScheduleItem | null {
  const day = isoToWeekDay(row.day_of_week);
  if (!day) return null;

  const title = resolveLessonTitle(row.subject_id, row.subjects, row.title);
  const group = extractClassName(row.classes);
  const teacher = row.membership_id
    ? (staffNames.get(row.membership_id) ?? null)
    : null;
  const room = row.room?.trim() || null;
  const time = formatTime(row.starts_at);
  const duration = calculateDuration(row.starts_at, row.ends_at);

  return {
    id: row.id,
    day,
    time,
    title,
    group,
    teacher,
    room,
    duration,
    // tone: Servis tone üretmez (v1.3-01b · 2.C). Ekranda nötr varsayılan uygulanır.
  };
}

export async function loadSchedule(
  limit = DEFAULT_SCHEDULE_LIMIT
): Promise<ScheduleListResult> {
  const { data, error } = await supabase
    .from("schedule_entries")
    .select(
      `
      id,
      day_of_week,
      starts_at,
      ends_at,
      title,
      room,
      class_id,
      subject_id,
      membership_id,
      classes ( id, name, archived_at ),
      subjects ( id, name, archived_at )
    `
    )
    .is("archived_at", null)
    .order("day_of_week", { ascending: true })
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error("Ders programı yüklenemedi.");
  }

  const rawRows = (data ?? []) as RawScheduleRow[];
  const classIds = Array.from(
    new Set(rawRows.map(r => r.class_id).filter(Boolean))
  );

  const staffNames = await loadStaffNames(classIds);
  const rows = rawRows
    .map(r => mapScheduleRow(r, staffNames))
    .filter((item): item is ScheduleItem => item !== null);

  return {
    rows,
    // ⚠️ Ölçüt HAM satır sayısıdır, eşlenmiş satır sayısı değil. `mapScheduleRow`
    // geçersiz gün numarasında satır düşürebiliyor; `rows.length` üzerinden
    // hesaplasaydık, sorgu tam limite dayanmışken bir satır elendiği anda
    // kesilme bandı SESSİZCE çizilmezdi — sözleşmenin yasakladığı şeyin ta
    // kendisi (`DECISION_LOG` — "kesildiği söylenmeden hiçbir liste kesilmez").
    truncated: rawRows.length === limit,
  };
}
