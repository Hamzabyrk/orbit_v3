// ORBIT Education Platform: Modern, multi-role CRM and operations dashboard for education centers.
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import Platform from "./pages/Platform";
import SetPassword from "./pages/SetPassword";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      {/*
        Şifre akışı rotaları kimlik doğrulaması gerektirmez; kullanıcı buraya
        zaten oturumu olmadığı için gelir. /sifre-belirle adresi, Supabase
        şifre sıfırlama e-postasındaki bağlantının hedefidir ve bu değer
        Supabase Redirect URL listesiyle uyumlu olmalıdır
        (bkz. .ai/PLATFORM_SETTINGS.md bölüm 3.2).
      */}
      <Route path="/sifre-sifirla" component={ForgotPassword} />
      <Route path="/sifre-belirle" component={SetPassword} />
      {/*
        Platform operatörü paneli. Giriş ekranı ayrı DEĞİL — tek giriş, girişten
        sonra dallanma; bkz. `.ai/DECISION_LOG.md`.
      */}
      <Route path="/platform" component={Platform} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-right" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
