import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Derleyicinin göremediği iki ikiz (v1.5-09 · §4.15 B6, **K-19**).
 *
 * Bu depoda aynı gerçeğin iki ayrı dosyada yazıldığı yerler var ve TypeScript
 * ikisini birlikte göremez — biri `.tsx`, diğeri `.json`; ya da biri istemci,
 * diğeri Deno tarafı. Ayrıştıklarında derleme geçer, testler geçer, ürün
 * bozulur.
 *
 * `AGENTS.md` bu ikizleri sayıyordu ama **hiçbirinin kapısı yoktu**. Bu dosya
 * ikisini kapıya bağlıyor. Üçüncüsü (CSP ↔ `VITE_SUPABASE_URL`) ayrı bir
 * dosyada, çünkü orada gerçek karşılaştırma ortam değişkeni gerektiriyor:
 * `cspMatchesSupabaseUrl.test.ts`.
 *
 * ## 1 · `App.tsx` rotaları ↔ `vercel.json` rewrites
 *
 * `vercel.json` eskiden her yolu (`/(.*)`) `index.html`'e yönlendiriyordu.
 * SPA'larda yaygın olan bu kalıp, olmayan bir sayfaya da `HTTP 200`
 * döndürüyordu — `/olmayan-sayfa` ve hatta `/robots.txt` dahil (#146). Liste
 * bu yüzden açıkça yazıldı, ve bedeli bu ikizlik oldu: yeni bir rota eklenip
 * rewrite eklenmezse rota **yalnız uygulama içi gezinmede** çalışır, adres
 * çubuğuna yazıldığında Vercel 404 verir. `App.tsx`'in kendi yorumu bu tuzağı
 * anlatıyor — ama anlatmak kapı değildir (**K-24**).
 *
 * ## 2 · Sentetik e-posta alanı
 *
 * Girişte kullanıcı e-posta değil **giriş numarası** yazıyor; numara
 * `<numara>@orbit.invalid` biçimine çevrilip Supabase Auth'a veriliyor. Alan
 * adı **iki yerde** tanımlı: istemcide (`loginIdentifier.ts`) ve Edge Function
 * tarafında (`syntheticEmail.ts`). İkisi ayrışırsa istemcinin ürettiği adres
 * ile sunucunun beklediği adres farklı olur ve **bütün girişler kırılır** —
 * tek bir kullanıcı için değil, herkes için.
 *
 * İki dosyanın tek dosyaya indirilememesinin sebebi teknik: Edge Function'lar
 * Deno çalışma ortamında koşuyor ve istemci modüllerini import edemiyor. Yani
 * ikizlik kaçınılmaz; kapısı olmaması değildi.
 */

const depoKoku = path.resolve(import.meta.dirname, "..", "..", "..");

const appTsx = readFileSync(
  path.join(depoKoku, "client", "src", "App.tsx"),
  "utf8"
);
const vercelConfig = JSON.parse(
  readFileSync(path.join(depoKoku, "vercel.json"), "utf8")
) as { rewrites?: { source?: string; destination?: string }[] };

/** `<Route path="/…">` girdilerinden yol adlarını çıkarır. */
function appRotalari(): string[] {
  const bulunan = appTsx.matchAll(/<Route\s+path="\/([^"]*)"/g);
  return [...bulunan].map(m => m[1]);
}

/** `/(a|b|c)` biçimindeki rewrite kaynağından adları çıkarır. */
function rewriteYollari(): string[] {
  const kaynaklar = (vercelConfig.rewrites ?? [])
    .map(k => k.source ?? "")
    .filter(k => k.includes("|") || k.length > 1);

  const cikan: string[] = [];
  for (const kaynak of kaynaklar) {
    const grup = kaynak.match(/^\/\(([^)]+)\)$/);
    if (grup) {
      cikan.push(...grup[1].split("|"));
      continue;
    }
    cikan.push(kaynak.replace(/^\//, ""));
  }
  return cikan;
}

describe("derleyicinin göremediği ikizler (v1.5-09 · B6)", () => {
  it("rota listesi ve rewrite listesi okunabildi", () => {
    // Bu iddia aşağıdakilerin anlamlı olmasını sağlıyor: ayrıştırma bir gün
    // bozulursa (rota yazımı değişir, rewrite biçimi değişir) burası düşer ve
    // sonraki iki iddia sessizce "iki boş liste eşit" demekle kalmaz.
    expect(appRotalari().length).toBeGreaterThanOrEqual(5);
    expect(rewriteYollari().length).toBeGreaterThanOrEqual(4);
  });

  it("🔴 App.tsx'teki her rota vercel.json rewrites'ında var", () => {
    // Atlanırsa: rota uygulama içi gezinmede çalışır, adres çubuğuna
    // yazıldığında Vercel 404 verir. Paylaşılan her derin bağlantı bozuk olur.
    const rewrites = rewriteYollari();

    // Kök (`/`) hariç: onu Vercel zaten `index.html` olarak servis ediyor,
    // rewrite'a ihtiyacı yok.
    const eksikler = appRotalari()
      .filter(yol => yol !== "")
      .filter(yol => !rewrites.includes(yol));

    expect(eksikler).toEqual([]);
  });

  it("🔴 rewrites'taki her yolun App.tsx'te bir rotası var", () => {
    // Ters yön ve o da gerçek bir kusur: rotası kaldırılmış bir yol
    // rewrite'ta kalırsa Vercel onu `index.html`'e yönlendirir, uygulama
    // içindeki catch-all `NotFound` çizer — yani kullanıcı `HTTP 200` alıp
    // "bulunamadı" okur. #146'nın kapatmak istediği şey tam olarak buydu.
    const rotalar = appRotalari();
    const fazlalar = rewriteYollari().filter(yol => !rotalar.includes(yol));

    expect(fazlalar).toEqual([]);
  });

  it("🔴 sentetik e-posta alanı istemci ve Edge Function tarafında aynı", () => {
    // Ayrışırsa BÜTÜN girişler kırılır: istemci `<numara>@yeni.invalid`
    // üretir, sunucu `<numara>@orbit.invalid` bekler.
    const desen = /SYNTHETIC_EMAIL_DOMAIN\s*=\s*"([^"]+)"/;

    const istemci = readFileSync(
      path.join(depoKoku, "client", "src", "auth", "loginIdentifier.ts"),
      "utf8"
    ).match(desen);
    const edge = readFileSync(
      path.join(
        depoKoku,
        "supabase",
        "functions",
        "_shared",
        "syntheticEmail.ts"
      ),
      "utf8"
    ).match(desen);

    // Önce ikisinin de gerçekten bulunduğu: bulunamazsa `undefined === undefined`
    // yeşil geçerdi ve kapı hiçbir şey ölçmemiş olurdu (K-04).
    expect(istemci?.[1]).toBeTruthy();
    expect(edge?.[1]).toBeTruthy();

    expect(istemci?.[1]).toBe(edge?.[1]);
  });
});
