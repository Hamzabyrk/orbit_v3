import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { EducationRole } from "@/components/educationAccess";
import { demoRoleNames } from "@/components/education/roleMeta";
import {
  arrivedWithRecoveryLink,
  supabase,
  supabaseConfigured,
} from "@/lib/supabaseClient";
import { toast } from "sonner";
import { AuthContext } from "./AuthContext";
import { clearLastActivity, resolveIdleTracking } from "./idleTimeout";
import { useIdleTimeout } from "./useIdleTimeout";
import { loadAuthenticatedIdentity } from "./authService";
import { resolveSessionEvent } from "./sessionEvents";
import { isDemoMode } from "./runtime";
import type { AuthIdentity, AuthProviderProps, LoginInput } from "./types";

function createDemoIdentity(role: EducationRole): AuthIdentity {
  return {
    userId: `demo-${role}`,
    displayName: demoRoleNames[role],
    demo: true,
    // Demo modunda kilit yok; satış sunumunda şifre değiştirme ekranı çıkmaz.
    passwordLock: "clear",
    passwordExpiresAt: null,
    // Demo hesabının gerçek bir kurtarma adresi yok ve olamaz. "missing"
    // bugün canlıdaki her hesap için de doğru; sunumda görülen uyarı gerçek
    // üründe görülenle aynı.
    recoveryChannel: "missing",
    recoveryEmail: null,
    membership: {
      membershipId: `demo-membership-${role}`,
      role,
      organizationId: "demo-organization",
      organizationName: "Trakya pilotu",
      organizationCode: null,
      branchId: "demo-branch",
      branchName: "Çorlu Şube",
    },
    // Demo kimliği hiçbir zaman platform operatörü değildir; demo modu satış
    // sunumu içindir ve kurum kurma yetkisi taşımaz.
    platformOperator: null,
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

  // En son BAŞARIYLA çözülmüş erişim jetonu. Aynı jeton için kimliği ikinci
  // kez okumamak içindir (#145). Kararı `resolveSessionEvent` veriyor; burada
  // yalnızca ölçüt tutuluyor.
  //
  // Yalnızca başarılı okumadan SONRA yazılıyor: başarısız bir deneme jetonu
  // işaretleseydi, tek bir ağ hatası kimliği o oturum boyunca kalıcı olarak
  // eksik bırakırdı ve hiçbir olay onu tazeleyemezdi.
  const resolvedTokenRef = useRef<string | null>(null);

  const applyIdentity = useCallback(async (session: Session) => {
    setIdentity(await loadAuthenticatedIdentity(session.user));
    resolvedTokenRef.current = session.access_token;
  }, []);

  const clearIdentity = useCallback(() => {
    resolvedTokenRef.current = null;
    setIdentity(null);
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

    // `getSession()` ile açılış yapılMIYOR ve bu #145'in düzeltmesidir.
    // Öncesinde kimlik iki ayrı yoldan çözülüyordu — burada bir kez,
    // abonelik kurulurken gelen `INITIAL_SESSION` olayıyla bir kez daha — ve
    // her sayfa yenilemesi beş sorgu yerine on istek üretiyordu.
    //
    // Tek yola inmek güvenli, çünkü auth-js (2.112.3) `onAuthStateChange`
    // abonelik kurar kurmaz `_emitInitialSession` çağırıyor ve o fonksiyon
    // HER yolda geri çağrımı tetikliyor: başarıda oturumla, hatada `null`
    // ile. Olayın hiç gelmediği bir durum yok, dolayısıyla `loading` asılı
    // kalmaz.
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        window.setTimeout(() => {
          if (!active) return;

          const { action, releasesLoading } = resolveSessionEvent({
            event,
            accessToken: session?.access_token ?? null,
            resolvedToken: resolvedTokenRef.current,
            recovering: recoveringRef.current,
          });

          // Kilit karardan BAĞIMSIZ düşüyor. "Kurtarma sürüyor" dalı olayı
          // yok sayar; kilit karara bağlansaydı kurtarma bağlantısıyla gelen
          // kullanıcı sonsuz spinner görürdü — bugüne kadar o kilidi kaldıran
          // şey, yukarıda kaldırılan `getSession()` yoluydu.
          if (releasesLoading) {
            setLoading(false);
          }

          if (action === "enter-recovery") {
            setRecovering(true);
            clearIdentity();
            return;
          }

          if (action === "ignore" || action === "skip-resolved") {
            return;
          }

          if (action === "clear") {
            clearIdentity();
            return;
          }

          if (session) {
            void applyIdentity(session).catch(() => clearIdentity());
          }
        }, 0);
      }
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [applyIdentity, clearIdentity, setRecovering]);

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

      if (error || !data.user || !data.session) {
        throw new Error("E-posta veya şifre doğrulanamadı.");
      }

      // Kimlik burada okunuyor, `SIGNED_IN` olayının gelmesi beklenmiyor:
      // okuma başarısız olursa kullanıcı dışarı alınmalı ve hata çağırana
      // ulaşmalı. Olay yolu bunu yapamaz — orada fırlatılan hata kimseye
      // ulaşmaz. `applyIdentity` jetonu işaretlediği için hemen ardından
      // gelen `SIGNED_IN` aynı işi tekrar etmez (#145).
      try {
        await applyIdentity(data.session);
      } catch (identityError) {
        await supabase.auth.signOut();
        throw identityError;
      }
    },
    [applyIdentity]
  );

  const signOut = useCallback(async () => {
    if (!isDemoMode && supabaseConfigured) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new Error("Oturum güvenli şekilde kapatılamadı.");
      }
    }

    clearLastActivity();
    clearIdentity();
  }, [clearIdentity]);

  const idleTracking = resolveIdleTracking({
    demoMode: isDemoMode,
    sessionLoading: loading,
    signedIn: identity !== null,
  });

  // Hareketsizlik zaman aşımı. Supabase'in sunucu tarafı karşılığı Pro plan
  // gerektirdiği için ücretsiz alternatif; bkz. `idleTimeout.ts`.
  //
  // Demo modunda kapalı; oturum çözülürken ("wait") depoya dokunulmaz (#128).
  useIdleTimeout({
    tracking: idleTracking,
    onExpire: () => {
      void (async () => {
        // `signOut()` hata FIRLATMAZ, hatayı döndürür. Eski kod `.catch` ile
        // yakalamaya çalışıyordu; o zincir hiç çalışmıyordu ve sunucu isteği
        // başarısız olduğunda jeton depoda kalıyordu. Ekran giriş sayfasına
        // dönüyor, sayfa yenilenince oturum geri geliyordu — yani sayacın
        // koruduğu iddia edilen şey korunmuyordu (#143).
        const { error } = await supabase.auth.signOut();

        if (error) {
          console.warn(
            "[auth] Oturum sunucuda kapatılamadı; yerel jeton yine de siliniyor.",
            error
          );
          // Ağ istemez, yalnızca yerel depoyu temizler. Sayacın var olma
          // sebebi bu satırdır: ekranı kilitlemek yetmez, jeton gitmelidir.
          await supabase.auth.signOut({ scope: "local" });
        }

        clearIdentity();
        toast.info("Oturumunuz kapatıldı", {
          description:
            "Uzun süre işlem yapılmadığı için güvenlik amacıyla çıkış yapıldı. Tekrar giriş yapabilirsiniz.",
        });
      })();
    },
  });

  /**
   * Zorunlu ilk şifre değişimini tamamlar.
   *
   * Şifre doğrudan Supabase'e gidiyor; araya bizim sunucu kodumuz girmiyor.
   * Bayrağı da biz temizlemiyoruz — veritabanı tetikleyicisi şifre gerçekten
   * değiştiğinde kendiliğinden düşürüyor. Burada yaptığımız tek şey, düşmüş
   * bayrağı görebilmek için kimliği yeniden okumak.
   *
   * `signOut` YAPILMIYOR. Kurtarma akışından farkı bu: orada kullanıcının
   * şifresini gerçekten bilip bilmediği belirsizdi ve yeniden giriş bir
   * doğrulamaydı. Burada kullanıcı zaten geçerli şifresiyle girmiş durumda;
   * onu dışarı atmak gereksiz bir sürtünme olurdu.
   */
  const completeRequiredPasswordChange = useCallback(
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
          "Şifre güncellenemedi. Lütfen tekrar deneyin; sorun sürerse kurum yöneticinize başvurun."
        );
      }

      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !data.session) {
        // Şifre değişti ama oturum okunamadı. Kullanıcıyı belirsiz bir
        // durumda bırakmak yerine dışarı alıyoruz; yeni şifresiyle girer.
        await supabase.auth.signOut();
        clearLastActivity();
        clearIdentity();
        return;
      }

      // Bu okuma atlanamaz ve jeton ölçütünün kullanıcı ölçütü OLMAMASININ
      // sebebi budur: bayrağı veritabanı tetikleyicisi düşürüyor, düşmüş
      // bayrağı görmenin tek yolu kimliği yeniden okumak. Şifre değişimi
      // oturumu döndürdüğü için jeton yenidir ve okuma gerçekten yapılır.
      await applyIdentity(data.session);
    },
    [applyIdentity, clearIdentity]
  );

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
      clearIdentity();
      setRecovering(false);
    },
    [clearIdentity, setRecovering]
  );

  const cancelPasswordRecovery = useCallback(async () => {
    if (supabaseConfigured) {
      await supabase.auth.signOut();
    }

    clearIdentity();
    setRecovering(false);
  }, [clearIdentity, setRecovering]);

  /**
   * Oturumu okur ve kimliği yeniden yükler. Profil okuma hatası veya geçici
   * ağ sorunları nedeniyle "unresolved" durumunda kalan ekranlarda kullanıcının
   * işlemi tekrar denemesini sağlar. Hata durumunda hatayı yukarı fırlatır;
   * çağıran bileşen yakalayıp kullanıcıya gösterir, mevcut kimlik bozulmaz.
   */
  const refreshIdentity = useCallback(async () => {
    if (isDemoMode) {
      return;
    }

    if (!supabaseConfigured) {
      throw new Error(
        "Giriş servisi yapılandırılmamış. Sistem yöneticisine başvurun."
      );
    }

    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      throw new Error("Oturum doğrulanamadı. Lütfen tekrar giriş yapın.");
    }

    // Elle tazeleme koruma ölçütünden GEÇMEZ ve geçmemelidir: bu akışın var
    // olma sebebi, ağ hatası yüzünden "unresolved" kalmış bir ekranda
    // kullanıcının tekrar denemesidir. Jeton aynı olsa bile okuma yapılır.
    await applyIdentity(data.session);
  }, [applyIdentity]);

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
      completeRequiredPasswordChange,
      refreshIdentity,
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
      completeRequiredPasswordChange,
      refreshIdentity,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
