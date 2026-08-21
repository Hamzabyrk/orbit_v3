import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { EducationRole } from "@/components/educationAccess";
import { roleMeta } from "@/components/education/mockData";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [identity, setIdentity] = useState<AuthIdentity | null>(null);
  const [loading, setLoading] = useState(!isDemoMode);

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
      (_event, session) => {
        window.setTimeout(() => {
          if (!active) return;
          void restoreSession(session).catch(() => setIdentity(null));
        }, 0);
      }
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [restoreSession]);

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

  const value = useMemo(
    () => ({
      identity,
      loading,
      demoMode: isDemoMode,
      signIn,
      signOut,
      switchDemoRole,
    }),
    [identity, loading, signIn, signOut, switchDemoRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
