import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

/**
 * Ekranın dar olup olmadığını `matchMedia`'dan okur.
 *
 * `useSyncExternalStore` kullanılıyor çünkü ölçülen şey React'in dışında bir
 * durum: tarayıcının medya sorgusu. Önceki hâli aynı bilgiyi bir efekt içinde
 * `setState` ile içeri taşıyordu ve bunun iki somut sonucu vardı:
 *
 * 1. **İlk render her zaman `false` diyordu.** Değer efektten sonra geliyordu,
 *    yani dar ekranda önce geniş düzen boyanıp sonra dar düzene atlıyordu.
 *    `useSyncExternalStore` doğru cevabı ilk render'da verir.
 * 2. **Abonelik ile okuma iki farklı şeye bakıyordu:** olay `matchMedia`'dan
 *    geliyor ama değer `window.innerWidth`'ten okunuyordu. Artık ikisi de
 *    aynı kaynağı okuyor.
 */
function subscribe(onStoreChange: () => void): () => void {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(MOBILE_QUERY).matches;
}

// Sunucuda `window` yok. Bugün SSR yok, ama varsayılan olmadan bileşen
// sunucuda render edilirse sessizce değil, çökerek bozulur.
function getServerSnapshot(): boolean {
  return false;
}

export function useIsMobile(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
