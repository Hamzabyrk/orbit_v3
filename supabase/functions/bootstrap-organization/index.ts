import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { z } from "npm:zod@4.1.12";

const requestSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  organizationSlug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  branchName: z.string().trim().min(2).max(120),
  adminEmail: z.string().trim().email().max(254),
  adminFullName: z.string().trim().min(2).max(120),
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

  const token = authorization.slice("Bearer ".length);
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } =
    await authClient.auth.getUser(token);

  if (userError || !userData.user) {
    return jsonResponse({ error: "forbidden" }, 403, origin);
  }

  // Operatörlük `platform_operators` tablosundan okunur, JWT'deki
  // `app_metadata.platform_admin` bayrağından değil. Aynı bilgiyi iki düzlemde
  // saklamak bu projede altı kez soruna yol açmış olan drift kalıbıdır; tek
  // doğruluk kaynağı tablodur (bkz. `.ai/DECISION_LOG.md` — "Platform
  // operatörü ayrı bir eksendir").
  //
  // Sorgu `service_role` ile yapılır. Kullanıcının kendi token'ıyla yapılsaydı
  // RLS devreye girer ve operatör olmayan biri için satır dönmezdi; sonuç aynı
  // olurdu ancak "operatör değil" ile "sorgu başarısız" ayrımı kaybolurdu.
  const operatorCheckClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: operator, error: operatorError } = await operatorCheckClient
    .from("platform_operators")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .eq("status", "active")
    .maybeSingle();

  if (operatorError) {
    // Yetki kontrolü yapılamadıysa isteği geçirmek yerine reddediyoruz.
    console.error("[bootstrap-organization] operator lookup failed");
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

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: invited, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(input.adminEmail, {
      data: { full_name: input.adminFullName },
    });

  if (inviteError || !invited.user) {
    return jsonResponse({ error: "admin_invite_failed" }, 409, origin);
  }

  const { data: bootstrap, error: bootstrapError } = await adminClient.rpc(
    "internal_bootstrap_organization",
    {
      organization_name: input.organizationName,
      organization_slug: input.organizationSlug,
      branch_name: input.branchName,
      admin_user_id: invited.user.id,
      actor_user_id: userData.user.id,
    }
  );

  if (bootstrapError) {
    const { error: cleanupError } = await adminClient.auth.admin.deleteUser(
      invited.user.id
    );
    if (cleanupError) {
      console.error("[bootstrap-organization] invited user cleanup failed");
    }
    return jsonResponse(
      { error: "organization_bootstrap_failed" },
      409,
      origin
    );
  }

  return jsonResponse({ data: bootstrap }, 201, origin);
});
