import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { z } from "npm:zod@4.1.12";

/**
 * Kurumu ve ona bağlı her şeyi siler. **Geri alınamaz.**
 *
 * İki katmanlı doğrulama var ve ikisi de bilinçli:
 *
 * 1. Çağıran platform operatörü olmalı.
 * 2. İstek, silinecek kurumun **adını birebir** taşımalı. Yalnızca kimlik
 *    gönderilseydi, listede yanlış satıra tıklamak sessizce yanlış kurumu
 *    silerdi. Ad eşleşmesi işlemin kazayla yapılmasını zorlaştırıyor.
 */

const requestSchema = z.object({
  organizationId: z.string().uuid(),
  confirmName: z.string().trim().min(1).max(120),
});

const allowedOrigins = new Set(
  (
    Deno.env.get("ALLOWED_ORIGINS") ??
    "http://localhost:5173,http://127.0.0.1:5173,https://orbit-v3-topaz.vercel.app"
  )
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
);

function responseHeaders(origin: string | null): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Vary: "Origin",
  };

  if (origin && allowedOrigins.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] =
      "authorization, content-type, x-client-info, apikey";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
  }

  return headers;
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string | null
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(origin),
  });
}

Deno.serve(async request => {
  const origin = request.headers.get("origin");

  if (origin && !allowedOrigins.has(origin)) {
    return jsonResponse({ error: "origin_not_allowed" }, 403, null);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: responseHeaders(origin),
    });
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

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: operator, error: operatorError } = await adminClient
    .from("platform_operators")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .eq("status", "active")
    .maybeSingle();

  if (operatorError) {
    console.error("[delete-organization] operator lookup failed");
    return jsonResponse({ error: "service_unavailable" }, 503, origin);
  }

  if (!operator) {
    return jsonResponse({ error: "forbidden" }, 403, origin);
  }

  let input: z.infer<typeof requestSchema>;
  try {
    input = requestSchema.parse(await request.json());
  } catch {
    return jsonResponse({ error: "invalid_request" }, 400, origin);
  }

  const { data: organization, error: organizationError } = await adminClient
    .from("organizations")
    .select("name")
    .eq("id", input.organizationId)
    .maybeSingle();

  if (organizationError || !organization) {
    return jsonResponse({ error: "organization_not_found" }, 404, origin);
  }

  // Ad eşleşmesi sunucuda da doğrulanıyor. Yalnızca istemcide kontrol etseydik,
  // doğrudan API çağrısı yapan biri onayı atlardı.
  if (organization.name.trim() !== input.confirmName.trim()) {
    return jsonResponse({ error: "confirmation_mismatch" }, 400, origin);
  }

  // Veritabanı tarafı tek işlemde çalışıyor: denetim kaydı yazılıyor, sonra
  // bağlı kayıtlar doğru sırada siliniyor. Sıra RESTRICT kısıtları yüzünden
  // zorunlu; ayrıntı migration dosyasında.
  const { data: result, error: deleteError } = await adminClient.rpc(
    "internal_delete_organization",
    {
      target_organization_id: input.organizationId,
      actor_user_id: userData.user.id,
    }
  );

  if (deleteError) {
    console.error("[delete-organization] delete failed");
    return jsonResponse({ error: "organization_delete_failed" }, 409, origin);
  }

  // Auth kullanıcıları en SONA bırakıldı. Önce silinselerdi ve veritabanı adımı
  // başarısız olsaydı, kurum üyesiz kalırdı — kimsenin giremediği bir kurum.
  // Bu sıradaki olası hata ise kuruma ait olmayan artık hesaplar bırakır; onlar
  // üyeliksiz oldukları için giriş yapsalar bile anında dışarı atılır.
  //
  // `member_user_ids` yalnızca kimliği başka hiçbir yerden talep edilmeyen
  // üyeleri içerir. Platform operatörlüğü veya başka bir kurumda üyeliği
  // olanlar `protected_user_ids` altında dönüyor ve auth hesaplarına
  // dokunulmuyor.
  //
  // Ayrım olmadığında, tek bir kuruma kapsamlanmış bu işlem küresel bir eylem
  // yapıyordu: kişinin kimliğini siliyordu. Operatörlük de `on delete cascade`
  // ile birlikte gidiyordu (Issue #63).
  const memberIds = ((result as { member_user_ids?: unknown } | null)
    ?.member_user_ids ?? []) as string[];
  const protectedIds = ((result as { protected_user_ids?: unknown } | null)
    ?.protected_user_ids ?? []) as string[];

  let orphaned = 0;

  for (const memberId of memberIds) {
    const { error } = await adminClient.auth.admin.deleteUser(memberId);
    if (error) {
      orphaned += 1;
      console.error("[delete-organization] user cleanup failed");
    }
  }

  return jsonResponse(
    {
      data: {
        ...(result as Record<string, unknown>),
        orphaned_users: orphaned,
        protected_identity_count: protectedIds.length,
      },
    },
    200,
    origin
  );
});
