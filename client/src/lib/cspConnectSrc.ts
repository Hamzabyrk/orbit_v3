/**
 * CSP `connect-src` ile `VITE_SUPABASE_URL` arasındaki ikizlik (v1.5-09).
 *
 * `vercel.json`'daki `Content-Security-Policy` başlığı, uygulamanın hangi
 * adreslere ağ isteği yapabileceğini **tarayıcıya** söyler. Supabase adresi
 * orada **sabit yazılı**. Ama uygulamanın gerçekte bağlandığı adres
 * `VITE_SUPABASE_URL` ortam değişkeninden geliyor ve o değer Vercel'de duruyor.
 *
 * Yani aynı gerçeğin iki kaydı var ve **derleyici ikisini birlikte göremez**:
 * biri JSON dosyası, diğeri ortam değişkeni. Ayrıştıklarında sonuç sessiz
 * değil ama çok geç — yayınlanan uygulama Supabase'e **hiçbir** istek
 * yapamaz, tarayıcı hepsini CSP ile keser. Giriş ekranı açılır ve çalışmaz.
 *
 * `AGENTS.md` kısıt 6 bu ikizi zaten yasaklıyordu; eksik olan kapıydı.
 *
 * ## Bu modül neden ayrı bir dosyada
 *
 * `vite.config.ts` Node tarafında çalışır ve `import.meta.env`'e dokunan
 * hiçbir modülü import edemez — `deploymentEnvironment.ts` tam bu yüzden ayrı
 * bir dosyada duruyor ve buradaki sebep aynı.
 *
 * Ama daha önemli bir sebep var: **gerçek karşılaştırma yalnız Vercel
 * derlemesinde yapılabilir**, çünkü `VITE_SUPABASE_URL`'in gerçek değeri
 * yalnız orada var. CI yer tutucu ile derliyor ve gerçek değeri **hiç
 * göremez** (§4.15'in bulgusu). Mantık ayrı bir dosyada durursa, CI gerçek
 * değeri göremese de **mantığı** sınayabilir: `checkCspAllowsSupabase` birim
 * testiyle kapıya bağlanıyor, `checkCspSupabaseOriginsConsistent` ise
 * `vercel.json`'ı tek başına — ortam değişkenine hiç ihtiyaç duymadan —
 * ölçüyor.
 */

/** CSP metninden bir direktifin kaynak listesini çıkarır. */
export function parseCspDirective(csp: string, directive: string): string[] {
  for (const parca of csp.split(";")) {
    const tokenlar = parca.trim().split(/\s+/).filter(Boolean);
    if (tokenlar.length === 0) continue;
    if (tokenlar[0].toLowerCase() !== directive.toLowerCase()) continue;
    return tokenlar.slice(1);
  }
  return [];
}

/**
 * `VITE_SUPABASE_URL`'in kaynağı (origin) CSP'de izinli mi.
 *
 * Hata varsa **sebebi anlatan bir cümle**, yoksa `null` döner. Cümle
 * döndürmesinin sebebi: bu kapı bir derlemeyi durdurduğunda, durduran kişi
 * genellikle Supabase projesini yeni değiştirmiş biri olacak ve ona ne
 * yapması gerektiğini söylemek zorundayız.
 *
 * İki kaynak da ayrı ayrı aranıyor:
 *
 *   - `https://<host>` — REST ve Auth çağrıları
 *   - `wss://<host>` — Realtime. Yarım düzenlemenin yakalandığı yer burası:
 *     `https` güncellenip `wss` unutulursa uygulama açılır, sayfalar gelir ve
 *     yalnız canlı güncellemeler sessizce ölür (`v1.5-12`'nin konusu).
 */
export function checkCspAllowsSupabase(
  csp: string,
  supabaseUrl: string
): string | null {
  let host: string;
  try {
    const parsed = new URL(supabaseUrl);
    host = parsed.host;
    if (!host) throw new Error("host yok");
  } catch {
    return `VITE_SUPABASE_URL çözümlenemedi: ${JSON.stringify(supabaseUrl)}`;
  }

  const kaynaklar = parseCspDirective(csp, "connect-src");
  if (kaynaklar.length === 0) {
    return "vercel.json içindeki Content-Security-Policy başlığında `connect-src` direktifi yok.";
  }

  const eksikler = [`https://${host}`, `wss://${host}`].filter(
    beklenen => !kaynaklar.includes(beklenen)
  );

  if (eksikler.length > 0) {
    return (
      `vercel.json'daki CSP \`connect-src\` şu kaynakları içermiyor: ${eksikler.join(", ")}. ` +
      `VITE_SUPABASE_URL=${supabaseUrl} olduğu için uygulama o adrese istek yapacak ve tarayıcı ` +
      `bu istekleri kesecek — yayınlanan uygulama açılır ama Supabase'e ulaşamaz. ` +
      `vercel.json'daki \`connect-src\` listesini güncelleyin (AGENTS.md kısıt 6).`
    );
  }

  return null;
}

/**
 * `vercel.json` tek başına tutarlı mı — ortam değişkeni gerekmez.
 *
 * Gerçek değeri göremeyen CI'ın ölçebildiği kısım bu, ve gerçek bir kusuru
 * yakalıyor: `connect-src`'de **birden fazla** Supabase projesi listelenmesi
 * ya da `https` ile `wss` kaynaklarının **farklı** projeleri göstermesi.
 * İkisi de "yeni projeye geçerken eskisini silmeyi unutmak" hâli.
 */
export function checkCspSupabaseOriginsConsistent(csp: string): string | null {
  const kaynaklar = parseCspDirective(csp, "connect-src");

  const httpsHostlar = [
    ...new Set(
      kaynaklar
        .filter(k => k.startsWith("https://") && k.includes(".supabase.co"))
        .map(k => k.slice("https://".length))
    ),
  ];
  const wssHostlar = [
    ...new Set(
      kaynaklar
        .filter(k => k.startsWith("wss://") && k.includes(".supabase.co"))
        .map(k => k.slice("wss://".length))
    ),
  ];

  if (httpsHostlar.length !== 1) {
    return `connect-src içinde tam olarak bir \`https://…supabase.co\` kaynağı olmalı, ${httpsHostlar.length} tane var: ${httpsHostlar.join(", ") || "(yok)"}`;
  }
  if (wssHostlar.length !== 1) {
    return `connect-src içinde tam olarak bir \`wss://…supabase.co\` kaynağı olmalı, ${wssHostlar.length} tane var: ${wssHostlar.join(", ") || "(yok)"}`;
  }
  if (httpsHostlar[0] !== wssHostlar[0]) {
    return `connect-src'deki \`https\` ve \`wss\` kaynakları ayrı projeleri gösteriyor: ${httpsHostlar[0]} ≠ ${wssHostlar[0]}`;
  }

  return null;
}

/** `vercel.json`'ın okunmuş hâlinden CSP başlığının değerini çıkarır. */
export function extractCspFromVercelConfig(
  vercelConfig: unknown
): string | null {
  const kok = vercelConfig as {
    headers?: { headers?: { key?: string; value?: string }[] }[];
  };

  for (const kural of kok?.headers ?? []) {
    for (const baslik of kural?.headers ?? []) {
      if (baslik?.key?.toLowerCase() === "content-security-policy") {
        return baslik.value ?? null;
      }
    }
  }

  return null;
}
