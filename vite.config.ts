import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import {
  isDemoEnvironment,
  resolveDeploymentEnvironment,
} from "./client/src/auth/deploymentEnvironment";

export default defineConfig(({ mode }) => {
  const localEnv = loadEnv(mode, import.meta.dirname, "VITE_");

  // `jsxLocPlugin` her JSX öğesine kaynak dosya yolunu ve satır numarasını
  // `data-loc` niteliği olarak ekliyor. Geliştirmede bir öğenin hangi dosyadan
  // geldiğini görmek için değerli; üretimde karşılığı yok.
  //
  // Eklenti eskiden KOŞULSUZ ekleniyordu çünkü `plugins` dizisi
  // `defineConfig`'in dışında, `mode`'a erişimin olmadığı yerde tanımlıydı.
  // Bedeli ölçüldü (2026-09-09 kapanış taraması): üretim paketinde **1436**
  // `data-loc` niteliği, **106 kB** — 990 kB'lik paketin ~%10'u. Ayrıca
  // `client\src\componentsuth\ForgotPasswordScreen.tsx:45` gibi kaynak
  // yolları yayınlanan uygulamanın DOM'una giriyordu. Depo public olduğu için
  // bu bir sır sızıntısı değil; ama üretime taşınmasının hiçbir sebebi de yok.
  const plugins = [
    react(),
    tailwindcss(),
    ...(mode !== "production" ? [jsxLocPlugin()] : []),
  ];

  // Ortam kararı BURADA, bir kez veriliyor ve define olarak gömülüyor.
  // Çalışma zamanında yeniden çözülseydi Rollup `isDemoMode`'u katlayamaz ve
  // demo verisi üretim paketinde kalırdı (#144). Aynı mantığın iki yerde
  // yazılmaması için `resolveDeploymentEnvironment` ortak modülden geliyor —
  // K-06.
  const deploymentEnvironment = resolveDeploymentEnvironment(
    process.env.VERCEL_ENV ?? localEnv.VITE_DEPLOYMENT_ENV,
    mode !== "production"
  );

  const supabaseUrl =
    (process.env.VITE_SUPABASE_URL !== undefined
      ? process.env.VITE_SUPABASE_URL
      : localEnv.VITE_SUPABASE_URL) || undefined;
  const supabaseAnonKey =
    (process.env.VITE_SUPABASE_ANON_KEY !== undefined
      ? process.env.VITE_SUPABASE_ANON_KEY
      : localEnv.VITE_SUPABASE_ANON_KEY) || undefined;

  // Üretim derlemesinde (production build) Supabase URL ve anon anahtarı zorunludur.
  // Eksik veya boş yapılandırmayla sessizce yer tutucuya düşüp ölü bir uygulamanın
  // yayınlanmasını önlemek amacıyla derleme açık bir hatayla durdurulur (K-04, v1.3-00).
  if (deploymentEnvironment === "production") {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "[vite.config.ts] Üretim derlemesi için VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY ortam değişkenleri tanımlı olmalıdır. " +
          "Eksik yapılandırmayla ölü bir uygulamanın yayınlanmasını önlemek için build durduruldu (K-04, v1.3-00)."
      );
    }
  }

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
