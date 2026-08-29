import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { purgeDemoStorageIfProduction } from "./lib/demoStorage";
import "./index.css";

// Üretim ortamında geçmişten kalan ölü demo anahtarlarını uygulama başlangıcında temizle
purgeDemoStorageIfProduction();

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>
);
