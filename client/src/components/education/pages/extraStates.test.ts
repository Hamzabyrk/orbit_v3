import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Vitest config runs in node without react plugin, so JSX compiled by esbuild expects React in global scope
(globalThis as unknown as { React: typeof React }).React = React;

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/auth/AuthContext";
import type { AuthContextValue } from "@/auth/types";
import { AuditLogPage } from "./AuditLogPage";
import { SettingsMembersSection } from "./SettingsMembersSection";
import { MemberCreateDialog } from "./MemberCreateDialog";
import { useOrganizationAuditEvents } from "@/audit/auditQueries";
import {
  useSettingsBranches,
  useSettingsMembers,
} from "@/settings/settingsQueries";

vi.mock("@/audit/auditQueries", () => ({
  useOrganizationAuditEvents: vi.fn(),
}));

vi.mock("@/settings/settingsQueries", () => ({
  useSettingsMembers: vi.fn(),
  useSettingsBranches: vi.fn(),
  settingsKeys: { members: () => ["settings", "members"] },
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) =>
    createElement("div", { "data-slot": "dialog" }, children),
  DialogContent: ({ children }: { children: React.ReactNode }) =>
    createElement("div", { "data-slot": "dialog-content" }, children),
  DialogDescription: ({ children }: { children: React.ReactNode }) =>
    createElement("div", { "data-slot": "dialog-description" }, children),
  DialogFooter: ({ children }: { children: React.ReactNode }) =>
    createElement("div", { "data-slot": "dialog-footer" }, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) =>
    createElement("div", { "data-slot": "dialog-header" }, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) =>
    createElement("div", { "data-slot": "dialog-title" }, children),
  useDialogComposition: () => ({
    isComposingRef: { current: false },
    handleCompositionStart: () => {},
    handleCompositionEnd: () => {},
  }),
}));

function renderWithProviders(component: React.ReactElement, demoMode = false) {
  const dummyAuth: AuthContextValue = {
    identity: null,
    loading: false,
    demoMode,
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
  const queryClient = new QueryClient();
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(AuthContext.Provider, { value: dummyAuth }, component)
    )
  );
}

describe("AuditLogPage states (v1.3-02b)", () => {
  it("renders TableSkeleton and does not render 'Denetim kaydı yükleniyor…' during loading", () => {
    vi.mocked(useOrganizationAuditEvents).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useOrganizationAuditEvents>);

    const html = renderToStaticMarkup(createElement(AuditLogPage));
    expect(html).toContain('role="status"');
    expect(html).not.toContain("Denetim kaydı yükleniyor…");
  });

  it("renders ErrorState with 'Tekrar dene' button on error", () => {
    vi.mocked(useOrganizationAuditEvents).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Sorgu koptu"),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useOrganizationAuditEvents>);

    const html = renderToStaticMarkup(createElement(AuditLogPage));
    expect(html).toContain("Denetim kaydı görüntülenemedi");
    expect(html).toContain("Tekrar dene");
  });
});

describe("SettingsMembersSection states (v1.3-02b)", () => {
  beforeEach(() => {
    vi.mocked(useSettingsBranches).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useSettingsBranches>);
  });

  it("renders TableSkeleton and avoids 'Üye listesi yükleniyor…' during loading", () => {
    vi.mocked(useSettingsMembers).mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useSettingsMembers>);

    const html = renderWithProviders(
      createElement(SettingsMembersSection),
      false
    );
    expect(html).toContain('role="status"');
    expect(html).not.toContain("Üye listesi yükleniyor…");
  });

  it("renders ErrorState with 'Tekrar dene' button on error in non-demo mode", () => {
    vi.mocked(useSettingsMembers).mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error("Yetkisiz erişim"),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useSettingsMembers>);

    const html = renderWithProviders(
      createElement(SettingsMembersSection),
      false
    );
    expect(html).toContain("Üye listesi alınamadı");
    expect(html).toContain("Tekrar dene");
  });
});

describe("MemberCreateDialog states (v1.3-02b)", () => {
  it("renders inline skeleton and avoids visible 'Şubeler yükleniyor…' text when branchLoading", () => {
    vi.mocked(useSettingsBranches).mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useSettingsBranches>);

    const html = renderWithProviders(
      createElement(MemberCreateDialog, {
        open: true,
        onOpenChange: vi.fn(),
        onDone: vi.fn(),
        organizationId: "org-1",
      })
    );

    expect(html).toContain('role="status"');
    expect(html).not.toMatch(/<p[^>]*>.*Şubeler yükleniyor.*<\/p>/i);
  });
});
