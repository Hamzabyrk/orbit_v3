import type { ReactNode } from "react";
import type { EducationRole } from "@/components/educationAccess";

/**
 * Kurum üyeliğinden gelen kimlik yüzü. Platform operatörünün tasarım gereği
 * yoktur; bkz. `.ai/DECISION_LOG.md` — "Platform operatörü ayrı bir eksendir".
 */
export type MembershipIdentity = {
  membershipId: string;
  role: EducationRole;
  organizationId: string;
  organizationName: string;
  /** Giriş numarasının ilk dört hanesi. */
  organizationCode: number | null;
  branchId: string | null;
  branchName: string | null;
};

/** Platform operatörlüğünden gelen kimlik yüzü. */
export type PlatformOperatorIdentity = {
  role: "owner" | "operator";
};

/**
 * Kimlik iki bağımsız eksen taşır ve bir kullanıcı ikisinden birine, hiçbirine
 * veya her ikisine birden sahip olabilir.
 *
 * İkisinden birini diğerine göre öncelikli saymak yerine her ikisi de
 * çözümleniyor; hangi panelin gösterileceğine çağıran taraf karar veriyor.
 * Öncelik kuralı koysaydık, hem kurum üyesi hem operatör olan bir kişi
 * diğer panele hiç ulaşamazdı — ki test kurumu silinene kadar (Faz F) kurucu
 * ekip üyesi tam olarak bu durumda olacak.
 */
export type AuthIdentity = {
  userId: string;
  displayName: string;
  demo: boolean;
  /**
   * Kullanıcı geçici şifreyle açıldı ve henüz kendi şifresini belirlemedi.
   *
   * Bayrağın tek doğruluk kaynağı `profiles` tablosudur; istemci onu yalnızca
   * OKUR. Kullanıcı kendi eliyle düşüremez — sütun düzeyi GRANT engelliyor —
   * ve şifre gerçekten değiştiğinde veritabanı tetikleyicisi kendiliğinden
   * düşürüyor. Bkz. `20260825140000_force_password_change.sql`.
   */
  mustChangePassword: boolean;
  /** Geçici şifrenin son geçerlilik anı (ISO). Kilit yoksa `null`. */
  passwordExpiresAt: string | null;
  /** Aktif kurum üyeliği yoksa `null`. */
  membership: MembershipIdentity | null;
  /** Aktif platform operatörlüğü yoksa `null`. */
  platformOperator: PlatformOperatorIdentity | null;
};

export type LoginInput = {
  email: string;
  password: string;
  demoRole: EducationRole;
};

export type AuthContextValue = {
  identity: AuthIdentity | null;
  loading: boolean;
  demoMode: boolean;
  /**
   * Kullanıcı bir şifre sıfırlama bağlantısıyla geldi ve henüz yeni şifresini
   * belirlemedi. Bu sırada oturum teknik olarak açıktır ancak kullanıcı panele
   * alınmaz; aksi halde şifresini hiç belirleyemeden içeri girerdi.
   */
  passwordRecovery: boolean;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
  switchDemoRole: (role: EducationRole) => void;
  /** Şifre sıfırlama bağlantısı gönderir. E-postanın kayıtlı olup olmadığını sızdırmaz. */
  requestPasswordReset: (email: string) => Promise<void>;
  /** Yeni şifreyi kaydeder ve oturumu kapatır; kullanıcı yeni şifresiyle giriş yapar. */
  completePasswordReset: (newPassword: string) => Promise<void>;
  /** Şifre belirlemeden vazgeçildiğinde kurtarma oturumunu kapatır. */
  cancelPasswordRecovery: () => Promise<void>;
  /**
   * Zorunlu ilk şifre değişimini tamamlar ve kimliği yeniler.
   * Kurtarma akışından farkı: oturum kapatılmaz, kullanıcı içeride kalır.
   */
  completeRequiredPasswordChange: (newPassword: string) => Promise<void>;
};

export type AuthProviderProps = {
  children: ReactNode;
};
