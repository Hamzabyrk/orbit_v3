import { supabase } from "@/lib/supabaseClient";

export type Branch = {
  id: string;
  organizationId: string;
  name: string;
  isDefault: boolean;
  archivedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type BranchListResult = {
  rows: Branch[];
  truncated: boolean;
};

export type LoadBranchesOptions = {
  includeArchived?: boolean;
  limit?: number;
};

export type CreateBranchInput = {
  organizationId: string;
  name: string;
  isDefault?: boolean;
};

export type UpdateBranchInput = {
  name?: string;
  isDefault?: boolean;
};

export const DEFAULT_BRANCH_LIMIT = 50;

type RawBranchRow = {
  id: string;
  organization_id: string;
  name: string;
  is_default: boolean;
  archived_at: string | null;
  created_at?: string;
  updated_at?: string;
};

function mapBranch(row: RawBranchRow): Branch {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    isDefault: Boolean(row.is_default),
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Kurumun şubelerini yükler.
 *
 * - Açık `organization_id` süzgeci taşır (K-19 / multi-tenant izolasyonu).
 * - Varsayılan olarak arşivlenmemiş şubeleri getirir (`includeArchived` ile tümü).
 * - Açık `.limit()` ve `truncated` bayrağı döner (sessiz kesilme engeli / K-03).
 */
export async function loadBranches(
  organizationId: string,
  options?: LoadBranchesOptions
): Promise<BranchListResult> {
  const limit = options?.limit ?? DEFAULT_BRANCH_LIMIT;

  let query = supabase
    .from("branches")
    .select(
      "id, organization_id, name, is_default, archived_at, created_at, updated_at"
    )
    .eq("organization_id", organizationId);

  if (!options?.includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(translateBranchError(error));
  }

  const rawRows = (data ?? []) as RawBranchRow[];
  const rows = rawRows.map(mapBranch);

  return {
    rows,
    truncated: rows.length === limit,
  };
}

/**
 * Geriye dönük uyumluluk ve form diyalogları için şube listesini yükler.
 */
export async function loadOrganizationBranches(
  organizationId: string
): Promise<{ id: string; name: string; isDefault: boolean }[]> {
  const result = await loadBranches(organizationId);
  return result.rows.map(b => ({
    id: b.id,
    name: b.name,
    isDefault: b.isDefault,
  }));
}

/**
 * Yeni bir şube oluşturur (yalnızca kurum yöneticisi / RLS).
 *
 * ⚠️ Yüke asla `id` KONMAZ — kimlik veritabanının işidir (#284 / K-00).
 */
export async function createBranch(input: CreateBranchInput): Promise<Branch> {
  const payload: {
    organization_id: string;
    name: string;
    is_default?: boolean;
  } = {
    organization_id: input.organizationId,
    name: input.name.trim(),
  };

  if (input.isDefault !== undefined) {
    payload.is_default = Boolean(input.isDefault);
  }

  const { data, error } = await supabase
    .from("branches")
    .insert(payload)
    .select(
      "id, organization_id, name, is_default, archived_at, created_at, updated_at"
    )
    .single();

  if (error) {
    throw new Error(translateBranchError(error));
  }

  return mapBranch(data as RawBranchRow);
}

/**
 * Şube bilgilerini günceller (yalnızca kurum yöneticisi / RLS).
 *
 * ⚠️ Yüke asla `id` veya `organization_id` KONMAZ.
 * Sıfır satır etkilendiğinde hata fırlatır (K-14).
 */
export async function updateBranch(
  organizationId: string,
  branchId: string,
  input: UpdateBranchInput
): Promise<Branch> {
  const payload: { name?: string; is_default?: boolean } = {};

  if (input.name !== undefined) {
    payload.name = input.name.trim();
  }
  if (input.isDefault !== undefined) {
    payload.is_default = Boolean(input.isDefault);
  }

  const { data, error } = await supabase
    .from("branches")
    .update(payload)
    .eq("organization_id", organizationId)
    .eq("id", branchId)
    .select(
      "id, organization_id, name, is_default, archived_at, created_at, updated_at"
    );

  if (error) {
    throw new Error(translateBranchError(error));
  }

  if (!data || data.length === 0) {
    throw new Error("Şube bulunamadı veya güncelleme yetkiniz yok.");
  }

  return mapBranch(data[0] as RawBranchRow);
}

/**
 * Bir şubeyi kurumun varsayılan şubesi yapar.
 *
 * ⚠️ Devir TEK BİR UPDATE ile yapılır (`is_default = true`).
 * Tetikleyici (`enforce_single_default_branch`) eskisini otomatik temizler.
 * İstemcide iki adım yapılmaz (arada kurum varsayılansız kalmaz).
 * Sıfır satır etkilendiğinde hata fırlatır (K-14).
 */
export async function setDefaultBranch(
  organizationId: string,
  branchId: string
): Promise<Branch> {
  const { data, error } = await supabase
    .from("branches")
    .update({ is_default: true })
    .eq("organization_id", organizationId)
    .eq("id", branchId)
    .is("archived_at", null)
    .select(
      "id, organization_id, name, is_default, archived_at, created_at, updated_at"
    );

  if (error) {
    throw new Error(translateBranchError(error));
  }

  if (!data || data.length === 0) {
    throw new Error("Şube bulunamadı veya güncelleme yetkiniz yok.");
  }

  return mapBranch(data[0] as RawBranchRow);
}

/**
 * Şubeyi arşivler (kapatır).
 *
 * ⚠️ DELETE yoktur; arşiv deseni geçerlidir.
 * Dolu şube, son şube ve varsayılan şube veritabanı tetikleyicisi (`ORB03`)
 * tarafından engellenir.
 * Sıfır satır etkilendiğinde hata fırlatır (K-14).
 */
export async function archiveBranch(
  organizationId: string,
  branchId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("branches")
    .update({ archived_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("id", branchId)
    .is("archived_at", null)
    .select("id");

  if (error) {
    throw new Error(translateBranchError(error));
  }

  if (!data || data.length === 0) {
    throw new Error("Şube bulunamadı veya işlem yetkiniz yok.");
  }
}

/**
 * Arşivlenmiş bir şubeyi yeniden açar (geri yükler).
 *
 * Sıfır satır etkilendiğinde hata fırlatır (K-14).
 */
export async function restoreBranch(
  organizationId: string,
  branchId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("branches")
    .update({ archived_at: null })
    .eq("organization_id", organizationId)
    .eq("id", branchId)
    .not("archived_at", "is", null)
    .select("id");

  if (error) {
    throw new Error(translateBranchError(error));
  }

  if (!data || data.length === 0) {
    throw new Error("Şube bulunamadı veya işlem yetkiniz yok.");
  }
}

/**
 * Şube veritabanı ve RLS hatalarını Türkçe insan dostu mesajlara dönüştürür.
 *
 * 🔴 ORB03'ün üç halini ayırt eder:
 * 1. Şube dolu (öğrenci=X, sınıf=Y, üyelik=Z)
 * 2. Son şube (işlem sonrası kalacak aktif şube sayısı=0)
 * 3. Varsayılan şube (kapatılmak istenen şube kurumun varsayılan şubesi)
 * Ham detail basılmaz; sayılar okunur ve anlamlı bir cümle kurulur (K-23).
 */
export function translateBranchError(error: unknown): string {
  if (!error) {
    return "Beklenmeyen bir hata oluştu.";
  }

  let code: string | undefined;
  let message = "";
  let details: string | undefined;

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
    // R1: PostgREST PostgrestError formatında alan adı 'details'tir.
    // 'detail' geriye dönük tolerans olarak ikinci sırada tutulur.
    if (typeof errObj.details === "string") {
      details = errObj.details;
    } else if (typeof errObj.detail === "string") {
      details = errObj.detail;
    }
  }

  if (!code && message) {
    for (const known of ["ORB03", "23505", "23514", "42501"]) {
      if (message.includes(known)) {
        code = known;
        break;
      }
    }
  }

  if (code === "ORB03") {
    // Hal 1: Son şube kuralı (öncelik details; details boşsa ikincil çare message.includes)
    if (
      details?.includes("kalacak aktif şube sayısı=0") ||
      message.includes("son şubesi")
    ) {
      return "Kurumun son şubesi kapatılamaz. Kapatmadan önce başka bir şube açın.";
    }

    // Hal 2: Varsayılan şube kuralı (öncelik details; details boşsa ikincil çare message.includes)
    if (
      details?.includes("varsayılan şubesi") ||
      message.includes("Varsayılan şube")
    ) {
      return "Varsayılan şube kapatılamaz. Önce başka bir şubeyi varsayılan yapın, sonra bu şubeyi kapatın.";
    }

    // Hal 3: Şube dolu (aktif öğrenci, sınıf veya üyelik var)
    const ogrenciMatch = details?.match(/öğrenci=(\d+)/i);
    const sinifMatch = details?.match(/sınıf=(\d+)/i);
    const uyelikMatch = details?.match(/üyelik=(\d+)/i);

    const ogrenci = ogrenciMatch ? parseInt(ogrenciMatch[1], 10) : 0;
    const sinif = sinifMatch ? parseInt(sinifMatch[1], 10) : 0;
    const uyelik = uyelikMatch ? parseInt(uyelikMatch[1], 10) : 0;

    const parts: string[] = [];
    if (ogrenci > 0) parts.push(`${ogrenci} öğrenci`);
    if (sinif > 0) parts.push(`${sinif} sınıf`);
    if (uyelik > 0) parts.push(`${uyelik} üye`);

    if (parts.length > 0) {
      return `Bu şube kapatılamaz: içinde aktif ${parts.join(", ")} kaydı bulunuyor. Önce bu kayıtları başka bir şubeye taşıyın veya arşivleyin.`;
    }

    // R5: Tanınmayan ORB03 hatasında sebep uydurma (K-22). Yalan söylemeyen nötr cümle:
    return "Bu şube şu anda kapatılamıyor.";
  }

  if (code === "23505") {
    return "Bu isimde aktif bir şube zaten var. Lütfen farklı bir şube adı seçin.";
  }

  if (code === "23514") {
    return "Şube adı 2 ile 120 karakter arasında olmalıdır.";
  }

  if (code === "42501") {
    return "Bu işlem için kurum yöneticisi yetkisi gerekiyor.";
  }

  // R5: Ham Postgres mesajı arayüze basılmaz; güvenli genel hata mesajı dönülür.
  return "Şube işlemi gerçekleştirilemedi. Lütfen tekrar deneyin.";
}
