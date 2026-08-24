import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "build/**",
      "coverage/**",
      "node_modules/**",
      // Vendored shadcn/ui primitives — not hand-edited, out of scope for lint cleanup.
      "client/src/components/ui/**",
    ],
  },
  {
    files: ["client/src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      ...reactHooks.configs["recommended-latest"].rules,
      ...reactRefresh.configs.vite.rules,
    },
  },
  {
    // React context files legitimately co-export a Provider component and its
    // consumer hook (e.g. `useTheme`) from the same module — a standard
    // pattern that `only-export-components` isn't meant to flag.
    files: ["client/src/contexts/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // Sağlayıcı bağımsızlığı kuralı — bkz. `.ai/DECISION_LOG.md`,
    // "Taşınabilirlik sınırı".
    //
    // Ekran bileşenleri Supabase'i doğrudan çağıramaz; veri erişimi servis
    // katmanından (`auth/`, `platform/`, `lib/`, ileride `data/`) geçer.
    //
    // Bu kural taşınabilirliğin tek kaldıracıdır: kendi sunucumuza geçersek
    // yalnızca servis modüllerinin içi değişir, 15.000 satırlık arayüz
    // değişmez. Bileşenlerin içine sorgu serpilirse o kapı kapanır ve
    // kapandığı fark edilmez — bu yüzden yazılı kural yetmiyor, lint
    // zorluyor.
    //
    // Bir bileşenin gerçekten doğrudan erişmesi gerekiyorsa yapılacak şey
    // kuralı susturmak değil, o erişimi bir servis modülüne taşımaktır.
    files: ["client/src/components/**/*.{ts,tsx}", "client/src/pages/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@supabase/supabase-js",
              message:
                "Ekran bileşenleri Supabase istemcisini doğrudan kullanamaz. Veri erişimini bir servis modülüne taşıyın (bkz. .ai/DECISION_LOG.md — Taşınabilirlik sınırı).",
            },
          ],
          patterns: [
            {
              group: ["**/lib/supabaseClient", "@/lib/supabaseClient"],
              message:
                "Ekran bileşenleri Supabase istemcisini doğrudan kullanamaz. Veri erişimini bir servis modülüne taşıyın (bkz. .ai/DECISION_LOG.md — Taşınabilirlik sınırı).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["*.config.{ts,js}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  }
);
