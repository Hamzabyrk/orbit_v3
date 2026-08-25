import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { z } from "npm:zod@4.1.12";

/**
 * Kurum yöneticisi, kendi kurumundaki bir üyeye yeni geçici şifre üretir.
 *
 * Kurtarma zincirinin kurum içi halkası. Platform operatörü yalnızca kurum
 * yöneticisinin şifresini sıfırlayabilir (`reset-admin-password`); öğretmen,
 * öğrenci ve velinin şifresi buradan sıfırlanır. Operatörün kurum kullanıcı
 * listesine erişimi **yoktur ve olmamalıdır** — bkz. `PROJECT_STATE.md`
 * bölüm 10, "operatör kapları yönetir, içeriği görmez".
 *
 * ⚠️ **Bu işlem E6'nın ön koşuludur.** 2026-08-25'ten bu yana süresi dolmuş
 * geçici şifre değiştirilerek kurtarılamıyor; kilidi yalnızca yeni bir geçici
 * şifre açar. E6 öğretmen/öğrenci/veli hesaplarını açtığında bu yol yoksa,
 * yedi gün içinde giriş yapmayan bir öğrenci kalıcı olarak kilitlenir.
 */

const requestSchema = z.object({
  membershipId: z.string().uuid(),
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

/**
 * Geçici şifrenin ömrü.
 *
 * ⚠️ Bu sabit `bootstrap-organization` ve `reset-admin-password` içinde de
 * ayrı ayrı tanımlı. Üçü **aynı kalmak zorunda**: kilidin süresi hesabın nasıl
 * açıldığına göre değişirse, aynı kuruma aynı gün verilen iki fişten biri
 * erken ölür ve sebebi kimseye görünmez.
 */
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
    "Cache-Control": "no-store",
  };

  if (origin && allowedOrigins.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] =
      "authorization, x-client-info, apikey, content-type";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Vary"] = "Origin";
  }

  return headers;
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string | null
): Response {
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

  let input: z.infer<typeof requestSchema>;
  try {
    input = requestSchema.parse(await request.json());
  } catch {
    return jsonResponse({ error: "invalid_input" }, 400, origin);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Yetki kararı SQL'de veriliyor, burada değil. Gerekçe migration'da:
  // `service_role` RLS'i baypas ettiği için bu sınırın hiçbir politikadan
  // geçmiyor, dolayısıyla test edilebilir bir yerde durmak zorunda.
  //
  // Bulunamayan üyelik, yetkisiz çağıran, kendi kaydı ve askıdaki üyelik —
  // dördü de BOŞ döner ve burada aynı yanıtı alır. Ayırt edilebilselerdi,
  // çağıran taraf rastgele kimlik deneyerek hangi üyeliklerin var olduğunu
  // öğrenebilirdi.
  const { data: resolved, error: resolveError } = await adminClient
    .rpc("internal_resolve_member_for_reset", {
      caller_user_id: userData.user.id,
      target_membership_id: input.membershipId,
    })
    .maybeSingle<{
      membership_id: string;
      member_user_id: string;
      organization_id: string;
      login_number: string;
      member_role: string;
    }>();

  if (resolveError) {
    console.error("[reset-member-password] authorization lookup failed");
    return jsonResponse({ error: "lookup_failed" }, 500, origin);
  }

  if (!resolved) {
    return jsonResponse({ error: "forbidden" }, 403, origin);
  }

  const temporaryPassword = generateTemporaryPassword();

  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    resolved.member_user_id,
    { password: temporaryPassword }
  );

  if (updateError) {
    console.error("[reset-member-password] password update failed");
    return jsonResponse({ error: "password_update_failed" }, 409, origin);
  }

  // Kilit bayrağı şifre değişiminden SONRA set ediliyor: `updateUserById`
  // şifreyi yazdığı için `on_auth_password_changed` tetikleyicisi çalışıyor.
  // Önce set etseydik tetikleyici onu hemen silerdi.
  const passwordExpiresAt = new Date(
    Date.now() + TEMPORARY_PASSWORD_TTL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error: lockError } = await adminClient
    .from("profiles")
    .update({
      must_change_password: true,
      password_expires_at: passwordExpiresAt,
    })
    .eq("id", resolved.member_user_id);

  if (lockError) {
    // Şifre zaten değişti. Bayrak yazılamadıysa kullanıcı yeni geçici
    // şifresiyle süresiz dolaşabilir; loglanıyor ve yanıtta bildiriliyor.
    console.error("[reset-member-password] password lock flag write failed");
  }

  // Denetim kaydı KURUMUN kaydına yazılır, platform eksenine değil: bu işlemi
  // yapan kurum yöneticisidir ve hesabını verecek olan da kurumun kendisidir.
  //
  // Yazılamazsa istek başarısız sayılmaz — şifre zaten değişti ve "değişmedi"
  // demek hem eski hem yeni şifreyi kullanılamaz kılardı. Sessiz de geçilmez;
  // yanıttaki `audit_written` bunu taşır.
  const { error: auditError } = await adminClient.from("audit_events").insert({
    organization_id: resolved.organization_id,
    actor_user_id: userData.user.id,
    action: "membership.password_reset",
    entity_type: "organization_membership",
    entity_id: resolved.membership_id,
    metadata: {
      // Giriş numarası kaydediliyor, geçici şifre KAYDEDİLMİYOR. Şifre
      // yalnızca bu yanıtta bir kez görünür.
      login_number: resolved.login_number,
      role: resolved.member_role,
    },
  });

  if (auditError) {
    console.error("[reset-member-password] audit write failed");
  }

  return jsonResponse(
    {
      data: {
        login_number: resolved.login_number,
        temporary_password: temporaryPassword,
        password_expires_at: passwordExpiresAt,
        password_lock_set: !lockError,
        audit_written: !auditError,
      },
    },
    200,
    origin
  );
});
