/**
 * Edge Function'ların ortak HTTP yüzeyi — origin listesi, CORS başlıkları,
 * JSON yanıtı.
 *
 * Dört fonksiyonun dördünde de birebir aynı kopya duruyordu ve `create-member`
 * beşincisini ekleyecekti. Origin listesi bir güvenlik sınırıdır; beş kopya
 * demek, birine eklenen bir adresin diğer dördünde eksik kalması ve bunun
 * yalnızca o fonksiyon çağrıldığında ortaya çıkması demektir. Bkz.
 * `AGENT_WORKFLOW.md` K-06.
 *
 * Birleştirme öncesi dört kopyanın da varsayılan listesi ve izin verilen
 * yöntemleri karşılaştırıldı; hepsi aynıydı, dolayısıyla bu taşıma hiçbir
 * fonksiyonun davranışını değiştirmiyor.
 */

/**
 * İzin verilen origin'ler.
 *
 * Ortam değişkeni yoksa geliştirme adresleri ve production alan adı kullanılır.
 * Liste **modül yüklenirken bir kez** kuruluyor; her istekte yeniden ayrıştırmak
 * boşuna iş olurdu ve ortam değişkeni çalışma sırasında zaten değişmiyor.
 */
const allowedOrigins = new Set(
  (
    Deno.env.get("ALLOWED_ORIGINS") ??
    "http://localhost:5173,http://127.0.0.1:5173,https://orbit-v3-topaz.vercel.app"
  )
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
);

/** Origin listede mi. Origin yoksa (aynı köken, curl) engellenmez. */
export function isAllowedOrigin(origin: string | null): boolean {
  return !origin || allowedOrigins.has(origin);
}

/**
 * Yanıt başlıkları.
 *
 * `Cache-Control: no-store` istisnasız: bu fonksiyonların yanıtları geçici
 * şifre taşıyabiliyor ve ara bir önbelleğe düşmesi onu kalıcı kılardı.
 *
 * CORS başlıkları yalnızca **tanınan** origin için yazılıyor. Tanınmayan bir
 * origin'e `Access-Control-Allow-Origin` dönmemek, tarayıcının yanıtı çağıran
 * sayfaya vermemesi demektir.
 */
export function responseHeaders(origin: string | null): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };

  if (origin && allowedOrigins.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    // `idempotency-key` v1.2-17'de eklendi ve **atlanamaz**: listede olmayan
    // bir özel başlık preflight'ta reddedilir ve istek hiç gönderilmez. Yani
    // eksikliği "idempotency çalışmaz" değil, "fonksiyon tarayıcıdan hiç
    // çağrılamaz" demek olurdu.
    headers["Access-Control-Allow-Headers"] =
      "authorization, x-client-info, apikey, content-type, idempotency-key";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Vary"] = "Origin";
  }

  return headers;
}

/** JSON gövdeli yanıt. Gövde her zaman `{ data }` veya `{ error }` taşır. */
export function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string | null
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(origin),
  });
}

/** CORS ön kontrolü (`OPTIONS`) yanıtı. */
export function preflightResponse(origin: string | null): Response {
  return new Response(null, { status: 204, headers: responseHeaders(origin) });
}
