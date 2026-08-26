import type { IssuedCredentials } from "@/components/credentials/IssuedCredentials";
import type { EducationRole } from "@/components/educationAccess";
import { supabase } from "@/lib/supabaseClient";

export type MemberStatus = "invited" | "active" | "suspended";
export type MemberRole = Exclude<EducationRole, "admin">;

export type OrganizationMember = {
  membershipId: string;
  displayName: string | null;
  loginNumber: string | null;
  role: EducationRole;
  branchName: string | null;
  status: MemberStatus;
};

const educationRoles = new Set<EducationRole>([
  "admin",
  "teacher",
  "student",
  "parent",
]);

export function isEducationRole(value: string): value is EducationRole {
  return educationRoles.has(value as EducationRole);
}

const memberStatuses = new Set<MemberStatus>([
  "invited",
  "active",
  "suspended",
]);

export function isMemberStatus(value: string): value is MemberStatus {
  return memberStatuses.has(value as MemberStatus);
}

const ROLE_ORDER: Record<EducationRole, number> = {
  admin: 1,
  teacher: 2,
  student: 3,
  parent: 4,
};

/**
 * Giriş numarasını formatlar.
 *
 * Kurum kodu ve kişi kodu mevcutsa ikisini birleştirerek 8 haneli numarayı üretir.
 * İkisinden biri yoksa (null veya undefined), uydurulmuş bir numara üretmek yerine
 * null döner (K-03).
 */
export function formatLoginNumber(
  organizationCode: number | null | undefined,
  personCode: number | null | undefined
): string | null {
  if (
    organizationCode === null ||
    organizationCode === undefined ||
    personCode === null ||
    personCode === undefined
  ) {
    return null;
  }

  return `${organizationCode}${personCode}`;
}

/**
 * Üyeleri rol ve ad hiyerarşisine göre sıralar:
 * 1. Rol sırası: admin -> teacher -> student -> parent
 * 2. Aynı roldeki üyeler: Türkçe ada göre alfabetik sıralama (A -> Z).
 *    Adı okunamayan (null) kayıtlar kendi rol grubunun sonunda yer alır.
 */
export function sortMembers(
  members: OrganizationMember[]
): OrganizationMember[] {
  return [...members].sort((a, b) => {
    const orderA = ROLE_ORDER[a.role] ?? 99;
    const orderB = ROLE_ORDER[b.role] ?? 99;
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // Adı okunamayanlar (null) kendi rol grubunun en sonuna gider (K-03 / K-09).
    if (a.displayName === null && b.displayName === null) {
      return 0;
    }
    if (a.displayName === null) {
      return 1;
    }
    if (b.displayName === null) {
      return -1;
    }

    return a.displayName.localeCompare(b.displayName, "tr");
  });
}

type MembershipQueryRow = {
  id: string;
  user_id: string;
  branch_id: string | null;
  person_code: number | null;
  role: string;
  status: string;
};

/**
 * Kurumun tüm üyelerini yükler ve sıralı olarak döndürür.
 *
 * Okuma kullanıcının kendi oturumuyla yapılır; RLS politikaları (#100)
 * kurum yöneticisinin yalnızca kendi kurum üyelerini görmesini garanti eder.
 *
 * Hata durumlarında boş liste döndürülmez veya hata yutulmaz; kullanıcıya
 * ve çağıran bileşene hata fırlatılır.
 */
export async function loadOrganizationMembers(
  organizationId: string,
  organizationCode: number | null
): Promise<OrganizationMember[]> {
  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_memberships")
    .select("id, user_id, branch_id, person_code, role, status")
    .eq("organization_id", organizationId);

  if (membershipsError) {
    throw new Error("Kurum üyeleri yüklenemedi. Lütfen tekrar deneyin.");
  }

  const rows: MembershipQueryRow[] = memberships ?? [];
  if (rows.length === 0) {
    return [];
  }

  // user_id ve branch_id listelerini tekilleştir
  const userIds = rows
    .map(r => r.user_id)
    .filter((id, index, arr) => arr.indexOf(id) === index);
  const branchIds = rows
    .map(r => r.branch_id)
    .filter((id): id is string => Boolean(id))
    .filter((id, index, arr) => arr.indexOf(id) === index);

  const [profilesResult, branchesResult] = await Promise.all([
    userIds.length > 0
      ? supabase.from("profiles").select("id, display_name").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    branchIds.length > 0
      ? supabase.from("branches").select("id, name").in("id", branchIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesResult.error) {
    throw new Error("Üye profilleri yüklenemedi. Lütfen tekrar deneyin.");
  }

  if (branchesResult.error) {
    throw new Error("Şube bilgileri yüklenemedi. Lütfen tekrar deneyin.");
  }

  const profileMap = new Map<string, string>(
    (profilesResult.data ?? []).map(p => [p.id, p.display_name])
  );
  const branchMap = new Map<string, string>(
    (branchesResult.data ?? []).map(b => [b.id, b.name])
  );

  const members: OrganizationMember[] = rows.map(row => {
    if (!isEducationRole(row.role)) {
      throw new Error("Kurum üyeliğinde tanınmayan bir rol bulundu.");
    }

    if (!isMemberStatus(row.status)) {
      throw new Error("Kurum üyeliğinde tanınmayan bir durum bulundu.");
    }

    // Profil satırı yoksa null atanır; "İsimsiz Üye" gibi uydurulmuş bir değer
    // kullanılmaz (K-03 / K-09).
    const profileName = profileMap.get(row.user_id);
    const displayName = profileName !== undefined ? profileName : null;

    const branchName = row.branch_id
      ? (branchMap.get(row.branch_id) ?? null)
      : null;

    return {
      membershipId: row.id,
      displayName,
      loginNumber: formatLoginNumber(organizationCode, row.person_code),
      role: row.role,
      branchName,
      status: row.status,
    };
  });

  return sortMembers(members);
}

const MEMBER_ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Oturumunuz düşmüş görünüyor. Tekrar giriş yapın.",
  forbidden:
    "Bu işlem için kurum yöneticisi yetkisi gerekiyor veya üye bulunamadı.",
  invalid_input: "Geçersiz üyelik bilgisi gönderildi.",
  lookup_failed: "Üye yetkilendirmesi doğrulanamadı. Lütfen tekrar deneyin.",
  password_update_failed: "Yeni şifre kaydedilemedi. Lütfen tekrar deneyin.",
  service_unavailable:
    "Servis şu anda yanıt vermiyor. Birkaç dakika sonra tekrar deneyin.",
  origin_not_allowed: "Bu adres sunucu tarafında izinli değil.",
  member_create_failed:
    "Üye oluşturulamadı. Bilgileri kontrol edip tekrar deneyin.",
};

async function readFunctionErrorCode(error: unknown): Promise<unknown> {
  const context = (error as { context?: { json?: () => Promise<unknown> } })
    ?.context;

  if (!context?.json) {
    console.error(
      "[memberService] edge function failed",
      (error as Error | null)?.message
    );
    return undefined;
  }

  try {
    const body = (await context.json()) as { error?: unknown };
    return body?.error;
  } catch {
    return undefined;
  }
}

export function memberErrorMessage(code: unknown, fallback: string): string {
  if (typeof code === "string" && code in MEMBER_ERROR_MESSAGES) {
    return MEMBER_ERROR_MESSAGES[code];
  }
  return fallback;
}

export async function createMember(input: {
  fullName: string;
  role: Exclude<EducationRole, "admin">;
  branchId: string | null;
}): Promise<IssuedCredentials> {
  const { data, error } = await supabase.functions.invoke("create-member", {
    body: {
      fullName: input.fullName.trim(),
      role: input.role,
      branchId: input.branchId,
    },
  });

  if (error) {
    throw new Error(
      memberErrorMessage(
        await readFunctionErrorCode(error),
        "Üye oluşturulamadı. Bilgileri kontrol edip tekrar deneyin."
      )
    );
  }

  const payload = (data as { data?: Record<string, unknown> } | null)?.data;
  const loginNumber = payload?.login_number;
  const temporaryPassword = payload?.temporary_password;
  const passwordLockSet =
    typeof payload?.password_lock_set === "boolean"
      ? payload.password_lock_set
      : undefined;
  const auditWritten =
    typeof payload?.audit_written === "boolean"
      ? payload.audit_written
      : undefined;

  if (
    typeof loginNumber !== "string" ||
    typeof temporaryPassword !== "string"
  ) {
    throw new Error(
      "Üye oluşturuldu ancak yanıt okunamadı. İşlemi tekrarlamayın; önce üyeler listesini kontrol edin."
    );
  }

  return {
    loginNumber,
    temporaryPassword,
    passwordLockSet,
    auditWritten,
  };
}

export async function loadOrganizationBranches(
  organizationId: string
): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from("branches")
    .select("id, name")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Şubeler yüklenemedi. Lütfen tekrar deneyin.");
  }

  return data ?? [];
}

/**
 * Kurumdaki bir üyenin şifresini sıfırlar ve yeni geçici şifre üretir.
 *
 * Bu işlem kurum yöneticisi tarafından çağrılır (`reset-member-password`
 * Edge Function). Üretilen geçici şifre veritabanında saklanmaz, yalnızca
 * bu yanıtta bir kez döner.
 */
export async function resetMemberPassword(
  membershipId: string
): Promise<IssuedCredentials> {
  const { data, error } = await supabase.functions.invoke(
    "reset-member-password",
    { body: { membershipId } }
  );

  if (error) {
    throw new Error(
      memberErrorMessage(
        await readFunctionErrorCode(error),
        "Yeni şifre üretilemedi. Lütfen tekrar deneyin."
      )
    );
  }

  const payload = (data as { data?: Record<string, unknown> } | null)?.data;
  const loginNumber = payload?.login_number;
  const temporaryPassword = payload?.temporary_password;
  const passwordLockSet =
    typeof payload?.password_lock_set === "boolean"
      ? payload.password_lock_set
      : undefined;
  const auditWritten =
    typeof payload?.audit_written === "boolean"
      ? payload.audit_written
      : undefined;

  // Şifre sunucuda zaten değişti. Yanıtı okuyamazsak sessizce başarılı dönmek,
  // kimsenin bilmediği bir şifreyle hesabı büsbütün kilitlemek olurdu.
  if (
    typeof loginNumber !== "string" ||
    typeof temporaryPassword !== "string"
  ) {
    throw new Error(
      "Şifre sıfırlandı ancak yanıt okunamadı. İşlemi tekrarlayın; yeni şifre üretilecektir."
    );
  }

  return {
    loginNumber,
    temporaryPassword,
    passwordLockSet,
    auditWritten,
  };
}
