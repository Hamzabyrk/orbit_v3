/**
 * `onAuthStateChange` olaylarının saf karar mantığı.
 *
 * Bu dosyanın var olma sebebi ölçülmüş bir israftır (#145): yönetici
 * oturumunda tek bir sayfa yenilemesi beş sorgu yerine **on istek**
 * üretiyordu. `AuthProvider` kimliği iki ayrı yoldan çözüyordu — açılışta
 * `getSession()`, ve abonelik kurulurken auth-js'in ürettiği
 * `INITIAL_SESSION` olayı. İkisi de aynı beş tabloyu okuyordu.
 *
 * `getSession()` kaldırıldı; tek yol olay akışı. Bunun güvenli olmasının
 * sebebi kurulu auth-js sürümünde (2.112.3) doğrulandı: `onAuthStateChange`
 * abonelik kurar kurmaz `_emitInitialSession` çağırıyor ve o fonksiyon
 * **her yolda** geri çağrımı tetikliyor — başarıda oturumla, hatada `null`
 * ile. Yani `INITIAL_SESSION`'ın hiç yayılmadığı bir durum yok; ilk boyamanın
 * kilidini ona bağlamak ekranı asılı bırakmaz.
 *
 * Karar mantığı bileşenden ayrı duruyor çünkü `AuthProvider` bir React
 * bileşeni ve bu depoda bileşen testi altyapısı yok. `idleTimeout.ts`'teki
 * `resolveIdleTracking` ile aynı desen: kararı saf bir fonksiyon verir,
 * bileşen yalnızca uygular, test kararı sınar.
 */

/** Olay karşısında yapılacak iş. */
export type SessionAction =
  /** Kurtarma bağlantısıyla gelinmiş: bayrağı aç, kimliği verme. */
  | "enter-recovery"
  /** Kurtarma sürüyor: olay kullanıcıyı panele düşürmemeli. */
  | "ignore"
  /** Bu jeton için kimlik zaten okundu; tekrar okuma. */
  | "skip-resolved"
  /** Oturum yok: kimliği sıfırla. */
  | "clear"
  /** Kimliği oku. */
  | "resolve";

export interface SessionEventInput {
  /** supabase-js `AuthChangeEvent` adı. */
  event: string;
  /** Olayla gelen oturumun erişim jetonu; oturum yoksa `null`. */
  accessToken: string | null;
  /** En son **başarıyla** çözülmüş jeton; hiç çözülmediyse `null`. */
  resolvedToken: string | null;
  /** Şifre kurtarma akışı sürüyor mu. */
  recovering: boolean;
}

export interface SessionEventDecision {
  action: SessionAction;
  /**
   * Bu olay ilk boyamanın `loading` kilidini düşürür mü.
   *
   * Karardan **bağımsızdır** ve bilinçli olarak öyle: `INITIAL_SESSION`
   * "kurtarma sürüyor" dalına girip `ignore` dönse bile kilit düşmelidir.
   * Aksi halde kurtarma bağlantısıyla gelen kullanıcı sonsuz spinner görür —
   * bugün o kilidi kaldıran şey, bu değişiklikle giden `getSession()` yoluydu.
   */
  releasesLoading: boolean;
}

/**
 * Bir `onAuthStateChange` olayının ne anlama geldiğine karar verir.
 *
 * **Tekrarın ölçütü jetondur, kullanıcı değildir.** Bu ayrım kritik:
 * "aynı kullanıcı → atla" deseydik, zorunlu şifre değişiminden sonra kimliğin
 * yeniden okunması engellenirdi. `must_change_password` bayrağını veritabanı
 * tetikleyicisi düşürüyor ve düşmüş bayrağı görmenin tek yolu kimliği yeniden
 * okumaktır; kullanıcı şifresini değiştirir, kilit ekranı açık kalırdı.
 * Şifre değişimi oturumu döndürdüğü için jeton değişir ve okuma yapılır.
 * Aynı sebeple `TOKEN_REFRESHED` de yeni jetonla gelir ve kimliği tazeler —
 * sunucuda rolü değişmiş bir kullanıcı bunun sayesinde ısrar etmez.
 */
export function resolveSessionEvent({
  event,
  accessToken,
  resolvedToken,
  recovering,
}: SessionEventInput): SessionEventDecision {
  const releasesLoading =
    event === "INITIAL_SESSION" || event === "PASSWORD_RECOVERY";

  // Şifre sıfırlama bağlantısı da geçerli bir oturum açar. Bu olay
  // ayrıştırılmazsa kullanıcı şifresini hiç belirlemeden panele girer.
  if (event === "PASSWORD_RECOVERY") {
    return { action: "enter-recovery", releasesLoading };
  }

  // Kurtarma sürerken gelen SIGNED_IN / TOKEN_REFRESHED olayları kullanıcıyı
  // panele düşürmemeli. Bayrak, şifre belirlenene veya vazgeçilene kadar
  // kalıcıdır.
  if (recovering) {
    return { action: "ignore", releasesLoading };
  }

  if (accessToken === null) {
    return { action: "clear", releasesLoading };
  }

  if (accessToken === resolvedToken) {
    return { action: "skip-resolved", releasesLoading };
  }

  return { action: "resolve", releasesLoading };
}
