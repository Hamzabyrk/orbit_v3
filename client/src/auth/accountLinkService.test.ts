import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Session } from "@supabase/supabase-js";
import {
  accountLinkKeys,
  translateLinkError,
  switchAccount,
  revokeParkedSession,
  getParkedSession,
  setParkedSession,
} from "./accountLinkService";
const mockSupabaseConfigured = false;
vi.mock("@/lib/supabaseClient", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supabaseClient")>(
    "@/lib/supabaseClient"
  );
  return {
    ...actual,
    get supabaseConfigured() {
      return mockSupabaseConfigured;
    },
  };
});

import { supabase } from "@/lib/supabaseClient";

// Node ortamında sessionStorage mock'u
const memoryStore = new Map<string, string>();
const mockSessionStorage = {
  getItem: (k: string) => memoryStore.get(k) ?? null,
  setItem: (k: string, v: string) => memoryStore.set(k, String(v)),
  removeItem: (k: string) => memoryStore.delete(k),
  clear: () => memoryStore.clear(),
};
Object.defineProperty(globalThis, "window", {
  value: { sessionStorage: mockSessionStorage },
  writable: true,
});

describe("accountLinkService (v1.4-17 K-23 Testleri)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    memoryStore.clear();
  });

  it("K-23 #4: details etiketine göre çeviri: code_expired ile password_not_taken_over farklı cümleler üretiyor", () => {
    const expiredMsg = translateLinkError({ details: "code_expired" });
    const pwNotTakenMsg = translateLinkError({
      details: "password_not_taken_over",
    });

    // Farklı cümleler üretmeli
    expect(expiredMsg).not.toEqual(pwNotTakenMsg);

    // Tam Türkçe karşılıkları
    expect(expiredMsg).toBe(
      "Bağlama kodunun süresi dolmuş. Yeni bir kod alın."
    );
    expect(pwNotTakenMsg).toBe(
      "Hesabı bağlamadan önce geçici şifrenizi değiştirin."
    );

    // Diğer etiketler
    expect(translateLinkError({ details: "code_unknown" })).toBe(
      "Bağlama kodu geçersiz."
    );
    expect(translateLinkError({ details: "code_consumed" })).toBe(
      "Bu kod zaten kullanılmış."
    );
    expect(translateLinkError({ details: "self_link" })).toBe(
      "Bir hesabı kendisine bağlayamazsınız."
    );
    expect(translateLinkError({ details: "consumer_without_membership" })).toBe(
      "Bu hesabın aktif bir üyeliği yok."
    );
    expect(translateLinkError({ details: "already_linked_elsewhere" })).toBe(
      "Bu hesap başka bir kişi kaydına bağlı."
    );
  });

  it("K-23 #5: switch-account 403 dönünce ekran genel cümle gösteriyor ve sunucudan gelen ham metni basmıyor", async () => {
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: {
        session: {
          access_token: "active-access-token",
          refresh_token: "active-refresh-token",
        } as unknown as Session,
      },
      error: null,
    });

    vi.spyOn(supabase.functions, "invoke").mockResolvedValue({
      data: null,
      error: Object.assign(
        new Error("Edge Function returned a non-2xx status code"),
        {
          context: {
            status: 403,
            json: async () => ({ error: "switch_refused" }),
          },
        }
      ),
    });

    let thrownError: Error | null = null;
    try {
      await switchAccount("target-uuid-403");
    } catch (err) {
      thrownError = err as Error;
    }

    expect(thrownError).not.toBeNull();
    // Genel güvenli cümle basılmalı
    expect(thrownError?.message).toBe("Bu hesaba geçiş yapılamadı.");
    // Sunucudan gelen ham hata metni sızmamalı
    expect(thrownError?.message).not.toContain("switch_refused");
    expect(thrownError?.message).not.toContain("non-2xx");
  });

  it("K-23 #3: Sayaç ikisini birden kapatıyor: park edilmiş oturumun signOut'u çağrılıyor. Çağrıyı kaldırdığında kırmızıya dönmeli", async () => {
    setParkedSession({
      access_token: "parked-access-token",
      refresh_token: "parked-refresh-token",
    });

    const mockParkedSignOut = vi.fn().mockResolvedValue({ error: null });
    const mockParkedSetSession = vi.fn().mockResolvedValue({ error: null });

    const mockFactory = vi.fn().mockReturnValue({
      auth: {
        setSession: mockParkedSetSession,
        signOut: mockParkedSignOut,
      },
    });

    await revokeParkedSession(mockFactory);

    // Park edilmiş oturum için signOut çağrılmalı!
    expect(mockParkedSetSession).toHaveBeenCalledWith({
      access_token: "parked-access-token",
      refresh_token: "parked-refresh-token",
    });
    expect(mockParkedSignOut).toHaveBeenCalled();

    // Depodaki park edilmiş jeton temizlenmiş olmalı
    expect(getParkedSession()).toBeNull();
  });

  it("K-23 R1-B: accountLinkKeys anahtar sözleşmesi aktif kullanıcı kimliğini taşır ve farklı kullanıcılar için farklı anahtar üretir", () => {
    const keyUserA = accountLinkKeys.linkedAccounts("usr-teacher-1");
    const keyUserB = accountLinkKeys.linkedAccounts("usr-parent-2");

    expect(keyUserA).toEqual([
      "accountLink",
      "linkedAccounts",
      { userId: "usr-teacher-1" },
    ]);
    expect(keyUserB).toEqual([
      "accountLink",
      "linkedAccounts",
      { userId: "usr-parent-2" },
    ]);
    // İki farklı kullanıcı için üretilen anahtarlar eşit değil
    expect(keyUserA).not.toEqual(keyUserB);
  });

  it("K-23 R1-C: Supabase yapılandırması yokken park edilmiş oturum kapatma sessizce başarılı sayılmaz (hata fırlatır)", async () => {
    setParkedSession({
      access_token: "mock-parked-access",
      refresh_token: "mock-parked-refresh",
    });

    // customClientFactory verilmediğinde ve supabaseConfigured false iken
    // sessizce başarılı sayılmamalı, hata fırlatmalıdır.
    await expect(revokeParkedSession()).rejects.toThrow(
      /yapılandırma|yapılandırması/i
    );
  });
});
