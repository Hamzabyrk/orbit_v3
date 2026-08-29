import { isDemoMode } from "@/auth/runtime";

const STORAGE_PREFIX = "orbit:demo:";

// Falls back to an in-memory store when `window.localStorage` isn't available
// (SSR, or Vitest's Node test environment) so this module never crashes and
// stays testable without adding a browser-like test environment.
const memoryStore = new Map<string, string>();
const memoryStorage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = {
  getItem: key => memoryStore.get(key) ?? null,
  setItem: (key, value) => void memoryStore.set(key, value),
  removeItem: key => void memoryStore.delete(key),
};

function getStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return memoryStorage;
}

export function readDemoData<T>(key: string, fallback: T): T {
  if (!isDemoMode) return fallback;

  const raw = getStorage().getItem(STORAGE_PREFIX + key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(
      `[demoStorage] "${key}" için kayıtlı veri bozuk, varsayılana dönülüyor.`,
      error
    );
    return fallback;
  }
}

export function writeDemoData<T>(key: string, value: T): void {
  if (!isDemoMode) return;

  getStorage().setItem(STORAGE_PREFIX + key, JSON.stringify(value));
}

export function clearDemoData(key: string): void {
  if (!isDemoMode) return;

  getStorage().removeItem(STORAGE_PREFIX + key);
}

// Writes a raw, non-JSON-encoded string directly, bypassing JSON.stringify.
// Only exists so tests can simulate real-world storage corruption — app code
// should always go through writeDemoData/readDemoData.
export function __writeRawForTest(key: string, raw: string): void {
  getStorage().setItem(STORAGE_PREFIX + key, raw);
}

/**
 * Üretim ortamında geçmişten kalan ölü `orbit:demo:*` anahtarlarını temizler.
 * Demo modunda çalışmaz. Modül yüklendiğinde bir kez çağrılır (#134).
 */
export function purgeDemoStorageIfProduction(): void {
  if (isDemoMode) return;

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Depo erişim hatası (ör. kısıtlı gizli sekme ortamı) yoksayılır
    }
  }

  for (const key of Array.from(memoryStore.keys())) {
    if (key.startsWith(STORAGE_PREFIX)) {
      memoryStore.delete(key);
    }
  }
}
