import { supabase } from "@/lib/supabaseClient";

export type TaskItem = {
  id: string;
  organizationId: string;
  ownerMembershipId: string;
  title: string;
  detail: string | null;
  dueOn: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskListResult = {
  rows: TaskItem[];
  truncated: boolean;
};

export type LoadTasksOptions = {
  includeArchived?: boolean;
  limit?: number;
};

export type CreateTaskInput = {
  organizationId: string;
  ownerMembershipId: string;
  title: string;
  detail?: string | null;
  dueOn?: string | null;
};

export type UpdateTaskInput = {
  title?: string;
  detail?: string | null;
  dueOn?: string | null;
  completedAt?: string | null;
};

export type CalendarEventItem = {
  id: string;
  organizationId: string;
  ownerMembershipId: string;
  title: string;
  subtitle: string | null;
  startsAt: string;
  endsAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CalendarEventListResult = {
  rows: CalendarEventItem[];
  truncated: boolean;
};

export type LoadCalendarEventsOptions = {
  includeArchived?: boolean;
  limit?: number;
};

export type CreateCalendarEventInput = {
  organizationId: string;
  ownerMembershipId: string;
  title: string;
  subtitle?: string | null;
  startsAt: string;
  endsAt?: string | null;
};

export type UpdateCalendarEventInput = {
  title?: string;
  subtitle?: string | null;
  startsAt?: string;
  endsAt?: string | null;
};

export const DEFAULT_DAY_PLAN_LIMIT = 100;

type RawTaskRow = {
  id: string;
  organization_id: string;
  owner_membership_id: string;
  title: string;
  detail: string | null;
  due_on: string | null;
  completed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type RawCalendarEventRow = {
  id: string;
  organization_id: string;
  owner_membership_id: string;
  title: string;
  subtitle: string | null;
  starts_at: string;
  ends_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapTaskRow(row: RawTaskRow): TaskItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    ownerMembershipId: row.owner_membership_id,
    title: (row.title ?? "").trim(),
    detail: row.detail?.trim() || null,
    dueOn: row.due_on || null,
    completedAt: row.completed_at || null,
    archivedAt: row.archived_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCalendarEventRow(row: RawCalendarEventRow): CalendarEventItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    ownerMembershipId: row.owner_membership_id,
    title: (row.title ?? "").trim(),
    subtitle: row.subtitle?.trim() || null,
    startsAt: row.starts_at,
    endsAt: row.ends_at || null,
    archivedAt: row.archived_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Veritabanı ve PostgREST hatalarını kullanıcı dostu Türkçe hata mesajlarına çevirir.
 * ⚠️ PostgREST hata alanı `details`'tir (çoğul); `detail` kullanılmaz (K-23).
 */
export function translateDayPlanError(error: unknown): string {
  if (!error) {
    return "Beklenmeyen bir hata oluştu.";
  }

  let code: string | undefined;
  let message = "";
  let details = "";

  if (typeof error === "object" && error !== null) {
    const errObj = error as {
      code?: unknown;
      message?: unknown;
      details?: unknown;
      detail?: unknown;
    };
    if (typeof errObj.code === "string") {
      code = errObj.code;
    }
    if (typeof errObj.message === "string") {
      message = errObj.message;
    }
    if (typeof errObj.details === "string") {
      details = errObj.details;
    } else if (typeof errObj.detail === "string") {
      details = errObj.detail;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  if (!code && (message || details)) {
    const textToScan = `${message} ${details}`;
    for (const known of ["42501", "23514"]) {
      if (textToScan.includes(known)) {
        code = known;
        break;
      }
    }
  }

  if (code === "42501") {
    return "Bu işlem için yetkiniz yok veya şifre değişimi bekleniyor. Yalnızca kendi kişisel kayıtlarınızı yönetebilirsiniz.";
  }

  if (code === "23514") {
    if (details.includes("tasks_title_check")) {
      return "Görev başlığı 1 ile 200 karakter arasında olmalıdır.";
    }
    if (details.includes("calendar_events_title_check")) {
      return "Etkinlik başlığı 1 ile 200 karakter arasında olmalıdır.";
    }
    if (details.includes("calendar_events_time_check")) {
      return "Bitiş saati başlangıç saatinden sonra olmalıdır.";
    }
    return "Başlık 1 ile 200 karakter arasında olmalı veya saat aralığı geçerli olmalıdır.";
  }

  if (message && !message.includes("PGRST") && !message.includes("PostgREST")) {
    return message;
  }

  return "Gün planı işlemi gerçekleştirilemedi. Lütfen tekrar deneyin.";
}

/**
 * Giriş yapan kullanıcının kişisel görevlerini yükler.
 *
 * - Açık `organization_id` ve `owner_membership_id` süzgeci taşır.
 * - Varsayılan olarak arşivlenmemiş görevleri getirir (`includeArchived` ile tümü).
 * - Açık `.limit()` ve `truncated` bayrağı döner (`rows.length === limit`).
 */
export async function loadTasks(
  organizationId: string,
  membershipId: string,
  options?: LoadTasksOptions
): Promise<TaskListResult> {
  if (!organizationId || !membershipId) {
    return { rows: [], truncated: false };
  }

  const limit = options?.limit ?? DEFAULT_DAY_PLAN_LIMIT;

  let query = supabase
    .from("tasks")
    .select(
      `
      id,
      organization_id,
      owner_membership_id,
      title,
      detail,
      due_on,
      completed_at,
      archived_at,
      created_at,
      updated_at
    `
    )
    .eq("organization_id", organizationId)
    .eq("owner_membership_id", membershipId);

  if (!options?.includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(translateDayPlanError(error));
  }

  const rawRows = (data ?? []) as RawTaskRow[];
  const rows = rawRows.map(mapTaskRow);

  return {
    rows,
    truncated: rawRows.length === limit,
  };
}

/**
 * Yeni bir kişisel görev oluşturur.
 *
 * ⚠️ Yüke asla `id` KONMAZ (K-00).
 * ⚠️ `owner_membership_id` giriş yapan kullanıcının kendi üyeliği olmak zorundadır.
 */
export async function createTask(input: CreateTaskInput): Promise<TaskItem> {
  if (!input.organizationId || !input.ownerMembershipId) {
    throw new Error("Kurum ve üyelik bilgisi zorunludur.");
  }

  const trimmedTitle = input.title.trim();
  if (!trimmedTitle || trimmedTitle.length > 200) {
    throw new Error("Görev başlığı 1 ile 200 karakter arasında olmalıdır.");
  }

  const payload = {
    organization_id: input.organizationId,
    owner_membership_id: input.ownerMembershipId,
    title: trimmedTitle,
    detail: input.detail?.trim() || null,
    due_on: input.dueOn || null,
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert(payload)
    .select(
      `
      id,
      organization_id,
      owner_membership_id,
      title,
      detail,
      due_on,
      completed_at,
      archived_at,
      created_at,
      updated_at
    `
    )
    .single();

  if (error) {
    throw new Error(translateDayPlanError(error));
  }

  return mapTaskRow(data as RawTaskRow);
}

/**
 * Mevcut bir görevi günceller.
 *
 * ⚠️ Yüke asla `id` veya `owner_membership_id` KONMAZ.
 * ⚠️ Sıfır satır etkilendiğinde hata fırlatır (K-14).
 */
export async function updateTask(
  organizationId: string,
  taskId: string,
  input: UpdateTaskInput
): Promise<TaskItem> {
  if (!organizationId || !taskId) {
    throw new Error("Kurum ve görev kimliği gereklidir.");
  }

  const payload: {
    title?: string;
    detail?: string | null;
    due_on?: string | null;
    completed_at?: string | null;
  } = {};

  if (input.title !== undefined) {
    const trimmedTitle = input.title.trim();
    if (!trimmedTitle || trimmedTitle.length > 200) {
      throw new Error("Görev başlığı 1 ile 200 karakter arasında olmalıdır.");
    }
    payload.title = trimmedTitle;
  }

  if (input.detail !== undefined) {
    payload.detail = input.detail?.trim() || null;
  }

  if (input.dueOn !== undefined) {
    payload.due_on = input.dueOn || null;
  }

  if (input.completedAt !== undefined) {
    payload.completed_at = input.completedAt || null;
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(payload)
    .eq("organization_id", organizationId)
    .eq("id", taskId)
    .select(
      `
      id,
      organization_id,
      owner_membership_id,
      title,
      detail,
      due_on,
      completed_at,
      archived_at,
      created_at,
      updated_at
    `
    );

  if (error) {
    throw new Error(translateDayPlanError(error));
  }

  if (!data || data.length === 0) {
    throw new Error(
      "Görev güncellenemedi veya bu işlem için yetkiniz bulunmuyor."
    );
  }

  return mapTaskRow(data[0] as RawTaskRow);
}

/**
 * Görevi tamamlandı olarak işaretler (`completed_at` zaman damgası doldurulur).
 * ⚠️ Sıfır satır etkilendiğinde hata fırlatır (K-14).
 */
export async function completeTask(
  organizationId: string,
  taskId: string
): Promise<TaskItem> {
  if (!organizationId || !taskId) {
    throw new Error("Kurum ve görev kimliği gereklidir.");
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("tasks")
    .update({ completed_at: now })
    .eq("organization_id", organizationId)
    .eq("id", taskId)
    .select(
      `
      id,
      organization_id,
      owner_membership_id,
      title,
      detail,
      due_on,
      completed_at,
      archived_at,
      created_at,
      updated_at
    `
    );

  if (error) {
    throw new Error(translateDayPlanError(error));
  }

  if (!data || data.length === 0) {
    throw new Error(
      "Görev tamamlanamadı veya bu işlem için yetkiniz bulunmuyor."
    );
  }

  return mapTaskRow(data[0] as RawTaskRow);
}

/**
 * Görevin tamamlandı durumunu geri alır (`completed_at` null yapılır).
 * ⚠️ Sıfır satır etkilendiğinde hata fırlatır (K-14).
 */
export async function uncompleteTask(
  organizationId: string,
  taskId: string
): Promise<TaskItem> {
  if (!organizationId || !taskId) {
    throw new Error("Kurum ve görev kimliği gereklidir.");
  }

  const { data, error } = await supabase
    .from("tasks")
    .update({ completed_at: null })
    .eq("organization_id", organizationId)
    .eq("id", taskId)
    .select(
      `
      id,
      organization_id,
      owner_membership_id,
      title,
      detail,
      due_on,
      completed_at,
      archived_at,
      created_at,
      updated_at
    `
    );

  if (error) {
    throw new Error(translateDayPlanError(error));
  }

  if (!data || data.length === 0) {
    throw new Error(
      "Görev durumu geri alınamadı veya bu işlem için yetkiniz bulunmuyor."
    );
  }

  return mapTaskRow(data[0] as RawTaskRow);
}

/**
 * Görevi arşive alır (soft-delete).
 * ⚠️ DELETE çalıştırılmaz; `archived_at` doldurulur.
 * ⚠️ Sıfır satır etkilendiğinde hata fırlatır (K-14).
 */
export async function archiveTask(
  organizationId: string,
  taskId: string
): Promise<void> {
  if (!organizationId || !taskId) {
    throw new Error("Kurum ve görev kimliği gereklidir.");
  }

  const { data, error } = await supabase
    .from("tasks")
    .update({ archived_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("id", taskId)
    .is("archived_at", null)
    .select("id");

  if (error) {
    throw new Error(translateDayPlanError(error));
  }

  if (!data || data.length === 0) {
    throw new Error(
      "Görev arşivlenemedi veya bu işlem için yetkiniz bulunmuyor."
    );
  }
}

/**
 * Giriş yapan kullanıcının kişisel takvim etkinliklerini yükler.
 *
 * - Açık `organization_id` ve `owner_membership_id` süzgeci taşır.
 * - Varsayılan olarak arşivlenmemiş etkinlikleri getirir.
 * - Açık `.limit()` ve `truncated` bayrağı döner.
 */
export async function loadCalendarEvents(
  organizationId: string,
  membershipId: string,
  options?: LoadCalendarEventsOptions
): Promise<CalendarEventListResult> {
  if (!organizationId || !membershipId) {
    return { rows: [], truncated: false };
  }

  const limit = options?.limit ?? DEFAULT_DAY_PLAN_LIMIT;

  let query = supabase
    .from("calendar_events")
    .select(
      `
      id,
      organization_id,
      owner_membership_id,
      title,
      subtitle,
      starts_at,
      ends_at,
      archived_at,
      created_at,
      updated_at
    `
    )
    .eq("organization_id", organizationId)
    .eq("owner_membership_id", membershipId);

  if (!options?.includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(translateDayPlanError(error));
  }

  const rawRows = (data ?? []) as RawCalendarEventRow[];
  const rows = rawRows.map(mapCalendarEventRow);

  return {
    rows,
    truncated: rawRows.length === limit,
  };
}

/**
 * Yeni bir kişisel takvim etkinliği oluşturur.
 *
 * ⚠️ Yüke asla `id` KONMAZ (K-00).
 * ⚠️ `owner_membership_id` giriş yapan kullanıcının kendi üyeliği olmak zorundadır.
 */
export async function createCalendarEvent(
  input: CreateCalendarEventInput
): Promise<CalendarEventItem> {
  if (!input.organizationId || !input.ownerMembershipId) {
    throw new Error("Kurum ve üyelik bilgisi zorunludur.");
  }

  const trimmedTitle = input.title.trim();
  if (!trimmedTitle || trimmedTitle.length > 200) {
    throw new Error("Etkinlik başlığı 1 ile 200 karakter arasında olmalıdır.");
  }

  if (input.endsAt && new Date(input.endsAt) <= new Date(input.startsAt)) {
    throw new Error("Bitiş saati başlangıç saatinden sonra olmalıdır.");
  }

  const payload = {
    organization_id: input.organizationId,
    owner_membership_id: input.ownerMembershipId,
    title: trimmedTitle,
    subtitle: input.subtitle?.trim() || null,
    starts_at: input.startsAt,
    ends_at: input.endsAt || null,
  };

  const { data, error } = await supabase
    .from("calendar_events")
    .insert(payload)
    .select(
      `
      id,
      organization_id,
      owner_membership_id,
      title,
      subtitle,
      starts_at,
      ends_at,
      archived_at,
      created_at,
      updated_at
    `
    )
    .single();

  if (error) {
    throw new Error(translateDayPlanError(error));
  }

  return mapCalendarEventRow(data as RawCalendarEventRow);
}

/**
 * Mevcut bir takvim etkinliğini günceller.
 *
 * ⚠️ Yüke asla `id` veya `owner_membership_id` KONMAZ.
 * ⚠️ Sıfır satır etkilendiğinde hata fırlatır (K-14).
 */
export async function updateCalendarEvent(
  organizationId: string,
  eventId: string,
  input: UpdateCalendarEventInput
): Promise<CalendarEventItem> {
  if (!organizationId || !eventId) {
    throw new Error("Kurum ve etkinlik kimliği gereklidir.");
  }

  const payload: {
    title?: string;
    subtitle?: string | null;
    starts_at?: string;
    ends_at?: string | null;
  } = {};

  if (input.title !== undefined) {
    const trimmedTitle = input.title.trim();
    if (!trimmedTitle || trimmedTitle.length > 200) {
      throw new Error(
        "Etkinlik başlığı 1 ile 200 karakter arasında olmalıdır."
      );
    }
    payload.title = trimmedTitle;
  }

  if (input.subtitle !== undefined) {
    payload.subtitle = input.subtitle?.trim() || null;
  }

  if (input.startsAt !== undefined) {
    payload.starts_at = input.startsAt;
  }

  if (input.endsAt !== undefined) {
    payload.ends_at = input.endsAt || null;
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .update(payload)
    .eq("organization_id", organizationId)
    .eq("id", eventId)
    .select(
      `
      id,
      organization_id,
      owner_membership_id,
      title,
      subtitle,
      starts_at,
      ends_at,
      archived_at,
      created_at,
      updated_at
    `
    );

  if (error) {
    throw new Error(translateDayPlanError(error));
  }

  if (!data || data.length === 0) {
    throw new Error(
      "Etkinlik güncellenemedi veya bu işlem için yetkiniz bulunmuyor."
    );
  }

  return mapCalendarEventRow(data[0] as RawCalendarEventRow);
}

/**
 * Takvim etkinliğini arşive alır (soft-delete).
 * ⚠️ DELETE çalıştırılmaz; `archived_at` doldurulur.
 * ⚠️ Sıfır satır etkilendiğinde hata fırlatır (K-14).
 */
export async function archiveCalendarEvent(
  organizationId: string,
  eventId: string
): Promise<void> {
  if (!organizationId || !eventId) {
    throw new Error("Kurum ve etkinlik kimliği gereklidir.");
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .update({ archived_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("id", eventId)
    .is("archived_at", null)
    .select("id");

  if (error) {
    throw new Error(translateDayPlanError(error));
  }

  if (!data || data.length === 0) {
    throw new Error(
      "Etkinlik arşivlenemedi veya bu işlem için yetkiniz bulunmuyor."
    );
  }
}
