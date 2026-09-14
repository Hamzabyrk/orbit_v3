import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AccountSwitchMenu } from "./AccountSwitchMenu";
import type { LinkedAccount } from "@/auth/accountLinkService";

(globalThis as unknown as { React: typeof React }).React = React;

vi.mock("@/auth/runtime", () => ({
  isDemoMode: false,
}));

vi.mock("@/auth/accountLinkService", async () => {
  const actual = await vi.importActual<
    typeof import("@/auth/accountLinkService")
  >("@/auth/accountLinkService");
  return {
    ...actual,
    useLinkedAccounts: vi.fn().mockReturnValue({ data: [], isLoading: false }),
    switchAccount: vi.fn(),
  };
});

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children?: React.ReactNode }) =>
    createElement("div", { "data-slot": "account-switch-menu" }, children),
  DropdownMenuTrigger: ({
    children,
  }: {
    children?: React.ReactNode;
    asChild?: boolean;
  }) => createElement(React.Fragment, null, children),
  DropdownMenuContent: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) =>
    createElement(
      "div",
      { "data-slot": "dropdown-menu-content", ...props },
      children
    ),
  DropdownMenuItem: ({
    children,
    disabled,
    onSelect,
    ...props
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
    onSelect?: () => void;
    [key: string]: unknown;
  }) =>
    createElement(
      "button",
      {
        type: "button",
        disabled,
        onClick: onSelect,
        ...props,
      },
      children
    ),
}));

describe("AccountSwitchMenu (v1.4-17 K-23 Menü Testleri)", () => {
  it("K-23 #1: Menü tek hesapta HİÇ çizilmiyor (boş liste ve tek satır — iki ayrı durum, ikisi de)", () => {
    // Durum 1: Boş liste (kişi kaydı yok / bağlı hesap yok)
    const emptyHtml = renderToStaticMarkup(
      createElement(AccountSwitchMenu, { accounts: [] })
    );
    expect(emptyHtml).toBe("");
    expect(emptyHtml).not.toContain('data-slot="account-switch-menu"');
    expect(emptyHtml).not.toContain("Hesap Değiştir");

    // Durum 2: Tek hesap bağlı
    const singleAccount: LinkedAccount[] = [
      {
        userId: "user-1",
        displayName: "Ahmet Yılmaz",
        role: "teacher",
        organizationId: "org-1",
        organizationName: "Güneş Dershanesi",
        isCurrent: true,
      },
    ];
    const singleHtml = renderToStaticMarkup(
      createElement(AccountSwitchMenu, { accounts: singleAccount })
    );
    expect(singleHtml).toBe("");
    expect(singleHtml).not.toContain('data-slot="account-switch-menu"');
    expect(singleHtml).not.toContain("Hesap Değiştir");
  });

  it("K-23 #2: İki hesapta rol ve kurum görünüyor, is_current olan tıklanamıyor", () => {
    const twoAccounts: LinkedAccount[] = [
      {
        userId: "user-1",
        displayName: "Ahmet Yılmaz",
        role: "teacher",
        organizationId: "org-1",
        organizationName: "Güneş Dershanesi",
        isCurrent: true,
      },
      {
        userId: "user-2",
        displayName: "Ahmet Yılmaz",
        role: "parent",
        organizationId: "org-2",
        organizationName: "Yıldız Kursu",
        isCurrent: false,
      },
    ];

    const html = renderToStaticMarkup(
      createElement(AccountSwitchMenu, { accounts: twoAccounts })
    );

    // Menü çizilmeli
    expect(html).toContain('data-slot="account-switch-menu"');

    // İki hesapta da rol ve kurum adı görünmeli
    // Öğretmen ve Güneş Dershanesi
    expect(html).toContain("Öğretmen");
    expect(html).toContain("Güneş Dershanesi");

    // Veli ve Yıldız Kursu
    expect(html).toContain("Veli");
    expect(html).toContain("Yıldız Kursu");

    // is_current olan hesap (user-1) seçili ve tıklanamaz (disabled) olmalı
    expect(html).toMatch(/<button[^>]*disabled[^>]*data-current="true"/);

    // Diğer hesap (user-2) ise tıklanabilir (disabled DEĞİL)
    expect(html).toMatch(/<button(?![^>]*disabled)[^>]*data-current="false"/);
  });
});
