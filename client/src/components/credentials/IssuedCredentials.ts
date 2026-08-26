/**
 * Kullanıcıya veya kuruma üretilen giriş bilgisi (tarafsız tip).
 *
 * Geçici şifre hiçbir yere kaydedilmez; yalnızca bir kez üretilip ekranda
 * gösterilir. Bu tip hem platform operatörünün kurum kurma / şifre sıfırlama
 * akışında hem de kurum yöneticisinin üye şifresi sıfırlama akışında ortak
 * kullanılır.
 */
export type IssuedCredentials = {
  loginNumber: string;
  temporaryPassword: string;
  /** Sunucu alanı yoksa eski yanıtlarla uyumluluk için undefined kalır. */
  passwordLockSet?: boolean;
  /** Denetim servisi alanı eklenene kadar undefined kalabilir. */
  auditWritten?: boolean;
};
