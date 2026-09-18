import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkCspAllowsSupabase,
  checkCspSupabaseOriginsConsistent,
  extractCspFromVercelConfig,
  parseCspDirective,
} from "../../../client/src/lib/cspConnectSrc";

/**
 * CSP `connect-src` ile `VITE_SUPABASE_URL` ikizinin kapısı (v1.5-09, **K-19**).
 *
 * §4.15'in B5 bulgusu: `vercel.json` Supabase adresini **sabit yazıyor**,
 * uygulamanın gerçekte bağlandığı adres ise `VITE_SUPABASE_URL`'den geliyor ve
 * o değer Vercel'de duruyor. Aynı gerçeğin iki kaydı, ve derleyici ikisini
 * birlikte göremiyor. Ayrıştıklarında yayınlanan uygulama Supabase'e
 * **hiçbir** istek yapamaz: tarayıcı hepsini CSP ile keser, giriş ekranı
 * açılır ve çalışmaz.
 *
 * ## Bu dosya neyi ölçebilir, neyi ölçemez — açıkça
 *
 * 🔴 **Gerçek karşılaştırma burada yapılamaz** ve bu bir eksiklik değil,
 * dünyanın bir gerçeği: `VITE_SUPABASE_URL`'in gerçek değeri yalnız Vercel
 * derlemesinde var. CI yer tutucu ile derliyor
 * (`https://placeholder.supabase.co`), dolayısıyla gerçek değeri **hiç
 * göremez**. Asıl kapı bu yüzden `vite.config.ts`'te ve `VERCEL_ENV` varken
 * koşuyor — yani paketin gerçekten servis edileceği derlemede.
 *
 * Bu dosyanın işi, o kapının **ortam değişkenine ihtiyaç duymayan** her
 * parçasını sabitlemek:
 *
 *   1. **Mantık** — denetleyici yanlış eşleşmeyi gerçekten reddediyor mu
 *      (**K-23**: kapının kırmızıya döndüğü kanıtlanmalı)
 *   2. **Bağlantı** — `vite.config.ts` denetleyiciyi gerçekten çağırıyor mu.
 *      Bu iddia olmasa denetleyici silinmemiş ama çağrılmıyor hâle gelebilir
 *      ve yukarıdaki bütün iddialar yeşil kalırdı. Bu depoda tam olarak bu
 *      kusur yaşandı (`v1.5-07`: menü süzgeci vardı, kapı yoktu).
 *   3. **`vercel.json`'ın kendi tutarlılığı** — iki ayrı Supabase projesinin
 *      listelenmesi veya `https` ile `wss`'in ayrı projeleri göstermesi.
 *      Bunun için gerçek değere ihtiyaç yok.
 */

const depoKoku = path.resolve(import.meta.dirname, "..", "..", "..");
const vercelYolu = path.join(depoKoku, "vercel.json");
const viteConfigYolu = path.join(depoKoku, "vite.config.ts");

const vercelConfig = JSON.parse(readFileSync(vercelYolu, "utf8"));
const gercekCsp = extractCspFromVercelConfig(vercelConfig);

/** Sınama kurgusu: gerçek dosyanın biçimini taklit eden bir CSP. */
function kurguCsp(connectSrc: string): string {
  return `default-src 'self'; script-src 'self'; connect-src ${connectSrc}; frame-ancestors 'none'`;
}

describe("CSP connect-src ile VITE_SUPABASE_URL ikizi (v1.5-09 · B5)", () => {
  it("vercel.json'da bir Content-Security-Policy başlığı gerçekten var", () => {
    // Başlık v1.3-07'de eklendi. Kaldırılması bir güvenlik gerilemesi olur ve
    // aşağıdaki bütün iddialar sessizce anlamsızlaşırdı.
    expect(gercekCsp).toBeTruthy();
    expect(gercekCsp).toContain("connect-src");
  });

  it("gerçek vercel.json tek bir Supabase projesi gösteriyor", () => {
    // Ortam değişkeni GEREKMEYEN kapı. Yakaladığı kusur: yeni bir Supabase
    // projesine geçerken eskisini listeden silmemek — CSP o hâlde iki projeye
    // izin verir ve hangisinin doğru olduğu okunamaz.
    expect(checkCspSupabaseOriginsConsistent(gercekCsp!)).toBeNull();
  });

  it("🔴 gerçek derleme yapılandırması yanlış adreste HATA veriyor", async () => {
    // Kapının kapısı — ve **metin araması değil, kapının kendisi** koşuyor.
    //
    // İlk yazımda bu iddia `expect(config).toContain("checkCspAllowsSupabase")`
    // idi. Mutasyonla sınandı ve **yeşil kaldı**: çağrıyı kaldırmak yetiyordu,
    // çünkü ithalat satırı o dizgeyi zaten içeriyor. Yani iddia "kapı bağlı"
    // demiyordu, "kapının adı dosyada geçiyor" diyordu — bu dilimin
    // düzelttiği hatanın aynısı (K-23).
    //
    // Şimdi gerçek `vite.config.ts` fonksiyonu, gerçek `vercel.json`'a karşı,
    // kasten yanlış bir `VITE_SUPABASE_URL` ile çağrılıyor. Bu iddianın yeşil
    // geçmesinin tek yolu kapının gerçekten var olması ve gerçekten fırlatması.
    const oncekiler = {
      VERCEL_ENV: process.env.VERCEL_ENV,
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
    };

    try {
      process.env.VERCEL_ENV = "production";
      process.env.VITE_SUPABASE_URL = "https://yanlisproje.supabase.co";
      process.env.VITE_SUPABASE_ANON_KEY = "sb_publishable_sinama";

      const viteConfig = await import("../../../vite.config");
      const yapilandir = viteConfig.default as (arg: {
        mode: string;
        command: string;
      }) => unknown;

      expect(() =>
        yapilandir({ mode: "production", command: "build" })
      ).toThrow(/connect-src/);

      // Ve doğru adresle geçiyor: kapı her derlemeyi durdurmuyor.
      const gercekHost = parseCspDirective(gercekCsp!, "connect-src").find(
        k => k.startsWith("https://") && k.includes(".supabase.co")
      );
      process.env.VITE_SUPABASE_URL = gercekHost;

      expect(() =>
        yapilandir({ mode: "production", command: "build" })
      ).not.toThrow();
    } finally {
      for (const [ad, deger] of Object.entries(oncekiler)) {
        if (deger === undefined) delete process.env[ad];
        else process.env[ad] = deger;
      }
    }
  });

  it("kapı `VERCEL_ENV`'e bağlı, `deploymentEnvironment`'a değil", () => {
    // Ölçülmüş bir ayrım: CI `pnpm build` koşuyor ve `VERCEL_ENV` tanımsız
    // olduğu için `deploymentEnvironment` orada da "production" çözülüyor —
    // ama `VITE_SUPABASE_URL` yer tutucu. Kapı `deploymentEnvironment`'a
    // bağlansa CI yer tutucu yüzünden kırmızıya dönerdi.
    const config = readFileSync(viteConfigYolu, "utf8");
    expect(config).toContain("process.env.VERCEL_ENV");
  });

  it("eşleşen adres kabul ediliyor — kapı her şeyi reddetmiyor", () => {
    const csp = kurguCsp(
      "'self' https://abcdef.supabase.co wss://abcdef.supabase.co"
    );
    expect(
      checkCspAllowsSupabase(csp, "https://abcdef.supabase.co")
    ).toBeNull();
  });

  it("🔴 farklı bir proje adresi reddediliyor — B5'in kendisi", () => {
    // Supabase projesi değişti, Vercel ortam değişkeni güncellendi,
    // `vercel.json` unutuldu. Yayınlanan uygulama hiçbir istek yapamaz.
    const csp = kurguCsp(
      "'self' https://eskiproje.supabase.co wss://eskiproje.supabase.co"
    );
    const sorun = checkCspAllowsSupabase(csp, "https://yeniproje.supabase.co");

    expect(sorun).toContain("https://yeniproje.supabase.co");
    expect(sorun).toContain("wss://yeniproje.supabase.co");
  });

  it("🔴 yarım düzenleme reddediliyor: https güncellendi, wss unutuldu", () => {
    // Bu hâlin özelliği, tamamen bozulmamasıdır — sayfalar gelir, giriş
    // çalışır ve yalnız **canlı güncellemeler** sessizce ölür. Yani en zor
    // fark edilen hâl, ve tam olarak `v1.5-12`'nin konusu.
    const csp = kurguCsp(
      "'self' https://abcdef.supabase.co wss://eskiproje.supabase.co"
    );
    const sorun = checkCspAllowsSupabase(csp, "https://abcdef.supabase.co");

    expect(sorun).toContain("wss://abcdef.supabase.co");
    expect(sorun).not.toContain("https://abcdef.supabase.co,");
  });

  it("connect-src hiç yoksa reddediliyor (K-04)", () => {
    const csp = "default-src 'self'; script-src 'self'";
    expect(checkCspAllowsSupabase(csp, "https://abcdef.supabase.co")).toContain(
      "connect-src"
    );
  });

  it("çözümlenemeyen VITE_SUPABASE_URL reddediliyor (K-04)", () => {
    const csp = kurguCsp("'self' https://abcdef.supabase.co");

    // Boş, şemasız ve bozuk değerlerin üçü de sessizce geçmemeli: geçseydi
    // yanlış yapılandırılmış bir derleme kapıdan geçer ve kapı hiçbir şey
    // ölçmemiş olurdu.
    expect(checkCspAllowsSupabase(csp, "")).toContain("çözümlenemedi");
    expect(checkCspAllowsSupabase(csp, "abcdef.supabase.co")).toContain(
      "çözümlenemedi"
    );
  });

  it("tutarlılık kapısı iki projeyi ve ayrışan çifti reddediyor", () => {
    // İki https kaynağı: eski proje silinmemiş.
    expect(
      checkCspSupabaseOriginsConsistent(
        kurguCsp(
          "'self' https://a.supabase.co https://b.supabase.co wss://a.supabase.co"
        )
      )
    ).toContain("tam olarak bir");

    // wss hiç yok.
    expect(
      checkCspSupabaseOriginsConsistent(
        kurguCsp("'self' https://a.supabase.co")
      )
    ).toContain("wss");

    // https ve wss ayrı projeler.
    expect(
      checkCspSupabaseOriginsConsistent(
        kurguCsp("'self' https://a.supabase.co wss://b.supabase.co")
      )
    ).toContain("ayrı projeleri");
  });

  it("parseCspDirective direktifleri ayırıyor ve yanlış direktifi karıştırmıyor", () => {
    const csp =
      "default-src 'self'; connect-src 'self' https://a.test wss://a.test; img-src 'self' data:";

    expect(parseCspDirective(csp, "connect-src")).toEqual([
      "'self'",
      "https://a.test",
      "wss://a.test",
    ]);
    expect(parseCspDirective(csp, "img-src")).toEqual(["'self'", "data:"]);
    expect(parseCspDirective(csp, "font-src")).toEqual([]);
  });
});
