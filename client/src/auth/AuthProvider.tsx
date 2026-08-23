import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { EducationRole } from "@/components/educationAccess";
import { roleMeta } from "@/components/education/mockData";
import {
  arrivedWithRecoveryLink,
  supabase,
  supabaseConfigured,
} from "@/lib/supabaseClient";
import { AuthContext } from "./AuthContext";
import { loadAuthenticatedIdentity } from "./authService";
import { isDemoMode } from "./runtime";
import type { AuthIdentity, AuthProviderProps, LoginInput } from "./types";

function createDemoIdentity(role: EducationRole): AuthIdentity {
  return {
    userId: `demo-${role}`,
    membershipId: `demo-membership-${role}`,
    role,
    displayName: roleMeta[role].name,
    organizationId: "demo-organization",
    organizationName: "Trakya pilotu",
    branchId: "demo-branch",
    branchName: "Çorlu Şube",
    demo: true,
  };
}

/** Şifre sıfırlama bağlantısının kullanıcıyı döndüreceği adres. */
function passwordRecoveryRedirectUrl(): string {
  return `${window.location.origin}/sifre-belirle`;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [identity, setIdentity] = useState<AuthIdentity | null>(null);
  const [loading, setLoading] = useState(!isDemoMode);
  // Sayfaya bir kurtarma bağlantısıyla gelindiyse bayrak baştan açılır;
  // PASSWORD_RECOVERY olayı beklenirken ekranın "bağlantı geçersiz" gösterip
  // sonra forma dönmesini engeller.
  const [passwordRecovery, setPasswordRecovery] = useState(
    !isDemoMode && arrivedWithRecoveryLink
  );

  // onAuthStateChange geri çağrımı bir kez kurulur; içeriden güncel değeri
  // okuyabilmek için state yerine ref kullanılıyor. Aksi halde abonelik her
  // değişimde yeniden kurulur ve olaylar kaçabilirdi.
  const recoveringRef = useRef(!isDemoMode && arrivedWithRecoveryLink);

  const setRecovering = useCallback((value: boolean) => {
    recoveringRef.current = value;
    setPasswordRecovery(value);
  }, []);

  const restoreSession = useCallback(async (session: Session | null) => {
    if (!session) {
      setIdentity(null);
      return;
    }

    setIdentity(await loadAuthenticatedIdentity(session.user));
  }, []);

  useEffect(() => {
    if (isDemoMode) {
      return;
    }

    let active = true;

    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }

    void supabase.auth.getSession().then(async ({ data, error }) => {
      try {
        if (error) throw error;
        await restoreSession(data.session);
      } catch {
        if (active) setIdentity(null);
      } finally {
        if (active) setLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        window.setTimeout(() => {
          if (!active) return;

          // Şifre sıfırlama bağlantısı da geçerli bir oturum açar. Bu olay
          // ayrıştırılmazsa kullanıcı şifresini hiç belirlemeden panele girer.
          if (event === "PASSWORD_RECOVERY") {
            setRecovering(true);
            setIdentity(null);
            setLoading(false);
            return;
          }

          // Kurtarma sürerken gelen SIGNED_IN / TOKEN_REFRESHED olayları
          // kullanıcıyı panele düşürmemeli. Bayrak, şifre belirlenene veya
          // vazgeçilene kadar kalıcıdır.
          if (recoveringRef.current) {
            return;
          }

          void restoreSession(session).catch(() => setIdentity(null));
        }, 0);
      }
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [restoreSession, setRecovering]);

  const signIn = useCallback(
    async ({ email, password, demoRole }: LoginInput) => {
      if (isDemoMode) {
        if (password !== "demo123") {
          throw new Error("Demo şifresi demo123 olarak ayarlanmıştır.");
        }

        setIdentity(createDemoIdentity(demoRole));
        return;
      }

      if (!supabaseConfigured) {
        throw new Error(
          "Giriş servisi yapılandırılmamış. Sistem yöneticisine başvurun."
        );
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.user) {
        throw new Error("E-posta veya şifre doğrulanamadı.");
      }

      try {
        setIdentity(await loadAuthenticatedIdentity(data.user));
      } catch (identityError) {
        await supabase.auth.signOut();
        throw identityError;
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    if (!isDemoMode && supabaseConfigured) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new Error("Oturum güvenli şekilde kapatılamadı.");
      }
    }

    setIdentity(null);
  }, []);

  const switchDemoRole = useCallback((role: EducationRole) => {
    if (!isDemoMode) return;
    setIdentity(createDemoIdentity(role));
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (isDemoMode) {
      throw new Error(
        "Şifre sıfırlama yalnızca canlı ortamda kullanılabilir. Demo modunda şifre demo123'tür."
      );
    }

    if (!supabaseConfigured) {
      throw new Error(
        "Giriş servisi yapılandırılmamış. Sistem yöneticisine başvurun."
      );
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: passwordRecoveryRedirectUrl(),
    });

    // Hesabın var olup olmadığı sızdırılmaz; yalnızca gerçek servis hataları
    // yukarı taşınır. Çağıran taraf her durumda aynı mesajı gösterir.
    if (error && error.status && error.status >= 500) {
      throw new Error(
        "Şifre sıfırlama e-postası gönderilemedi. Lütfen daha sonra tekrar deneyin."
      );
    }
  }, []);

  const completePasswordReset = useCallback(
    async (newPassword: string) => {
      if (!supabaseConfigured) {
        throw new Error(
          "Giriş servisi yapılandırılmamış. Sistem yöneticisine başvurun."
        );
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw new Error(
          "Şifre güncellenemedi. Bağlantının süresi dolmuş olabilir; sıfırlama işlemini yeniden başlatın."
        );
      }

      // Yeni şifreyle giriş yapılmasını bilinçli olarak zorunlu kılıyoruz.
      // Kullanıcıyı doğrudan panele almak daha hızlı olurdu, ancak o zaman
      // şifrenin gerçekten çalıştığı doğrulanmamış kalırdı; bu akışın var olma
      // sebebi tam olarak o belirsizliği ortadan kaldırmaktır.
      await supabase.auth.signOut();
      setIdentity(null);
      setRecovering(false);
    },
    [setRecovering]
  );

  const cancelPasswordRecovery = useCallback(async () => {
    if (supabaseConfigured) {
      await supabase.auth.signOut();
    }

    setIdentity(null);
    setRecovering(false);
  }, [setRecovering]);

  const value = useMemo(
    () => ({
      identity,
      loading,
      demoMode: isDemoMode,
      passwordRecovery,
      signIn,
      signOut,
      switchDemoRole,
      requestPasswordReset,
      completePasswordReset,
      cancelPasswordRecovery,
    }),
    [
      identity,
      loading,
      passwordRecovery,
      signIn,
      signOut,
      switchDemoRole,
      requestPasswordReset,
      completePasswordReset,
      cancelPasswordRecovery,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
