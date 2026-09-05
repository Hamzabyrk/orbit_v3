import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: [
      "client/src/**/*.test.ts",
      "client/src/**/*.spec.ts",
      // Depo yapısını ölçen testler. İstemci kodu değiller ama `pnpm test`
      // içinde koşmaları gerekiyor: `quality-gate` dal korumasında zorunlu bir
      // kontrol ve kapının bu tarafta olması, kuralın ayrı bir CI işi olarak
      // eklenmeyi beklemeden yürürlüğe girmesi demek (**K-19**).
      "supabase/tests/deployment/**/*.test.ts",
    ],
  },
});
