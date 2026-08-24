import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  clearLastActivity,
  IDLE_TIMEOUT_MS,
  readLastActivity,
  remainingIdleMs,
  resolveIdleState,
  writeLastActivity,
} from "./idleTimeout";

/** Etkinlik sayılan olaylar. Fare hareketi bilinçli olarak yok — bkz. aşağıda. */
const ACTIVITY_EVENTS = [
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
] as const;

/** Zaman damgası bu sıklıktan daha sık yazılmaz. */
const WRITE_THROTTLE_MS = 15 * 1000;

/** Durum bu aralıklarla kontrol edilir. */
const CHECK_INTERVAL_MS = 15 * 1000;

/**
 * Belirli süre işlem yapılmazsa oturumu kapatır.
 *
 * `mousemove` bilinçli olarak dinlenmiyor: titreyen bir fare veya kaydırılan
 * bir sayfa, kimse başında olmadığı hâlde oturumu sonsuza kadar açık tutardı.
 * Dinlenen olaylar gerçek bir kullanıcı eylemi gerektirir.
 *
 * Sayaç yalnızca oturum açıkken çalışır. `enabled` false iken depo da
 * temizleniyor; aksi halde çıkış yapıp tekrar giren kullanıcı, eski zaman
 * damgası yüzünden anında dışarı atılabilirdi.
 */
export function useIdleTimeout({
  enabled,
  onExpire,
}: {
  enabled: boolean;
  onExpire: () => void;
}): void {
  // Geri çağrım her render'da değişebilir; efektin yeniden kurulmaması için
  // ref üzerinden okunuyor.
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const warnedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      clearLastActivity();
      warnedRef.current = false;
      return;
    }

    let lastWrite = 0;

    const touch = () => {
      const now = Date.now();
      if (now - lastWrite < WRITE_THROTTLE_MS) return;

      lastWrite = now;
      warnedRef.current = false;
      writeLastActivity(now);
    };

    // İlk yükleme: depoda kayıt yoksa şimdi işaretle. Kayıt varsa DOKUNMA —
    // dokunsaydık, tarayıcı kapatılıp ertesi gün açıldığında sayaç sıfırlanır
    // ve zaman aşımı hiç tetiklenmezdi.
    if (readLastActivity() === null) {
      writeLastActivity(Date.now());
      lastWrite = Date.now();
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, touch, { passive: true });
    }

    const check = () => {
      const state = resolveIdleState(readLastActivity(), Date.now());

      if (state === "expired") {
        clearLastActivity();
        onExpireRef.current();
        return;
      }

      if (state === "warning" && !warnedRef.current) {
        warnedRef.current = true;
        const seconds = Math.ceil(
          remainingIdleMs(readLastActivity(), Date.now()) / 1000
        );
        toast.warning("Oturumunuz kapanmak üzere", {
          description: `İşlem yapılmazsa yaklaşık ${seconds} saniye içinde güvenlik için çıkış yapılacak.`,
        });
      }
    };

    // Sekme yeniden görünür olduğunda hemen kontrol et. Arka planda tarayıcılar
    // zamanlayıcıları kısıyor; yalnızca aralığa güvenirsek uzun süre kapalı
    // kalmış bir sekme dönüşte hâlâ açık görünürdü.
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };

    const interval = window.setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisible);

    check();

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, touch);
      }
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, [enabled]);
}

export { IDLE_TIMEOUT_MS };
