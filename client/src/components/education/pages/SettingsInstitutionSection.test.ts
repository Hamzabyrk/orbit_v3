import { readFileSync } from "node:fs";
import path from "node:path";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/auth/AuthContext";
import type { AuthContextValue } from "@/auth/types";
import type { EducationRole } from "@/components/educationAccess";
import { SettingsInstitutionSection } from "./SettingsInstitutionSection";
import { useBranches } from "@/settings/settingsQueries";
import type { Branch } from "@/organization/branchService";

(globalThis as unknown as { React: typeof React }).React = React;

vi.mock("@/settings/settingsQueries", () => ({
  useBranches: vi.fn(),
  settingsKeys: {
    branches: (orgId: string) => ["settings", "branches", orgId],
    members: (orgId: string) => ["settings", "members", orgId],
    all: ["settings"],
  },
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children?: React.ReactNode;
    open?: boolean;
  }) =>
    createElement(
      "div",
      { "data-slot": "dialog", "data-open": open },
      open ? children : null
    ),
  DialogContent: ({ children }: { children?: React.ReactNode }) =>
    createElement("div", { "data-slot": "dialog-content" }, children),
  DialogHeader: ({ children }: { children?: React.ReactNode }) =>
    createElement("div", { "data-slot": "dialog-header" }, children),
  DialogTitle: ({ children }: { children?: React.ReactNode }) =>
    createElement("h2", { "data-slot": "dialog-title" }, children),
  DialogDescription: ({ children }: { children?: React.ReactNode }) =>
    createElement("p", { "data-slot": "dialog-description" }, children),
  DialogFooter: ({ children }: { children?: React.ReactNode }) =>
    createElement("div", { "data-slot": "dialog-footer" }, children),
  useDialogComposition: () => ({
    isComposing: () => false,
    setComposing: () => {},
    justEndedComposing: () => false,
    markCompositionEnd: () => {},
  }),
}));

function renderWithAuth(
  ui: React.ReactElement,
  options?: {
    role?: EducationRole;
    userId?: string;
    orgId?: string;
  }
) {
  const queryClient = new QueryClient();
  const dummyAuth: AuthContextValue = {
    identity: {
      user: {
        id: options?.userId ?? "usr-admin",
        email: "admin@orbit.local",
        phone: null,
        created_at: "",
      },
      membership: {
        id: "mem-1",
        membershipId: "mem-1",
        role: options?.role ?? "admin",
        organizationId: options?.orgId ?? "org-1",
        organizationName: "Güneş Dershanesi",
        branchName: "Kadıköy Şubesi",
      },
    } as unknown as AuthContextValue["identity"],
    loading: false,
    demoMode: false,
    passwordRecovery: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    switchDemoRole: vi.fn(),
    requestPasswordReset: vi.fn(),
    completePasswordReset: vi.fn(),
    cancelPasswordRecovery: vi.fn(),
    completeRequiredPasswordChange: vi.fn(),
    refreshIdentity: vi.fn(),
  };

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(AuthContext.Provider, { value: dummyAuth }, ui)
    )
  );
}

const mockBranches: Branch[] = [
  {
    id: "b-1",
    organizationId: "org-1",
    name: "Kadıköy Şubesi",
    isDefault: true,
    archivedAt: null,
  },
  {
    id: "b-2",
    organizationId: "org-1",
    name: "Beşiktaş Şubesi",
    isDefault: false,
    archivedAt: null,
  },
  {
    id: "b-3",
    organizationId: "org-1",
    name: "Üsküdar Şubesi",
    isDefault: false,
    archivedAt: null,
  },
];

describe("SettingsInstitutionSection (v1.4-09 · #284)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Varsayılan şube listede işaretlidir; birden fazla işaretli çizilmez", () => {
    vi.mocked(useBranches).mockReturnValue({
      data: {
        rows: mockBranches,
        truncated: false,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useBranches>);

    const html = renderWithAuth(createElement(SettingsInstitutionSection));

    // Şubeler çizilmeli
    expect(html).toContain("Kadıköy Şubesi");
    expect(html).toContain("Beşiktaş Şubesi");
    expect(html).toContain("Üsküdar Şubesi");

    // "Varsayılan" badge'i yalnız bir kez çizilmeli (birden fazla işaretli çizilmez)
    const matches = html.match(/Varsayılan/g);
    expect(matches).not.toBeNull();
    // "Varsayılan" metni: 1 tane Kadıköy rozeti, 2 tane "Varsayılan Yap" butonu (Beşiktaş ve Üsküdar için)
    // Rozet olarak incelendiğinde:
    expect(html).toContain("bg-emerald-50 text-emerald-700");
    const badgeMatches = html.match(/bg-emerald-50 text-emerald-700/g);
    expect(badgeMatches).toHaveLength(1);
  });

  it("2. Varsayılan şubenin üzerinde 'Varsayılan Yap' butonu çizilmez, diğerlerinde çizilir", () => {
    vi.mocked(useBranches).mockReturnValue({
      data: {
        rows: mockBranches,
        truncated: false,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useBranches>);

    const html = renderWithAuth(createElement(SettingsInstitutionSection));

    // 3 şube var, 1'i varsayılan -> 2 adet "Varsayılan Yap" butonu olmalı
    const makeDefaultMatches = html.match(/Varsayılan Yap/g);
    expect(makeDefaultMatches).toHaveLength(2);
  });

  it("3. Yönetici olmayan rolde şube ekle/düzenle/varsayılan/kapat butonları çizilmez", () => {
    vi.mocked(useBranches).mockReturnValue({
      data: {
        rows: mockBranches,
        truncated: false,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useBranches>);

    for (const nonAdminRole of [
      "teacher",
      "student",
      "parent",
    ] as EducationRole[]) {
      const html = renderWithAuth(createElement(SettingsInstitutionSection), {
        role: nonAdminRole,
      });

      expect(html).not.toContain("Yeni Şube Ekle");
      expect(html).not.toContain("Düzenle");
      expect(html).not.toContain("Varsayılan Yap");
      expect(html).not.toMatch(/>Kapat<\/span>/);
      expect(html).not.toContain("Yeniden Aç");
    }
  });

  it("4. Yönetici rolünde şube ekle/düzenle/kapat butonları çizilir", () => {
    vi.mocked(useBranches).mockReturnValue({
      data: {
        rows: mockBranches,
        truncated: false,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useBranches>);

    const html = renderWithAuth(createElement(SettingsInstitutionSection), {
      role: "admin",
    });

    expect(html).toContain("Yeni Şube Ekle");
    expect(html).toContain("Düzenle");
    expect(html).toMatch(/>Kapat<\/span>/);
  });

  it("5. Şube listesi tavana dayandığında (truncated: true) kesilme uyarısı söylenir", () => {
    vi.mocked(useBranches).mockReturnValue({
      data: {
        rows: mockBranches,
        truncated: true,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useBranches>);

    const html = renderWithAuth(createElement(SettingsInstitutionSection));

    expect(html).toContain("Şube listesi üst sınıra ulaştı");
    expect(html).toContain(
      "Tüm şubelerin görüntülenebilmesi için kullanılmayan şubeleri arşivleyin"
    );
  });

  it("6. Sınır dolmadığında (truncated: false) kesilme bandı çizilmez", () => {
    vi.mocked(useBranches).mockReturnValue({
      data: {
        rows: mockBranches,
        truncated: false,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useBranches>);

    const html = renderWithAuth(createElement(SettingsInstitutionSection));

    expect(html).not.toContain("Şube listesi üst sınıra ulaştı");
  });

  it("7. Arşivlenmiş şube listelendiğinde 'Kapatıldı' rozeti ve 'Yeniden Aç' butonu çizilir", () => {
    const archivedBranch: Branch = {
      id: "b-archived",
      organizationId: "org-1",
      name: "Eski Bakırköy Şubesi",
      isDefault: false,
      archivedAt: "2026-09-01T00:00:00Z",
    };

    vi.mocked(useBranches).mockReturnValue({
      data: {
        rows: [archivedBranch],
        truncated: false,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useBranches>);

    const html = renderWithAuth(createElement(SettingsInstitutionSection), {
      role: "admin",
    });

    expect(html).toContain("Eski Bakırköy Şubesi");
    expect(html).toContain("Kapatıldı");
    expect(html).toContain("Yeniden Aç");
    expect(html).not.toContain("Varsayılan Yap");
  });

  describe("hata cümlesi ekrana taşınır, yeniden çevrilmez (denetleyen turu)", () => {
    // ⚠️ Bu iddia YAPISAL ve öyle olmak zorunda: kusur yalnız bir yazma
    // BAŞARISIZ olduğunda ortaya çıkıyor, statik çizimde ise hiçbir yazma
    // koşmuyor. Bileşenin `catch` bloğunu çalıştırmadan gözlenemiyor.
    //
    // Ölçülen kusur: `branchService` her yazmada hatayı çevirip
    // `new Error(çeviri)` fırlatıyor. Ekran o `Error`'ı bir daha
    // `translateBranchError`'dan geçirince cümle tanınmıyor ve genel yedeğe
    // düşüyordu — "içinde aktif 3 öğrenci, 2 sınıf, 1 üye kaydı bulunuyor"
    // ekrana "Şube işlemi gerçekleştirilemedi" olarak çıkıyordu. K-14
    // mesajları da aynı yerde kayboluyordu.
    //
    // Çevirmenin bu davranışı `branchService.test.ts`'te ayrıca çivili;
    // burada çivilenen şey ekranın ikinci çeviriyi YAPMAMASI.
    it("bileşen `translateBranchError` çağırmaz — servisin cümlesini olduğu gibi taşır", () => {
      const kaynak = readFileSync(
        path.join(import.meta.dirname, "SettingsInstitutionSection.tsx"),
        "utf8"
      );
      const kod = kaynak
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/(^|[^:])\/\/[^\n]*/gm, "$1");

      expect(kod).not.toContain("translateBranchError");
      expect(kod).toContain("err instanceof Error");
    });
  });
});
