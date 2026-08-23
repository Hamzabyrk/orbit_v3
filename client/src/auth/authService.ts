import type { User } from "@supabase/supabase-js";
import type { EducationRole } from "@/components/educationAccess";
import { supabase } from "@/lib/supabaseClient";
import type {
  AuthIdentity,
  MembershipIdentity,
  PlatformOperatorIdentity,
} from "./types";

const educationRoles = new Set<EducationRole>([
  "admin",
  "teacher",
  "student",
  "parent",
]);

type MembershipRow = {
  id: string;
  organization_id: string;
  branch_id: string | null;
  role: string;
};

export function isEducationRole(value: string): value is EducationRole {
  return educationRoles.has(value as EducationRole);
}

function displayNameFromUser(user: User): string {
  const metadataName = user.user_metadata.full_name;

  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }

  return user.email?.split("@")[0] || "ORBIT Kullanıcısı";
}

/**
 * Kullanıcının aktif kurum üyeliğini çözer. Üyelik yoksa `null` döner; bu bir
 * hata değildir, platform operatörünün tasarım gereği üyeliği yoktur.
 */
async function loadMembershipIdentity(
  userId: string
): Promise<MembershipIdentity | null> {
  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("id, organization_id, branch_id, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<MembershipRow>();

  if (membershipError) {
    throw new Error("Kurum üyeliği doğrulanamadı. Lütfen tekrar deneyin.");
  }

  if (!membership) {
    return null;
  }

  // Rol veritabanından geliyor ama yine de doğrulanıyor: beklenmeyen bir değer
  // sessizce yetki gibi davranmamalı.
  if (!isEducationRole(membership.role)) {
    throw new Error("Kurum üyeliğindeki rol tanınmadı.");
  }

  const [organizationResult, branchResult] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, code")
      .eq("id", membership.organization_id)
      .single<{ name: string; code: number | null }>(),
    membership.branch_id
      ? supabase
          .from("branches")
          .select("id, name")
          .eq("id", membership.branch_id)
          .single<{ id: string; name: string }>()
      : supabase
          .from("branches")
          .select("id, name")
          .eq("organization_id", membership.organization_id)
          .eq("is_default", true)
          .is("archived_at", null)
          .maybeSingle<{ id: string; name: string }>(),
  ]);

  if (organizationResult.error || branchResult.error) {
    throw new Error("Kurum veya şube bilgisi güvenli şekilde yüklenemedi.");
  }

  return {
    membershipId: membership.id,
    role: membership.role,
    organizationId: membership.organization_id,
    organizationName: organizationResult.data.name,
    organizationCode: organizationResult.data.code,
    branchId: branchResult.data?.id ?? membership.branch_id,
    branchName: branchResult.data?.name ?? null,
  };
}

/**
 * Kullanıcının platform operatörlüğünü çözer. Operatör değilse `null` döner.
 *
 * Sorgu kullanıcının kendi oturumuyla yapılır; `platform_operators` üzerindeki
 * RLS, operatör olmayan birine hiçbir satır göstermez. Bu nedenle "operatör
 * değil" ile "satır yok" aynı sonuca varır ve ayrıcalıklı bir istemci
 * gerekmez.
 */
async function loadPlatformOperatorIdentity(
  userId: string
): Promise<PlatformOperatorIdentity | null> {
  const { data, error } = await supabase
    .from("platform_operators")
    .select("role")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle<{ role: "owner" | "operator" }>();

  if (error) {
    throw new Error("Platform yetkisi doğrulanamadı. Lütfen tekrar deneyin.");
  }

  return data ? { role: data.role } : null;
}

/**
 * Oturumu açık kullanıcının kimliğini çözer.
 *
 * İki eksen de sorgulanır ve ikisi birden boşsa hata fırlatılır. Yalnızca
 * üyeliğe bakılsaydı, tasarım gereği üyeliği olmayan platform operatörü giriş
 * yapar yapmaz oturumdan atılırdı.
 */
export async function loadAuthenticatedIdentity(
  user: User
): Promise<AuthIdentity> {
  const [membership, platformOperator] = await Promise.all([
    loadMembershipIdentity(user.id),
    loadPlatformOperatorIdentity(user.id),
  ]);

  if (!membership && !platformOperator) {
    throw new Error(
      "Bu hesap için aktif bir ORBIT kurum üyeliği veya platform yetkisi bulunamadı."
    );
  }

  const profileResult = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle<{ display_name: string }>();

  return {
    userId: user.id,
    displayName:
      profileResult.data?.display_name?.trim() || displayNameFromUser(user),
    demo: false,
    membership,
    platformOperator,
  };
}
