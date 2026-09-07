import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { purgeDemoStorageIfProduction } from "./lib/demoStorage";
import "./index.css";

// Üretim ortamında geçmişten kalan ölü demo anahtarlarını uygulama başlangıcında temizle
purgeDemoStorageIfProduction();

function isPermissionOrAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const err = error as Record<string, unknown>;
  const status = err.status ?? err.statusCode;
  if (status === 401 || status === 403) {
    return true;
  }
  if (err.code === "42501" || err.code === "PGRST301") {
    return true;
  }
  return false;
}

/**
 * React Query istemci varsayılanları (v1.3-00, mimari kararlar).
 *
 * 1. Yeniden deneme (retry): İzin ve yetki hatalarında (401, 403, 42501) kesinlikle
 *    yeniden deneme yapılmaz. RLS'in reddettiği bir sorgu tekrar denense de reddedilir;
 *    tek sonucu kullanıcının hatayı üç kat geç görmesi ve sunucuya gereksiz yük
 *    binmesidir. Geçici ağ hatalarında 1 kez denemek yeterlidir.
 *
 * 2. Pencere odağında yeniden çekme (refetchOnWindowFocus): Kapalıdır.
 *    Dershanedeki ortak bilgisayarlarda sekmeler arası geçiş yoğundur; her odaklanmada
 *    sorgu üretmek ücretsiz katman kotalarını tüketebilir. Veri tazeliği v1.3-05'te
 *    Realtime invalidation ile kontrollü olarak sağlanacaktır.
 *
 * 3. Bayatlama süresi (staleTime): 1 dakika (60_000 ms).
 *    Ders programı, öğrenci listesi ve denetim kayıtları saniyeler içinde değişmez.
 *    Sıfır bayatlama süresi diyalog ve sayfa geçişlerinde aşırı ağ trafiği yaratır;
 *    1 dakikalık kısa bellek paylaşılan istemcide akıcı bir deneyim sunar.
 *
 * 4. Hata yönetimi: Genel bildirim (toast) kurulmaz. Hata sorgunun kendisinde
 *    bırakılır ve doğrudan ilgili ekrana yansır; global toast hangi ekranın çöktüğünü
 *    gizler ve ekran düzeyindeki hata durumlarını (EmptyState) anlamsızlaştırır.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (isPermissionOrAuthError(error)) {
          return false;
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>
);
