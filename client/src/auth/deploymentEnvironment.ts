/**
 * Dağıtım ortamının çözümlenmesi — **saf**, yan etkisiz, tarayıcıya bağımsız.
 *
 * Kendi dosyasında olmasının sebebi teknik bir zorunluluk: bu mantığı
 * `vite.config.ts` de kullanıyor. Config, Node tarafında çalışır ve
 * `runtime.ts`'i import edemez — o modül yüklenir yüklenmez `import.meta.env`
 * ve `__ORBIT_*` define'larını okur, ikisi de config bağlamında yoktur.
 *
 * Alternatif, aynı kararı iki yerde yazmaktı: bir kez config'te, bir kez
 * çalışma zamanında. Bu tam olarak **K-06**'nın yasakladığı şey — biri
 * güncellenir, ikizi bırakılır ve hangisinin doğru olduğu bilinemez. Kural,
 * "üretim mi değil mi" gibi bir güvenlik kararında iki katı geçerli.
 */

export type DeploymentEnvironment = "development" | "preview" | "production";

const knownEnvironments = new Set<DeploymentEnvironment>([
  "development",
  "preview",
  "production",
]);

/**
 * Tanınmayan değer **production** sayılır (geliştirme derlemesi değilse).
 *
 * Fail-closed: bilinmeyen bir ortam adı demo moduna düşseydi, üretimde sahte
 * veri gösteren bir uygulama yayınlanabilirdi. K-04.
 */
export function resolveDeploymentEnvironment(
  value: string | undefined,
  viteDevelopment: boolean
): DeploymentEnvironment {
  if (value && knownEnvironments.has(value as DeploymentEnvironment)) {
    return value as DeploymentEnvironment;
  }

  return viteDevelopment ? "development" : "production";
}

/** Demo modu üretim DIŞINDAKİ her ortamda açıktır. */
export function isDemoEnvironment(environment: DeploymentEnvironment): boolean {
  return environment !== "production";
}
