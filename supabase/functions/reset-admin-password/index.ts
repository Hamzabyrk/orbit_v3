import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { z } from "npm:zod@4.1.12";

/**
 * Kurum yöneticisine yeni geçici şifre üretir.
 *
 * Kurtarma zincirinin son halkası: kurum yöneticisi şifresini kaybederse
 * başvuracağı yer platform operatörüdür. Bu işlem olmadan kayıp bir geçici
 * şifre kurumun tamamını erişilemez kılar — ilk denemede tam olarak bu yaşandı
 * ve tek çare yeni bir kurum açmak oldu.
 *
 * Yalnızca **kurum yöneticisini** hedefler. Öğretmen, öğrenci ve velinin
 * şifresini kurum yöneticisi kendi panelinden sıfırlar; operatörün kurum
 * kullanıcı listesine erişimi yoktur ve olmamalıdır.
 */

const requestSchema = z.object({
  organizationId: z.string().uuid(),
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

// Karışan karakterler yok: 0/O, 1/l/I. Şifre kâğıda yazılıp elden veriliyor.
const PASSWORD_LOWER = "abcdefghijkmnopqrstuvwxyz";
const PASSWORD_UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const PASSWORD_DIGIT = "23456789";
const PASSWORD_ALPHABET = PASSWORD_LOWER + PASSWORD_UPPER + PASSWORD_DIGIT;
const PASSWORD_LENGTH = 12;

/** Geçici şifrenin ömrü; kurum kurulumundaki değerle aynı olmak zorunda. */
const TEMPORARY_PASSWORD_TTL_DAYS = 7;

function generateTemporaryPassword(): string {
  const pick = (alphabet: string): string => {
    const limit = 256 - (256 % alphabet.length);
    const buffer = new Uint8Array(1);

    for (;;) {
      crypto.getRandomValues(buffer);
      if (buffer[0] < limit) {
        return alphabet[buffer[0] % alphabet.length];
      }
    }
  };

  const characters = [
    pick(PASSWORD_LOWER),
    pick(PASSWORD_UPPER),
    pick(PASSWORD_DIGIT),
  ];

  while (characters.length < PASSWORD_LENGTH) {
    characters.push(pick(PASSWORD_ALPHABET));
  }

  const randomIndices = new Uint32Array(characters.length);
  crypto.getRandomValues(randomIndices);

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapWith = randomIndices[index] % (index + 1);
    [characters[index], characters[swapWith]] = [
      characters[swapWith],
      characters[index],
    ];
  }

  return characters.join("");
}

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
    // Yetki kontrolü yapılamadıysa isteği geçirmek yerine reddediyoruz.
    console.error("[reset-admin-password] operator lookup failed");
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

  // En düşük `person_code`'a sahip aktif admin: kurumun kurucu yöneticisi.
  // Bir kurumda birden fazla admin olabilir; hangisinin sıfırlanacağı
  // belirsiz bırakılmamalı.
  const { data: membership, error: membershipError } = await adminClient
    .from("organization_memberships")
    .select("user_id, person_code, organization_id")
    .eq("organization_id", input.organizationId)
    .eq("role", "admin")
    .eq("status", "active")
    .order("person_code", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error("[reset-admin-password] membership lookup failed");
    return jsonResponse({ error: "service_unavailable" }, 503, origin);
  }

  if (!membership) {
    return jsonResponse({ error: "admin_not_found" }, 404, origin);
  }

  const { data: organization, error: organizationError } = await adminClient
    .from("organizations")
    .select("code, name")
    .eq("id", input.organizationId)
    .maybeSingle();

  if (organizationError || !organization) {
    return jsonResponse({ error: "organization_not_found" }, 404, origin);
  }

  const temporaryPassword = generateTemporaryPassword();

  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    membership.user_id,
    { password: temporaryPassword }
  );

  if (updateError) {
    console.error("[reset-admin-password] password update failed");
    return jsonResponse({ error: "password_update_failed" }, 409, origin);
  }

  // Kilit bayrağı şifre değişiminden SONRA set ediliyor: `updateUserById`
  // şifreyi yazdığı için `on_auth_password_changed` tetikleyicisi çalışıyor ve
  // bayrağı düşürüyor. Önce set etseydik tetikleyici onu hemen silerdi.
  const passwordExpiresAt = new Date(
    Date.now() + TEMPORARY_PASSWORD_TTL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error: lockError } = await adminClient
    .from("profiles")
    .update({
      must_change_password: true,
      password_expires_at: passwordExpiresAt,
    })
    .eq("id", membership.user_id);

  if (lockError) {
    // Şifre zaten değişti. Bayrak yazılamadıysa kullanıcı yeni geçici şifresiyle
    // süresiz dolaşabilir; loglanıyor ve yanıtta bildiriliyor.
    console.error("[reset-admin-password] password lock flag write failed");
  }

  // Operatörün kimlik bilgisi ürettiği kayda geçmek ZORUNDA. Bu, "operatör
  // yetki yükseltebilir ama gizlice yapamaz" taahhüdünün çalıştırılabilir
  // karşılığıdır; bkz. `.ai/PROJECT_STATE.md` bölüm 10.
  //
  // Şifrenin kendisi yazılmıyor — yalnızca işlemin olduğu.
  const { error: auditError } = await adminClient
    .from("platform_audit_events")
    .insert({
      actor_user_id: userData.user.id,
      action: "platform.admin_password_reset",
      entity_type: "organization_membership",
      entity_id: membership.user_id,
      organization_id: input.organizationId,
      metadata: {
        organization_name: organization.name,
        login_number: `${organization.code}${membership.person_code}`,
      },
    });

  if (auditError) {
    // Şifre bu noktada zaten değişti. Denetim yazılamadı diye hata dönmek,
    // operatöre "başarısız" gösterip aslında değişmiş bir şifre bırakırdı;
    // tekrar denerse eski şifre de yenisi de geçersiz olurdu.
    console.error("[reset-admin-password] audit write failed");
  }

  return jsonResponse(
    {
      data: {
        organization_code: organization.code,
        login_number: `${organization.code}${membership.person_code}`,
        temporary_password: temporaryPassword,
        password_expires_at: passwordExpiresAt,
        password_lock_set: !lockError,
      },
    },
    200,
    origin
  );
});
