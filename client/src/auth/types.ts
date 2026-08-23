import type { ReactNode } from "react";
import type { EducationRole } from "@/components/educationAccess";

export type AuthIdentity = {
  userId: string;
  membershipId: string;
  role: EducationRole;
  displayName: string;
  organizationId: string;
  organizationName: string;
  branchId: string | null;
  branchName: string | null;
  demo: boolean;
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
};

export type AuthProviderProps = {
  children: ReactNode;
};
