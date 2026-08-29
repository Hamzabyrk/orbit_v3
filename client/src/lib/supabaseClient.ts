import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!supabaseConfigured) {
  console.warn(
    "[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY tanımlı değil. .env dosyanızı kontrol edin (bkz. .env.example)."
  );
}

/**
 * Kullanıcı bu sayfaya bir şifre sıfırlama bağlantısıyla mı geldi.
 *
 * `createClient`, varsayılan `detectSessionInUrl` davranışıyla adres
 * çubuğundaki hash'i okuyup temizler. `PASSWORD_RECOVERY` olayı ise kısa bir
 * gecikmeyle gelir. Bu bayrak istemci oluşturulmadan ÖNCE okunur; aksi halde
 * şifre belirleme ekranı, olay gelene kadar kısa süreliğine "bağlantı
 * geçersiz" gösterirdi.
 *
 * Modül gövdesindeki ifadeler sırayla çalıştığı için bu okuma deterministiktir.
 */
export const arrivedWithRecoveryLink =
  typeof window !== "undefined" &&
  window.location.hash.includes("type=recovery");

// Fall back to a syntactically valid placeholder so a missing config doesn't
// crash the whole app at import time — calls will just fail until the real
// env vars are set, instead of taking down every page that imports this module.
//
// Paylaşılan dershane bilgisayarında ikinci sekme açıldığında önceki
// kullanıcının oturumunun devralınmasını engellemek için oturum jetonu
// `sessionStorage`'da saklanır. Böylece her sekme kendi bağımsız oturumunu
// yürütür ve sekme kapatıldığında oturum sonlanır (#132).
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      storage:
        typeof window !== "undefined" ? window.sessionStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
