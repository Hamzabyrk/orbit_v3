import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import {
  isDemoEnvironment,
  resolveDeploymentEnvironment,
} from "./client/src/auth/deploymentEnvironment";

const plugins = [react(), tailwindcss(), jsxLocPlugin()];

export default defineConfig(({ mode }) => {
  const localEnv = loadEnv(mode, import.meta.dirname, "VITE_");

  // Ortam kararı BURADA, bir kez veriliyor ve define olarak gömülüyor.
  // Çalışma zamanında yeniden çözülseydi Rollup `isDemoMode`'u katlayamaz ve
  // demo verisi üretim paketinde kalırdı (#144). Aynı mantığın iki yerde
  // yazılmaması için `resolveDeploymentEnvironment` ortak modülden geliyor —
  // K-06.
  const deploymentEnvironment = resolveDeploymentEnvironment(
    process.env.VERCEL_ENV ?? localEnv.VITE_DEPLOYMENT_ENV,
    mode !== "production"
  );

  return {
    plugins,
    define: {
      __ORBIT_DEPLOYMENT_ENV__: JSON.stringify(deploymentEnvironment),
      __ORBIT_DEMO_MODE__: JSON.stringify(
        isDemoEnvironment(deploymentEnvironment)
      ),
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    envDir: path.resolve(import.meta.dirname),
    root: path.resolve(import.meta.dirname, "client"),
    publicDir: path.resolve(import.meta.dirname, "client", "public"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
    },
    server: {
      host: true,
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
