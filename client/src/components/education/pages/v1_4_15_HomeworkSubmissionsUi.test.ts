import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

(globalThis as unknown as { React: typeof React }).React = React;

// Radix Dialog Portal SSR ortamında render edilmediği için dialog primitive bileşenlerini mock'luyoruz
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? createElement("div", { "data-slot": "dialog" }, children) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) =>
    createElement("div", { "data-slot": "dialog-content" }, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) =>
    createElement("div", { "data-slot": "dialog-header" }, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) =>
    createElement("div", { "data-slot": "dialog-title" }, children),
  DialogDescription: ({ children }: { children: React.ReactNode }) =>
    createElement("div", { "data-slot": "dialog-description" }, children),
}));

import { HomeworkCard } from "./HomeworkCard";
import { HomeworkSubmissionsDialog } from "./HomeworkSubmissionsDialog";
import type { Homework } from "../types";

function withQueryClient(children: React.ReactNode) {
  const queryClient = new QueryClient();
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

const sampleHomework: Homework = {
  id: "hw-101",
  title: "Türev Test 4",
  subject: "Matematik",
  classGroup: "12-A",
  classId: "cls-1",
  description: "Türev alma kuralları",
  dueDate: "20 Eylül 2026",
  rawDueDate: "2026-09-20",
  assignedDate: "13 Eylül 2026",
  status: "Aktif",
  submissionCount: 0,
  totalStudents: 15,
};

describe("HomeworkCard — v1.4-15 UI Testleri", () => {
  it("status='Tamamlandı' olduğunda yeşil ton rozet üretir", () => {
    const completedHomework: Homework = {
      ...sampleHomework,
      status: "Tamamlandı",
      submissionCount: 15,
      totalStudents: 15,
    };

    const html = renderToStaticMarkup(
      createElement(HomeworkCard, {
        homework: completedHomework,
        onManageSubmissions: vi.fn(),
      })
    );

    expect(html).toContain("Tamamlandı");
    // Yeşil rozet tonu (emerald/green)
    expect(html).toContain("text-emerald-700");
  });

  it("⛔ K-22: submissionCount === 0 olduğunda '0/15' veya '0 teslim' uydurmaz", () => {
    const zeroSubmissionHomework: Homework = {
      ...sampleHomework,
      submissionCount: 0,
      totalStudents: 15,
    };

    const html = renderToStaticMarkup(
      createElement(HomeworkCard, {
        homework: zeroSubmissionHomework,
        onManageSubmissions: vi.fn(),
      })
    );

    // K-22: Hiç işaretlenmemiş ödevde 0/15 uydurulmaz
    expect(html).not.toContain("0 / 15");
    expect(html).not.toContain("0/15");
    expect(html).not.toContain("0 teslim");
  });

  it("submissionsRecordedAt doluyken 'X / Y teslim' oranını çizer", () => {
    const recordedHomework: Homework = {
      ...sampleHomework,
      submissionCount: 7,
      totalStudents: 15,
      submissionsRecordedAt: "2026-09-13T12:00:00Z",
    };

    const html = renderToStaticMarkup(
      createElement(HomeworkCard, {
        homework: recordedHomework,
        onManageSubmissions: vi.fn(),
      })
    );

    expect(html).toContain("7 / 15 teslim");
  });

  it("⛔ submissionsRecordedAt boşken teslim sayısı hiç çizilmez (R1)", () => {
    const unrecordedHomework: Homework = {
      ...sampleHomework,
      submissionCount: 7,
      totalStudents: 15,
      submissionsRecordedAt: null,
    };

    const html = renderToStaticMarkup(
      createElement(HomeworkCard, {
        homework: unrecordedHomework,
        onManageSubmissions: vi.fn(),
      })
    );

    expect(html).not.toContain("7 / 15 teslim");
    expect(html).not.toMatch(/\d+\s*\/\s*\d+\s*teslim/);
  });

  it("onManageSubmissions verildiğinde 'Teslimler' butonu çizilir", () => {
    const html = renderToStaticMarkup(
      createElement(HomeworkCard, {
        homework: sampleHomework,
        onManageSubmissions: vi.fn(),
      })
    );

    expect(html).toContain("Teslimler");
  });
});

describe("HomeworkSubmissionsDialog — v1.4-15 Rol Güvenliği ve K-23", () => {
  const dummyStudents = [
    {
      studentId: "stu-1",
      studentName: "Ali Yılmaz",
      studentNumber: "101",
      isArchived: false,
    },
    {
      studentId: "stu-2",
      studentName: "Ayşe Kaya",
      studentNumber: "102",
      isArchived: false,
    },
    {
      studentId: "stu-3",
      studentName: "Mehmet Demir",
      studentNumber: null,
      isArchived: true, // Sınıftan ayrılmış
    },
  ];

  const dummySubmissions = new Map([
    [
      "stu-1",
      {
        id: "sub-1",
        organizationId: "org-1",
        homeworkId: "hw-101",
        studentId: "stu-1",
        recordedByMembershipId: "mem-1",
        archivedAt: null,
        createdAt: "2026-09-13T10:00:00Z",
        updatedAt: "2026-09-13T10:00:00Z",
      },
    ],
  ]);

  it("⛔ Öğrenci rolünde işaretleme butonları ('Teslim alındı' / 'İşareti kaldır'), 'İşlem' sütunu ve 'İşaretlemeyi bitir' ÇİZİLMEZ", () => {
    const html = renderToStaticMarkup(
      withQueryClient(
        createElement(HomeworkSubmissionsDialog, {
          open: true,
          onOpenChange: vi.fn(),
          organizationId: "org-1",
          homework: sampleHomework,
          role: "student",
          initialStudents: dummyStudents,
          initialSubmissions: dummySubmissions,
          initialSubmissionsRecordedAt: null,
        })
      )
    );

    // Öğrenci yalnız okur: 'İşlem' başlığı veya butonlar çizilmez
    expect(html).not.toContain(">İşlem<");
    expect(html).not.toContain("Teslim alındı");
    expect(html).not.toContain("İşareti kaldır");
    expect(html).not.toContain("İşaretlemeyi bitir");
    expect(html).not.toContain("İşaretlemeyi yeniden aç");

    // Ancak durum rozetleri görünür
    expect(html).toContain("Teslim Edildi");
    expect(html).toContain("Teslim Edilmedi");
    expect(html).toContain("İşaretleme henüz bitirilmedi");
  });

  it("⛔ Veli rolünde işaretleme ve bitirme butonları ÇİZİLMEZ", () => {
    const html = renderToStaticMarkup(
      withQueryClient(
        createElement(HomeworkSubmissionsDialog, {
          open: true,
          onOpenChange: vi.fn(),
          organizationId: "org-1",
          homework: sampleHomework,
          role: "parent",
          initialStudents: dummyStudents,
          initialSubmissions: dummySubmissions,
          initialSubmissionsRecordedAt: null,
        })
      )
    );

    expect(html).not.toContain(">İşlem<");
    expect(html).not.toContain("Teslim alındı");
    expect(html).not.toContain("İşareti kaldır");
    expect(html).not.toContain("İşaretlemeyi bitir");
    expect(html).not.toContain("İşaretlemeyi yeniden aç");
  });

  it("Öğretmen rolünde 'İşaretlemeyi bitir' butonu ve 'İşaretleme henüz bitirilmedi' rozeti çizilir", () => {
    const html = renderToStaticMarkup(
      withQueryClient(
        createElement(HomeworkSubmissionsDialog, {
          open: true,
          onOpenChange: vi.fn(),
          organizationId: "org-1",
          homework: sampleHomework,
          role: "teacher",
          initialStudents: dummyStudents,
          initialSubmissions: dummySubmissions,
          initialSubmissionsRecordedAt: null,
        })
      )
    );

    expect(html).toContain("İşaretleme henüz bitirilmedi");
    expect(html).toContain("İşaretlemeyi bitir");
  });

  it("İşaretlemesi bitirilmiş ödevde 'İşaretleme tamamlandı' rozeti ve 'İşaretlemeyi yeniden aç' butonu çizilir", () => {
    const html = renderToStaticMarkup(
      withQueryClient(
        createElement(HomeworkSubmissionsDialog, {
          open: true,
          onOpenChange: vi.fn(),
          organizationId: "org-1",
          homework: sampleHomework,
          role: "teacher",
          initialStudents: dummyStudents,
          initialSubmissions: dummySubmissions,
          initialSubmissionsRecordedAt: "2026-09-13T12:00:00Z",
        })
      )
    );

    expect(html).toContain("İşaretleme tamamlandı");
    expect(html).toContain("İşaretlemeyi yeniden aç");
    // Bitirilmiş ödevde özet sayı da gösterilir
    expect(html).toContain("1 / 3 teslim");
  });

  it("Öğretmen ve Yönetici rollerinde 'İşlem' sütunu ve işaretleme butonları çizilir", () => {
    const html = renderToStaticMarkup(
      withQueryClient(
        createElement(HomeworkSubmissionsDialog, {
          open: true,
          onOpenChange: vi.fn(),
          organizationId: "org-1",
          homework: sampleHomework,
          role: "teacher",
          initialStudents: dummyStudents,
          initialSubmissions: dummySubmissions,
        })
      )
    );

    expect(html).toContain("İşlem");
    expect(html).toContain("İşareti kaldır"); // stu-1 teslim etmiş
    expect(html).toContain("Teslim alındı"); // stu-2 teslim etmemiş
  });

  it("Bölüm 4: Sınıftan ayrılmış (arşivlenmiş kayıt) öğrencide 'Sınıftan ayrıldı' rozeti çizilir", () => {
    const html = renderToStaticMarkup(
      withQueryClient(
        createElement(HomeworkSubmissionsDialog, {
          open: true,
          onOpenChange: vi.fn(),
          organizationId: "org-1",
          homework: sampleHomework,
          role: "admin",
          initialStudents: dummyStudents,
          initialSubmissions: dummySubmissions,
        })
      )
    );

    expect(html).toContain("Mehmet Demir");
    expect(html).toContain("Sınıftan ayrıldı");
  });

  it("Bölüm 5 / task §8: Liste tavana dayandığında (truncated=true) kesilme uyarısı çizilir", () => {
    const html = renderToStaticMarkup(
      withQueryClient(
        createElement(HomeworkSubmissionsDialog, {
          open: true,
          onOpenChange: vi.fn(),
          organizationId: "org-1",
          homework: sampleHomework,
          role: "teacher",
          initialStudents: dummyStudents,
          initialSubmissions: dummySubmissions,
          initialTruncated: true,
        })
      )
    );

    expect(html).toContain(
      "Liste üst sınıra (100 kayıt) ulaştı. Kalan kayıtları görmek için filtreleyin."
    );
  });

  it("Bölüm 5 / task §8: Hata mesajı ekranda ikinci kez çevrilmeden aynen çizilir", () => {
    const serviceErrorMessage = "Öğrenci bu ödevin sınıfına kayıtlı değil.";
    const html = renderToStaticMarkup(
      withQueryClient(
        createElement(HomeworkSubmissionsDialog, {
          open: true,
          onOpenChange: vi.fn(),
          organizationId: "org-1",
          homework: sampleHomework,
          role: "teacher",
          initialStudents: dummyStudents,
          initialSubmissions: dummySubmissions,
          initialError: serviceErrorMessage,
        })
      )
    );

    expect(html).toContain(serviceErrorMessage);
  });
});
