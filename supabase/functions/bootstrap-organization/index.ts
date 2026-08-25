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
  adminFullName: z.string().trim().min(2).max(120),
});

/**
 * Sentetik adresin alan adı. RFC 2606 gereği `.invalid` hiçbir zaman
 * çözümlenmez. İstemcideki `loginIdentifier.ts` ile aynı değer olmak zorunda;
 * ikisi ayrışırsa oluşturulan hesaba giriş yapılamaz.
 */
const SYNTHETIC_EMAIL_DOMAIN = "orbit.invalid";

/** Yeni bir kurumun ilk kişisi. Veritabanı da aynı değeri hesaplar ve doğrular. */
const FIRST_PERSON_CODE = 1000;

/**
 * Geçici şifrenin ömrü. Dağıtılıp hiç kullanılmayan kâğıtlardaki şifreler
 * süresiz geçerli kalmamalı; bkz. `.ai/DECISION_LOG.md` — "Kimlik ve Giriş
 * Bilgisi Mimarisi".
 */
const TEMPORARY_PASSWORD_TTL_DAYS = 7;

/**
 * Geçici şifre alfabesi.
 *
 * Karışan karakterler bilinçli olarak yok: `0`/`O`, `1`/`l`/`I`. Şifre kâğıda
 * yazılıp elden veriliyor; okuyan kişi yanlış karakteri denerse hesabı
 * kilitlenmiş sanır ve destek çağrısı üretir.
 */
const PASSWORD_LOWER = "abcdefghijkmnopqrstuvwxyz";
const PASSWORD_UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const PASSWORD_DIGIT = "23456789";
const PASSWORD_ALPHABET = PASSWORD_LOWER + PASSWORD_UPPER + PASSWORD_DIGIT;
const PASSWORD_LENGTH = 12;

/**
 * Kişiye özel geçici şifre üretir.
 *
 * `crypto.getRandomValues` kullanılıyor; `Math.random` kriptografik değildir ve
 * üretilen şifreler tahmin edilebilir olurdu.
 *
 * Modulo sapması (`% alphabet.length`) burada önemsizdir: alfabe 59 karakter,
 * 256'nın 59'a bölümünden kalan küçük bir eğrilik yaratır ve 12 karakterlik bir
 * şifrede saldırgana kayda değer bir avantaj sağlamaz. Yine de eğriliği
 * tamamen kaldırmak ucuz olduğu için aralık dışındaki baytlar atılıyor.
 *
 * Şifre politikası küçük harf, büyük harf ve rakamın üçünü de istiyor; rastgele
 * seçim üçünü de içermeyebileceği için ilk üç karakter her sınıftan birer tane
 * olacak şekilde garanti ediliyor, sonra tamamı karıştırılıyor.
 */
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

  // Fisher-Yates. Garanti edilen üç karakter hep baştaki üç konumda kalmasın;
  // aksi halde şifrenin ilk üç hanesinin karakter sınıfı önceden bilinirdi.
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

  // Sıra zorunlu: sentetik adres kurum kodunu içeriyor, dolayısıyla kod
  // kullanıcıdan önce; kullanıcı ise üyeliğin foreign key'i olduğu için
  // kurumdan önce yaratılmak zorunda. Kod bu yüzden ayrı ayrılıyor.
  const { data: reservedCode, error: reserveError } = await adminClient.rpc(
    "internal_reserve_organization_code"
  );

  if (reserveError || typeof reservedCode !== "number") {
    console.error("[bootstrap-organization] code reservation failed");
    return jsonResponse({ error: "service_unavailable" }, 503, origin);
  }

  const loginNumber = `${reservedCode}${FIRST_PERSON_CODE}`;
  const syntheticEmail = `${loginNumber}@${SYNTHETIC_EMAIL_DOMAIN}`;
  const temporaryPassword = generateTemporaryPassword();

  // `inviteUserByEmail` DEĞİL. Davet, teslim edilemez `.invalid` adresini
  // reddeder; kabul etse bile kullanıcı şifresini belirlemeden panele düşer.
  // `email_confirm: true` çünkü doğrulanacak bir kutu yok — adres zaten
  // yalnızca kimlik belirteci.
  const { data: created, error: createError } =
    await adminClient.auth.admin.createUser({
      email: syntheticEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: input.adminFullName },
    });

  if (createError || !created.user) {
    console.error("[bootstrap-organization] admin user creation failed");
    return jsonResponse({ error: "admin_create_failed" }, 409, origin);
  }

  const { data: bootstrap, error: bootstrapError } = await adminClient.rpc(
    "internal_bootstrap_organization",
    {
      organization_name: input.organizationName,
      organization_slug: input.organizationSlug,
      organization_code: reservedCode,
      branch_name: input.branchName,
      admin_user_id: created.user.id,
      admin_person_code: FIRST_PERSON_CODE,
      actor_user_id: userData.user.id,
    }
  );

  if (bootstrapError) {
    // Kurum kurulamadıysa yaratılan kullanıcı ortada kalmamalı: kimseye ait
    // olmayan, hiçbir kuruma bağlı olmayan bir hesap giriş yapabilir ve
    // kimlik çözümlemesinde hataya düşer.
    const { error: cleanupError } = await adminClient.auth.admin.deleteUser(
      created.user.id
    );
    if (cleanupError) {
      console.error("[bootstrap-organization] user cleanup failed");
    }
    return jsonResponse(
      { error: "organization_bootstrap_failed" },
      409,
      origin
    );
  }

  // Kilit bayrağı kullanıcı oluşturulduktan SONRA set ediliyor.
  //
  // `admin.createUser` şifreyi yazdığı için `on_auth_password_changed`
  // tetikleyicisi çalışır ve bayrağı düşürür. Bayrağı önce set etseydik
  // tetikleyici onu hemen silerdi ve kilit hiç devreye girmezdi.
  const passwordExpiresAt = new Date(
    Date.now() + TEMPORARY_PASSWORD_TTL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error: lockError } = await adminClient
    .from("profiles")
    .update({
      must_change_password: true,
      password_expires_at: passwordExpiresAt,
    })
    .eq("id", created.user.id);

  if (lockError) {
    // Kurum ve kullanıcı bu noktada oluştu. Bayrak yazılamadıysa kilit devreye
    // girmez — kullanıcı geçici şifresiyle süresiz dolaşabilir. Sessiz
    // geçilemez, ama isteği başarısız saymak da doğru değil: kurum var ve
    // giriş bilgisi operatörün ekranında bir kez görünecek. Loglanıyor ve
    // yanıtta bildiriliyor.
    console.error("[bootstrap-organization] password lock flag write failed");
  }

  // `internal_bootstrap_organization` denetim kaydını `audit_events`'e yazar,
  // yani KURUMUN kaydına. Operatör o tabloyu okuyamaz (policy kurum admini
  // istiyor) ve okuyabilmesi de doğru olmaz. Platform ekseninin kaydı ayrıdır;
  // panelin denetim listesi bu satırdan besleniyor. Yazılmazsa panel kurum
  // oluşturmayı hiç görmez.
  const organizationId = (bootstrap as { organization_id?: string } | null)
    ?.organization_id;

  const { error: auditError } = await adminClient
    .from("platform_audit_events")
    .insert({
      actor_user_id: userData.user.id,
      action: "platform.organization_created",
      entity_type: "organization",
      entity_id: organizationId ?? null,
      organization_id: organizationId ?? null,
      metadata: {
        organization_name: input.organizationName,
        organization_slug: input.organizationSlug,
        branch_name: input.branchName,
        admin_full_name: input.adminFullName,
        // Giriş numarası kaydediliyor, geçici şifre KAYDEDİLMİYOR. Şifre
        // yalnızca bu yanıtta bir kez görünür ve hiçbir yere yazılmaz.
        // Denetim kaydının amacı "operatör kimlik bilgisi üretti" olgusunu
        // görünür kılmak; şifrenin kendisini saklamak değil.
        login_number: (bootstrap as { login_number?: string } | null)
          ?.login_number,
      },
    });

  // Kurum bu noktada zaten oluştu. Denetim kaydı yazılamadı diye isteği
  // başarısız saymak, var olan bir kurumu "oluşmadı" göstermek olurdu; çağıran
  // taraf tekrar denerse slug çakışmasıyla karşılaşır. Hata loglanır, istek
  // başarılı döner.
  if (auditError) {
    console.error("[bootstrap-organization] platform audit write failed");
  }

  // Geçici şifre yanıtta BİR KEZ dönüyor ve hiçbir yere yazılmıyor. Operatör
  // ekranda görür, kuruma teslim eder; kaybolursa yenisi üretilir. Düz metin
  // şifre saklamak KVKK açısından savunulamaz ve gereksizdir.
  return jsonResponse(
    {
      data: {
        ...(bootstrap as Record<string, unknown>),
        temporary_password: temporaryPassword,
        password_expires_at: passwordExpiresAt,
        password_lock_set: !lockError,
      },
    },
    201,
    origin
  );
});
