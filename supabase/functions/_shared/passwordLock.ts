import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";

/**
 * Zorunlu şifre değişimi kilidinin yazılması — tek kaynak (v1.2-16).
 *
 * Bu iş üç Edge Function'da üç ayrı kopya hâlindeydi ve üçü de aynı şeyi
 * yapıyordu: tek bir `update`, hata olursa `console.error` ve devam. Bir kopya
 * düzeltilip diğerlerinin unutulması, `_shared/temporaryPassword.ts`'in
 * yazılma sebebiyle aynı hikâye (**K-06**).
 *
 * **Neden bu üçü için atomiklik yok.** `create-member` kilidi artık
 * `internal_create_membership` işleminin içinde yazıyor, dolayısıyla orada
 * başarısız olabilecek ayrı bir adım kalmadı. Diğer üçünde bu mümkün değil:
 *
 *   * `reset-admin-password` ve `reset-member-password` şifreyi GoTrue admin
 *     API'siyle değiştiriyor ve `on_auth_password_changed` tetikleyicisi o
 *     güncellemede çalışıp bayrağı **düşürüyor**. Kilit bu yüzden şifre
 *     değişiminden SONRA yazılmak zorunda — sıra bir tercih değil, kısıt. Ve
 *     bir HTTP çağrısı bizim SQL işlemimize giremez.
 *   * `bootstrap-organization` kilidi RPC'sine taşıyabilirdi ama o RPC bugün
 *     `profiles`'a hiç dokunmuyor; akış operatöre özel, düşük hacimli ve hata
 *     ekranda anında görünüyor.
 *
 * Bu yüzden buradaki hedef atomiklik değil: **geçici bir hatanın kalıcı bir
 * açığa dönüşmemesi.** Kilit yazılamazsa geçici şifre süresiz ve değiştirilmesi
 * zorunlu olmayan bir kimlik bilgisine dönüşür; tek seferlik bir ağ hatasının
 * bedeli bu olmamalı.
 *
 * Başarısızlık **gizlenmiyor**: `false` dönüyor, çağıran bunu yanıtta
 * bildiriyor ve `CredentialsPanel` yöneticiye gösteriyor.
 */

/** Toplam deneme sayısı. İlk deneme dahil. */
const ATTEMPTS = 3;

/**
 * Denemeler arası bekleme. Kısa tutuldu: Edge Function'ın isteği açık
 * tutuyoruz ve buradaki hedef bir kesintiyi atlatmak değil, anlık bir
 * takılmayı geçmek.
 */
const RETRY_DELAY_MS = 120;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Kullanıcının profiline zorunlu şifre değişimi kilidini yazar.
 *
 * @returns Kilit yazıldıysa `true`. `false` dönmesi, geçici şifrenin süresiz
 * ve değiştirilmesi zorunlu olmayan bir kimlik bilgisi olarak kaldığı
 * anlamına gelir — çağıran bunu yanıtta bildirmek zorundadır.
 */
export async function setPasswordLock(
  adminClient: SupabaseClient,
  userId: string,
  passwordExpiresAt: string,
  logPrefix: string
): Promise<boolean> {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    const { error } = await adminClient
      .from("profiles")
      .update({
        must_change_password: true,
        password_expires_at: passwordExpiresAt,
      })
      .eq("id", userId);

    if (!error) {
      return true;
    }

    // Kullanıcı kimliği loglanmıyor: bu satırlar operasyon günlüğüne düşüyor
    // ve kimin şifresinin sıfırlandığı oraya ait bir bilgi değil.
    console.error(
      `${logPrefix} password lock flag write failed (attempt ${attempt}/${ATTEMPTS})`
    );

    if (attempt < ATTEMPTS) {
      await sleep(RETRY_DELAY_MS);
    }
  }

  return false;
}
