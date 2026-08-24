import { supabase } from "@/lib/supabaseClient";

/**
 * Platform panelinin veri katmanı.
 *
 * Okumaların tamamı kullanıcının kendi oturumuyla yapılır; yetkiyi RLS
 * belirler (bkz. `20260824014500_platform_operator_reads.sql`). Panelde
 * `service_role` kullanılmaz — kullanılsaydı, panelin açık olduğu her sekme
 * tarayıcıda tam yetkili bir anahtar taşıyor olurdu.
 *
 * Tek yazma yolu `bootstrap-organization` Edge Function'ıdır ve o da
 * operatörlüğü sunucu tarafında yeniden doğrular.
 */

export type PlatformOrganization = {
  id: string;
  name: string;
  slug: string;
  code: number | null;
  archivedAt: string | null;
  createdAt: string;
};

export type PlatformOperatorRow = {
  userId: string;
  displayName: string | null;
  role: "owner" | "operator";
  status: "active" | "suspended";
  note: string | null;
  createdAt: string;
};

export type PlatformAuditEvent = {
  id: number;
  actorUserId: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  organizationId: string | null;
  organizationName: string | null;
  createdAt: string;
};

export type CreateOrganizationInput = {
  organizationName: string;
  organizationSlug: string;
  branchName: string;
  adminEmail: string;
  adminFullName: string;
};

/**
 * Edge Function'ın döndürdüğü hata kodlarının Türkçe karşılıkları.
 *
 * Ham kodu ekrana basmıyoruz; operatör "admin_invite_failed" görünce ne
 * yapacağını bilemez. Bilinmeyen kod, sessizce yutulmak yerine genel mesajla
 * gösterilir ve kodun kendisi konsola düşer.
 */
const CREATE_ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Oturumunuz düşmüş görünüyor. Tekrar giriş yapın.",
  forbidden: "Bu işlem için platform operatörü yetkisi gerekiyor.",
  invalid_request:
    "Gönderilen bilgiler geçersiz. Alanları kontrol edip tekrar deneyin.",
  admin_invite_failed:
    "Kurum yöneticisi davet edilemedi. E-posta adresi geçersiz olabilir veya bu adresle zaten bir hesap var.",
  organization_bootstrap_failed:
    "Kurum oluşturulamadı. Kısa ad (slug) başka bir kurumda kullanılıyor olabilir.",
  service_unavailable:
    "Servis şu anda yanıt vermiyor. Birkaç dakika sonra tekrar deneyin.",
  origin_not_allowed:
    "Bu adres sunucu tarafında izinli değil. Geliştirme ekibine bildirin.",
};

export function createOrganizationErrorMessage(code: unknown): string {
  if (typeof code === "string" && code in CREATE_ERROR_MESSAGES) {
    return CREATE_ERROR_MESSAGES[code];
  }

  return "Kurum oluşturulamadı. Lütfen tekrar deneyin.";
}

export async function loadOrganizations(): Promise<PlatformOrganization[]> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug, code, archived_at, created_at")
    .order("code", { ascending: true });

  if (error) {
    throw new Error("Kurum listesi yüklenemedi.");
  }

  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    code: row.code,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  }));
}

export async function loadOperators(): Promise<PlatformOperatorRow[]> {
  const { data, error } = await supabase
    .from("platform_operators")
    .select("user_id, role, status, note, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Operatör listesi yüklenemedi.");
  }

  const rows = data ?? [];
  const names = await loadDisplayNames(rows.map(row => row.user_id));

  return rows.map(row => ({
    userId: row.user_id,
    displayName: names.get(row.user_id) ?? null,
    role: row.role,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
  }));
}

export async function loadAuditEvents(
  limit = 50
): Promise<PlatformAuditEvent[]> {
  const { data, error } = await supabase
    .from("platform_audit_events")
    .select(
      "id, actor_user_id, action, entity_type, entity_id, organization_id, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error("Denetim kaydı yüklenemedi.");
  }

  const rows = data ?? [];
  const actorIds = rows
    .map(row => row.actor_user_id)
    .filter((value): value is string => Boolean(value));

  // İsimler ayrı sorgulanıyor. Supabase'in gömülü join'i (`profiles(...)`)
  // burada çalışmaz: `platform_audit_events.actor_user_id` `auth.users`'a
  // bakıyor, `public.profiles`'a değil; PostgREST ilişkiyi göremiyor.
  const [names, organizationNames] = await Promise.all([
    loadDisplayNames(actorIds),
    loadOrganizationNames(),
  ]);

  return rows.map(row => ({
    id: row.id,
    actorUserId: row.actor_user_id,
    actorName: row.actor_user_id
      ? (names.get(row.actor_user_id) ?? null)
      : null,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    organizationId: row.organization_id,
    organizationName: row.organization_id
      ? (organizationNames.get(row.organization_id) ?? null)
      : null,
    createdAt: row.created_at,
  }));
}

async function loadDisplayNames(
  userIds: string[]
): Promise<Map<string, string>> {
  // `[...new Set(...)]` tsconfig hedefiyle uyumsuz (TS2802). Liste operatör
  // sayısı kadar kısa olduğu için `indexOf` ile tekilleştirmek yeterli.
  const unique = userIds.filter(
    (value, index) => userIds.indexOf(value) === index
  );

  if (unique.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", unique);

  // İsim çözümlenemezse liste yine gösterilir, yalnızca isim yerine kimlik
  // görünür. Yardımcı bir alan yüzünden asıl listeyi kaybetmek doğru olmaz.
  if (error) {
    return new Map();
  }

  return new Map((data ?? []).map(row => [row.id, row.display_name]));
}

async function loadOrganizationNames(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name");

  if (error) {
    return new Map();
  }

  return new Map((data ?? []).map(row => [row.id, row.name]));
}

export async function createOrganization(
  input: CreateOrganizationInput
): Promise<void> {
  const { error } = await supabase.functions.invoke("bootstrap-organization", {
    body: input,
  });

  if (!error) {
    return;
  }

  // `FunctionsHttpError` gövdeyi taşır ama okumak için `context.json()`
  // gerekiyor; okunamazsa genel mesaja düşüyoruz.
  let code: unknown;
  const context = (error as { context?: { json?: () => Promise<unknown> } })
    .context;

  if (context?.json) {
    try {
      const body = (await context.json()) as { error?: unknown };
      code = body?.error;
    } catch {
      code = undefined;
    }
  }

  if (code === undefined) {
    console.error("[platform] bootstrap-organization failed", error.message);
  }

  throw new Error(createOrganizationErrorMessage(code));
}
