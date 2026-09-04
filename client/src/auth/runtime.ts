import {
  isDemoEnvironment,
  resolveDeploymentEnvironment,
  type DeploymentEnvironment,
} from "./deploymentEnvironment";

export type { DeploymentEnvironment };

const buildEnvironment =
  typeof __ORBIT_DEPLOYMENT_ENV__ === "string"
    ? __ORBIT_DEPLOYMENT_ENV__
    : undefined;

export const deploymentEnvironment = resolveDeploymentEnvironment(
  buildEnvironment,
  import.meta.env.DEV
);

/**
 * Demo modu — **derleme zamanında sabitlenmiş** bir boolean (#144).
 *
 * Önceden burada `deploymentEnvironment !== "production"` yazıyordu ve bu
 * doğru bir cevap veriyordu ama **yanlış zamanda**: `deploymentEnvironment`
 * bir fonksiyon çağrısından türediği için Rollup değeri katlayamıyordu.
 * Sonucu somuttu — `educationData.ts`'in her ihracı `isDemoMode ? demoX : []`
 * kalıbında yazılmış olduğu halde, üçlünün hiçbir dalı elenemiyor ve 1000
 * satırlık demo veri kümesi üretim paketine giriyordu. Pilot okulun
 * bilişimcisi paketi açtığında Türkçe kişi adları görüyordu.
 *
 * Artık değer `vite.config.ts`'te bir kez çözülüp `__ORBIT_DEMO_MODE__`
 * define'ı olarak metinsel yerine geçiyor. Üretim derlemesinde bu satır
 * literal `false` olur, üçlüler `[]`'e çöker ve demo verisi ulaşılamaz hale
 * gelip elenir.
 *
 * `typeof` koruması testler için: vitest `define`'ları uygulamıyor, orada
 * define hiç tanımlı olmuyor. Koruma kalkarsa testler `ReferenceError` alır.
 * Metinsel yerine geçme sonrası bu ifade `typeof false === "boolean"` haline
 * geldiği için katlanabilirliği bozmaz.
 */
export const isDemoMode =
  typeof __ORBIT_DEMO_MODE__ === "boolean"
    ? __ORBIT_DEMO_MODE__
    : isDemoEnvironment(deploymentEnvironment);
