import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { z } from "npm:zod@4.1.12";
import {
  isAllowedOrigin,
  jsonResponse,
  preflightResponse,
} from "../_shared/http.ts";
import {
  generateTemporaryPassword,
  temporaryPasswordExpiresAt,
} from "../_shared/temporaryPassword.ts";
import { syntheticEmailFor } from "../_shared/syntheticEmail.ts";

/**
 * Üye oluşturma akışı bilinçli olarak auth kullanıcısını önce yaratır: giriş
 * numarası sentetik adresin parçasıdır, person_code ise veritabanı tarafından
 * tahsis edilir. Üyelik RPC'si auth kullanıcısı yaratıldıktan sonra çağrılır.
 *
 * Yetki kararı SQL fonksiyonlarındadır; service_role RLS'i baypas ettiği için
 * istemci tarafındaki veya bu dosyadaki kontroller güvenlik sınırı değildir.
 * Üye oluşturma denetim kaydı RPC'nin aynı işleminde yazıldığı için başarılı
 * RPC yanıtında audit_written sabit olarak true'dur. Kilit bayrağı ise
 * createUser'dan sonra yazılır; auth şifresi yazılırken çalışan tetikleyici
 * bayrağı düşürdüğü için sıra zorunludur.
 */
const requestSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  role: z.enum(["teacher", "student", "parent"]),
  branchId: z.string().uuid().nullable().optional(),
});

Deno.serve(async request => {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return jsonResponse({ error: "origin_not_allowed" }, 403, null);
  }
  if (request.method === "OPTIONS") {
    return preflightResponse(origin);
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "service_unavailable" }, 503, origin);
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse({ error: "unauthorized" }, 401, origin);
  }
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(
    authorization.slice("Bearer ".length)
  );
  if (userError || !userData.user) {
    return jsonResponse({ error: "forbidden" }, 403, origin);
  }

  let input: z.infer<typeof requestSchema>;
  try {
    input = requestSchema.parse(await request.json());
  } catch {
    return jsonResponse({ error: "invalid_input" }, 400, origin);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: slot, error: slotError } = await adminClient
    .rpc("internal_allocate_member_slot", {
      caller_user_id: userData.user.id,
      target_branch_id: input.branchId ?? null,
    })
    .maybeSingle<{
      organization_id: string;
      organization_code: number;
      person_code: number;
    }>();
  if (slotError) {
    console.error("[create-member] slot allocation failed");
    return jsonResponse({ error: "service_unavailable" }, 503, origin);
  }
  if (!slot) {
    return jsonResponse({ error: "forbidden" }, 403, origin);
  }

  const loginNumber = `${slot.organization_code}${slot.person_code}`;
  const temporaryPassword = generateTemporaryPassword();
  const passwordExpiresAt = temporaryPasswordExpiresAt();
  const { data: created, error: createError } =
    await adminClient.auth.admin.createUser({
      email: syntheticEmailFor(loginNumber),
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: input.fullName.trim() },
    });
  if (createError || !created.user) {
    console.error("[create-member] auth user creation failed");
    return jsonResponse({ error: "member_create_failed" }, 409, origin);
  }

  const { data: membershipId, error: membershipError } = await adminClient.rpc(
    "internal_create_membership",
    {
      caller_user_id: userData.user.id,
      member_user_id: created.user.id,
      organization_id: slot.organization_id,
      branch_id: input.branchId ?? null,
      person_code: slot.person_code,
      member_role: input.role,
      member_full_name: input.fullName.trim(),
      login_number: loginNumber,
    }
  );
  if (membershipError || typeof membershipId !== "string") {
    const { error: cleanupError } = await adminClient.auth.admin.deleteUser(
      created.user.id
    );
    if (cleanupError) {
      console.error("[create-member] auth user cleanup failed");
    }
    console.error("[create-member] membership creation failed");
    return jsonResponse({ error: "member_create_failed" }, 409, origin);
  }

  const { error: lockError } = await adminClient
    .from("profiles")
    .update({
      must_change_password: true,
      password_expires_at: passwordExpiresAt,
    })
    .eq("id", created.user.id);
  if (lockError) {
    console.error("[create-member] password lock flag write failed");
  }

  return jsonResponse(
    {
      data: {
        login_number: loginNumber,
        temporary_password: temporaryPassword,
        password_expires_at: passwordExpiresAt,
        password_lock_set: !lockError,
        audit_written: true,
      },
    },
    201,
    origin
  );
});
