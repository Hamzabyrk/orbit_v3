import type { User } from "@supabase/supabase-js";
import type { EducationRole } from "@/components/educationAccess";
import { supabase } from "@/lib/supabaseClient";
import type { AuthIdentity } from "./types";

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

export async function loadAuthenticatedIdentity(
  user: User
): Promise<AuthIdentity> {
  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("id, organization_id, branch_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<MembershipRow>();

  if (membershipError) {
    throw new Error("Kurum üyeliği doğrulanamadı. Lütfen tekrar deneyin.");
  }

  if (!membership || !isEducationRole(membership.role)) {
    throw new Error("Bu hesap için aktif bir ORBIT kurum üyeliği bulunamadı.");
  }

  const [profileResult, organizationResult, branchResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle<{ display_name: string }>(),
    supabase
      .from("organizations")
      .select("name")
      .eq("id", membership.organization_id)
      .single<{ name: string }>(),
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
    userId: user.id,
    membershipId: membership.id,
    role: membership.role,
    displayName:
      profileResult.data?.display_name?.trim() || displayNameFromUser(user),
    organizationId: membership.organization_id,
    organizationName: organizationResult.data.name,
    branchId: branchResult.data?.id ?? membership.branch_id,
    branchName: branchResult.data?.name ?? null,
    demo: false,
  };
}
