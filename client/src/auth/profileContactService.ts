import { isDemoMode } from "./runtime";
import { supabase } from "@/lib/supabaseClient";

type ProfileContactRow = {
  phone: string | null;
  recovery_email: string | null;
};

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Oturum bilgisi doğrulanamadı. Lütfen tekrar giriş yapın.");
  }

  return data.user.id;
}

export async function loadProfileContact(): Promise<{
  phone: string | null;
  recoveryEmail: string | null;
} | null> {
  if (isDemoMode) return null;

  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("phone, recovery_email")
    .eq("id", userId)
    .maybeSingle<ProfileContactRow>();

  if (error) {
    throw new Error(
      "Profil iletişim bilgileri yüklenemedi. Lütfen tekrar deneyin."
    );
  }

  return data
    ? { phone: data.phone, recoveryEmail: data.recovery_email }
    : null;
}

export async function saveProfilePhone(phone: string | null): Promise<void> {
  if (isDemoMode) return;

  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from("profiles")
    .update({ phone })
    .eq("id", userId);

  if (error) {
    throw new Error("Telefon bilgisi kaydedilemedi. Lütfen tekrar deneyin.");
  }
}
