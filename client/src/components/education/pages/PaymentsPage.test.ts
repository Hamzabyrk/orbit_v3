import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

(globalThis as unknown as { React: typeof React }).React = React;

import { PaymentsPage } from "./PaymentsPage";
import { PaymentPlanDetailDialog } from "./PaymentPlanDetailDialog";
import type { PaymentRow, Role } from "../types";
import type { Installment } from "@/education/paymentService";

// usePlanInstallments'ı mock'luyoruz böylece ağ çağrısı yapmadan farklı taksit senaryolarını test edebiliyoruz
const mockUsePlanInstallments = vi.fn();

vi.mock("@/education/educationQueries", async importOriginal => {
  const actual =
    await importOriginal<typeof import("@/education/educationQueries")>();
  return {
    ...actual,
    usePlanInstallments: (...args: unknown[]) =>
      mockUsePlanInstallments(...args),
  };
});

// Radix Dialog Portal SSR ortamında (renderToStaticMarkup) çocuklarını gizler; test ortamında doğrudan render edilmesi için mock'luyoruz
vi.mock("@/components/ui/dialog", async importOriginal => {
  const actual =
    await importOriginal<typeof import("@/components/ui/dialog")>();
  return {
    ...actual,
    Dialog: ({ children }: { children?: React.ReactNode }) =>
      createElement("div", { "data-slot": "dialog" }, children),
    DialogContent: ({
      children,
      className,
    }: {
      children?: React.ReactNode;
      className?: string;
    }) =>
      createElement(
        "div",
        { "data-slot": "dialog-content", className },
        children
      ),
    DialogHeader: ({
      children,
      className,
    }: {
      children?: React.ReactNode;
      className?: string;
    }) =>
      createElement(
        "div",
        { "data-slot": "dialog-header", className },
        children
      ),
    DialogTitle: ({
      children,
      className,
    }: {
      children?: React.ReactNode;
      className?: string;
    }) =>
      createElement("h2", { "data-slot": "dialog-title", className }, children),
    DialogDescription: ({
      children,
      className,
    }: {
      children?: React.ReactNode;
      className?: string;
    }) =>
      createElement(
        "p",
        { "data-slot": "dialog-description", className },
        children
      ),
    DialogFooter: ({
      children,
      className,
    }: {
      children?: React.ReactNode;
      className?: string;
    }) =>
      createElement(
        "div",
        { "data-slot": "dialog-footer", className },
        children
      ),
    DialogClose: ({ children }: { children?: React.ReactNode }) =>
      createElement("button", { "data-slot": "dialog-close" }, children),
    DialogPortal: ({ children }: { children?: React.ReactNode }) =>
      createElement(React.Fragment, null, children),
  };
});

function wrapWithQuery(element: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, element);
}

describe("PaymentsPage UI Davranışları (v1.4-06 · #277)", () => {
  const sampleRows: PaymentRow[] = [
    {
      id: "plan-1",
      studentId: "student-1",
      student: "Canan Yılmaz",
      plan: "LGS Hazırlık Paketi",
      due: "15 Ekim 2026",
      amount: "₺4.500",
      totalAmount: 45000,
      status: "Güncel",
    },
    {
      id: "plan-2",
      studentId: "student-2",
      student: "Mert Demir",
      plan: "YKS Eşit Ağırlık",
      due: "01 Kasım 2026",
      amount: "₺6.000",
      totalAmount: 60000,
      status: "Takip gerekli",
    },
  ];

  it("tavan kısıtına ulaşıldığında (truncated: true) kesilme uyarısı açıkça söylenir; normalde söylenmez", () => {
    const htmlTruncated = renderToStaticMarkup(
      createElement(PaymentsPage, {
        role: "admin",
        paymentRows: sampleRows,
        truncated: true,
        limit: 50,
        isDemo: false,
      })
    );
    expect(htmlTruncated).toContain('data-testid="payments-truncated-banner"');
    expect(htmlTruncated).toContain("50 kayıt");
    expect(htmlTruncated).toContain("Liste üst sınıra");

    const htmlNormal = renderToStaticMarkup(
      createElement(PaymentsPage, {
        role: "admin",
        paymentRows: sampleRows,
        truncated: false,
        limit: 50,
        isDemo: false,
      })
    );
    expect(htmlNormal).not.toContain('data-testid="payments-truncated-banner"');
    expect(htmlNormal).not.toContain("Liste üst sınıra");
  });

  it("admin rolünde 'Yeni plan' butonu yer alır; öğretmen, öğrenci veya velide KESİNLİKLE yer almaz", () => {
    const onAddPlan = vi.fn();

    const adminHtml = renderToStaticMarkup(
      createElement(PaymentsPage, {
        role: "admin",
        paymentRows: sampleRows,
        onAddPlan,
        isDemo: false,
      })
    );
    expect(adminHtml).toContain("Yeni plan");

    const nonAdminRoles: Role[] = ["teacher", "student", "parent"];
    for (const role of nonAdminRoles) {
      const html = renderToStaticMarkup(
        createElement(PaymentsPage, {
          role,
          paymentRows: sampleRows,
          onAddPlan,
          isDemo: false,
        })
      );
      expect(html).not.toContain("Yeni plan");
    }
  });

  it("onSelectPlan sağlandığında üretim veya demo fark etmeksizin 'Detay' butonu çizilir; onSelectPlan yoksa KESİNLİKLE ÇİZİLMEZ (R3, #277)", () => {
    const onSelectPlan = vi.fn();

    // Üretimde onSelectPlan varken Detay var
    const htmlProdWithSelect = renderToStaticMarkup(
      createElement(PaymentsPage, {
        role: "admin",
        paymentRows: sampleRows,
        onSelectPlan,
        isDemo: false,
      })
    );
    expect(htmlProdWithSelect).toContain("Detay");

    // Demoda onSelectPlan varken Detay var (eski item.id || !activeDemo kısıtı kalktı)
    const htmlDemoWithSelect = renderToStaticMarkup(
      createElement(PaymentsPage, {
        role: "admin",
        paymentRows: sampleRows,
        onSelectPlan,
        isDemo: true,
      })
    );
    expect(htmlDemoWithSelect).toContain("Detay");

    // onSelectPlan yoksa ne üretimde ne demoda Detay butonu çizilmez
    const htmlProdWithoutSelect = renderToStaticMarkup(
      createElement(PaymentsPage, {
        role: "admin",
        paymentRows: sampleRows,
        isDemo: false,
      })
    );
    expect(htmlProdWithoutSelect).not.toContain("Detay");
  });

  it("status undefined olduğunda ödeme rozeti ÇİZİLMEZ (K-22: sahte Güncel rozeti konmaz)", () => {
    const rowWithoutPlan: PaymentRow = {
      id: "plan-test-3",
      studentId: "stu-3",
      student: "Plânsız Öğrenci",
      plan: "—",
      due: "—",
      amount: "—",
      totalAmount: 0,
      status: undefined,
    };

    const html = renderToStaticMarkup(
      createElement(PaymentsPage, {
        role: "admin",
        paymentRows: [rowWithoutPlan],
        isDemo: false,
      })
    );

    expect(html).toContain("Plânsız Öğrenci");
    expect(html).not.toContain("Güncel");
    expect(html).not.toContain("Takip gerekli");
  });
});

describe("PaymentPlanDetailDialog & Taksit Tutarsızlık Uyarı Mantığı (v1.4-06 #277)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const basePlan = {
    id: "plan-123",
    studentId: "student-1",
    studentName: "Canan Yılmaz",
    name: "2026-2027 LGS Hazırlık Paketi",
    totalAmount: 30000,
  };

  it("🔴 Plan toplamı ile taksitlerin toplamı TUTMADIĞINDA ekran uyarıyı söyler; plan toplamı, taksit toplamı ve farkı net gösterir", () => {
    // 30.000 TL plan toplamı, ancak taksitler toplamı 25.000 TL
    const mockInstallments: Installment[] = [
      {
        id: "inst-1",
        organizationId: "org-1",
        planId: "plan-123",
        sequenceNo: 1,
        dueDate: "2026-10-15",
        amount: 15000,
        paidAt: null,
      },
      {
        id: "inst-2",
        organizationId: "org-1",
        planId: "plan-123",
        sequenceNo: 2,
        dueDate: "2026-11-15",
        amount: 10000,
        paidAt: null,
      },
    ];

    mockUsePlanInstallments.mockReturnValue({
      data: mockInstallments,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const html = renderToStaticMarkup(
      wrapWithQuery(
        createElement(PaymentPlanDetailDialog, {
          open: true,
          onOpenChange: vi.fn(),
          organizationId: "org-1",
          role: "admin",
          plan: basePlan,
          onEditPlan: vi.fn(),
          onPlanArchived: vi.fn(),
        })
      )
    );

    // Uyarı kutusu görünmeli
    expect(html).toContain('data-testid="payment-plan-discrepancy-warning"');
    // Plan toplamı, taksit toplamı ve fark görünmeli
    expect(html).toContain("₺30.000"); // Plan toplamı
    expect(html).toContain("₺25.000"); // Taksitler toplamı
    expect(html).toContain("₺5.000"); // Fark: |30000 - 25000|
  });

  it("🔴 Plan toplamı ile taksitlerin toplamı EŞİT OLDUĞUNDA uyarı KESİNLİKLE ÇİZİLMEZ", () => {
    // 30.000 TL plan toplamı ve taksitler toplamı da 30.000 TL
    const mockInstallments: Installment[] = [
      {
        id: "inst-1",
        organizationId: "org-1",
        planId: "plan-123",
        sequenceNo: 1,
        dueDate: "2026-10-15",
        amount: 15000,
        paidAt: null,
      },
      {
        id: "inst-2",
        organizationId: "org-1",
        planId: "plan-123",
        sequenceNo: 2,
        dueDate: "2026-11-15",
        amount: 15000,
        paidAt: null,
      },
    ];

    mockUsePlanInstallments.mockReturnValue({
      data: mockInstallments,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const html = renderToStaticMarkup(
      wrapWithQuery(
        createElement(PaymentPlanDetailDialog, {
          open: true,
          onOpenChange: vi.fn(),
          organizationId: "org-1",
          role: "admin",
          plan: basePlan,
          onEditPlan: vi.fn(),
          onPlanArchived: vi.fn(),
        })
      )
    );

    // Uyarı kutusu KESİNLİKLE çizilmemeli
    expect(html).not.toContain(
      'data-testid="payment-plan-discrepancy-warning"'
    );
    expect(html).not.toContain("uyuşmuyor");
  });

  it("veli rolünde taksit ekleme/düzenleme/arşivleme butonları çizilmez (salt okunur)", () => {
    mockUsePlanInstallments.mockReturnValue({
      data: [
        {
          id: "inst-1",
          organizationId: "org-1",
          planId: "plan-123",
          sequenceNo: 1,
          dueDate: "2026-10-15",
          amount: 30000,
          paidAt: null,
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const parentHtml = renderToStaticMarkup(
      wrapWithQuery(
        createElement(PaymentPlanDetailDialog, {
          open: true,
          onOpenChange: vi.fn(),
          organizationId: "org-1",
          role: "parent",
          plan: basePlan,
        })
      )
    );

    expect(parentHtml).not.toContain("+ Taksit Ekle");
    expect(parentHtml).not.toContain("Planı Düzenle");
    expect(parentHtml).not.toContain("Planı Arşivle");
    expect(parentHtml).not.toContain("Ödendi İşaretle");
    expect(parentHtml).not.toContain("Arşivle");
  });

  it("taksit ödendiğinde yeşil 'Ödendi', ödenmediğinde 'Bekliyor' rozeti çizilir", () => {
    mockUsePlanInstallments.mockReturnValue({
      data: [
        {
          id: "inst-1",
          organizationId: "org-1",
          planId: "plan-123",
          sequenceNo: 1,
          dueDate: "2026-10-15",
          amount: 15000,
          paidAt: "2026-10-14T10:00:00Z",
        },
        {
          id: "inst-2",
          organizationId: "org-1",
          planId: "plan-123",
          sequenceNo: 2,
          dueDate: "2026-11-15",
          amount: 15000,
          paidAt: null,
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const html = renderToStaticMarkup(
      wrapWithQuery(
        createElement(PaymentPlanDetailDialog, {
          open: true,
          onOpenChange: vi.fn(),
          organizationId: "org-1",
          role: "admin",
          plan: basePlan,
        })
      )
    );

    expect(html).toContain("Ödendi (14 Ekim 2026)");
    expect(html).toContain("Bekliyor");
    expect(html).toContain("Ödemeyi Geri Al");
    expect(html).toContain("Ödendi İşaretle");
  });
});
