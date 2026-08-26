import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

const PRINT_ROOT_ID = "orbit-print-root";

/**
 * İçeriği `#root`'un **kardeşi** olan ayrı bir düğüme render eder.
 *
 * Yazdırma sırasında `#root` tamamen gizlenir ve yalnızca bu düğüm basılır
 * (bkz. `index.css`). Kardeş olması şart: `#root` içine render edilseydi
 * `display: none` onu da götürürdü.
 *
 * Bu, Radix diyaloğunun `position: fixed` + `transform` yapısını yazdırma
 * denkleminden tamamen çıkarıyor. Önceki `visibility` tabanlı deneme boş sayfa
 * üretmişti çünkü transform'lu ata yeni bir kapsayıcı blok yaratıyor ve
 * konumlandırma yazdırma akışının dışına düşüyordu.
 */
export function PrintPortal({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Düğüm burada oluşturuluyor, `index.html`'de değil: yazdırılacak bir şey
    // olmadığında belgede boş bir kap durmasın.
    let node = document.getElementById(PRINT_ROOT_ID);
    let created = false;

    if (!node) {
      node = document.createElement("div");
      node.id = PRINT_ROOT_ID;
      document.body.appendChild(node);
      created = true;
    }

    setContainer(node);

    return () => {
      setContainer(null);
      if (created && node?.parentNode) {
        node.parentNode.removeChild(node);
      }
    };
  }, []);

  if (!container) {
    return null;
  }

  return createPortal(children, container);
}
