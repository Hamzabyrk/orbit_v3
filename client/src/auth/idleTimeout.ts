/**
 * Hareketsizlik zaman aşımının saf mantığı.
 *
 * Supabase'in sunucu tarafı oturum zaman aşımı (`inactivity timeout` /
 * `time-box`) Pro plan gerektiriyor; ücretsiz katmanda `auth.sessions.not_after`
 * boş kalıyor ve oturumlar süresiz yenileniyor. Bu, o ayarın ücretsiz
 * karşılığıdır.
 *
 * **Dürüst sınır:** Bu gerçek bir güvenlik kontrolü değildir. Jetonu ele
 * geçirmiş bir saldırgan istemci kodunu yok sayar ve jeton süresi dolana kadar
 * kullanmaya devam eder. Karşıladığı tehdit modeli farklı ve somut: dershanenin
 * ortak bilgisayarında açık bırakılan tarayıcı. Ona karşı etkilidir.
 *
 * Zaman damgası `localStorage`'a yazılıyor — yalnızca bellekte tutulsaydı sayaç
 * her sayfa yenilemesinde sıfırlanır ve tarayıcı kapatılıp ertesi gün açıldığında
 * oturum hâlâ açık olurdu.
 */

/** Hareketsizlik eşiği. Dershanenin ortak bilgisayarı için makul bir üst sınır. */
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

/** Oturum kapanmadan önce uyarının gösterileceği süre. */
export const IDLE_WARNING_MS = 60 * 1000;

export const IDLE_STORAGE_KEY = "orbit:last-activity";

export type IdleState = "active" | "warning" | "expired";

export type IdleTracking = "track" | "clear" | "wait";

export interface IdleTrackingInput {
  demoMode: boolean;
  sessionLoading: boolean;
  signedIn: boolean;
}

/**
 * Oturum ve çalışma ortamı durumuna göre hareketsizlik sayacının ne
 * yapması gerektiğini belirler.
 *
 * Üç durum vardır:
 * - "wait": Oturum henüz çözülüyor (soğuk açılış). Zaman damgasına dokunulmaz
 *   (ne yazılır ne silinir). Aksi halde dünden kalan damga silinir ve oturum
 *   zaman aşımı soğuk açılışta atlanmış olurdu (#128).
 * - "track": Oturum açık ve doğrulandı. Zaman aşımı kontrolü ve etkinlik
 *   dinleyicileri aktif.
 * - "clear": Oturum kapalı veya demo modundayız. Depodaki eski damga
 *   temizlenir; böylece tekrar giriş yapan kullanıcı anında dışarı atılmaz.
 */
export function resolveIdleTracking(input: IdleTrackingInput): IdleTracking {
  if (input.demoMode) {
    return "clear";
  }

  if (input.sessionLoading) {
    return "wait";
  }

  if (input.signedIn) {
    return "track";
  }

  return "clear";
}

/**
 * Son etkinlik zamanına göre durumu belirler.
 *
 * `lastActivity` okunamıyorsa (depo boş veya bozuk) `expired` dönülüyor.
 * Fail-open olmak — yani bilinmeyende oturumu açık bırakmak — bu fonksiyonun
 * var olma sebebini ortadan kaldırırdı.
 */
export function resolveIdleState(
  lastActivity: number | null,
  now: number,
  timeoutMs: number = IDLE_TIMEOUT_MS,
  warningMs: number = IDLE_WARNING_MS
): IdleState {
  if (lastActivity === null || !Number.isFinite(lastActivity)) {
    return "expired";
  }

  // Gelecekteki bir zaman damgası: sistem saati geri alınmış veya depo
  // kurcalanmış olabilir. Oturumu sonsuza kadar açık tutmak yerine
  // hareketsizlik sayılıyor.
  if (lastActivity > now) {
    return "expired";
  }

  const idleFor = now - lastActivity;

  if (idleFor >= timeoutMs) {
    return "expired";
  }

  if (idleFor >= timeoutMs - warningMs) {
    return "warning";
  }

  return "active";
}

/** Oturumun kapanmasına kalan süre (ms). Negatif değer döndürmez. */
export function remainingIdleMs(
  lastActivity: number | null,
  now: number,
  timeoutMs: number = IDLE_TIMEOUT_MS
): number {
  if (lastActivity === null || !Number.isFinite(lastActivity)) {
    return 0;
  }

  return Math.max(0, lastActivity + timeoutMs - now);
}

export function readLastActivity(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(IDLE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    // Gizli sekmede veya depo kotası dolduğunda erişim hata verebilir.
    return null;
  }
}

export function writeLastActivity(value: number): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(IDLE_STORAGE_KEY, String(value));
  } catch {
    // Yazılamıyorsa sayaç çalışmaz; oturumu kapatmak yerine sessizce geçiyoruz
    // çünkü depoya yazamamak kullanıcıyı dışarı atmak için gerekçe değildir.
  }
}

export function clearLastActivity(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(IDLE_STORAGE_KEY);
  } catch {
    // yoksay
  }
}
