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
  // Düğüm burada YARATILIYOR ama belgeye BAĞLANMIYOR: `createElement` belgeye
  // dokunmaz, dolayısıyla render saf kalır. Bağlamak ve sökmek efektin işi.
  //
  // Önceki hâli düğümü efekt içinde yaratıp `setContainer` ile içeri
  // taşıyordu; bu, ilk render'ın `null` dönmesi ve içeriğin bir tur sonra
  // belirmesi demekti. Şimdi kap ilk render'da hazır.
  //
  // `index.html`'de durmuyor çünkü yazdırılacak bir şey olmadığında belgede
  // boş bir kap durmasın.
  const [container] = useState<HTMLDivElement>(() => {
    const node = document.createElement("div");
    node.id = PRINT_ROOT_ID;
    return node;
  });

  useEffect(() => {
    document.body.appendChild(container);
    return () => {
      container.remove();
    };
  }, [container]);

  return createPortal(children, container);
}
