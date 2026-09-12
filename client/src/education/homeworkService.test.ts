import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as unknown as { React: typeof React }).React = React;

import {
  DEFAULT_HOMEWORK_LIMIT,
  archiveHomework,
  createHomework,
  extractClassName,
  extractSubjectName,
  loadHomework,
  loadStaffNames,
  loadSubjects,
  mapHomeworkRow,
  restoreHomework,
  translateHomeworkError,
  updateHomework,
  type RawHomeworkRow,
} from "./homeworkService";
import { HomeworkCard } from "@/components/education/pages/HomeworkCard";
import { HomeworkPage } from "@/components/education/pages/HomeworkPage";
import { HomeworkCreateDialog } from "@/components/education/pages/HomeworkCreateDialog";
import { ReportsPage } from "@/components/education/pages/ReportsPage";
import type { Homework } from "@/components/education/types";

const fromMock = vi.fn();
const rpcMock = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: (table: string) => fromMock(table),
    rpc: (fn: string, args: unknown) => rpcMock(fn, args),
  },
}));

vi.mock("@/auth/useAuth", () => ({
  useAuth: () => ({
    identity: {
      membership: {
        role: "teacher",
        organizationId: "org-1",
        membershipId: "mem-1",
      },
      displayName: "Merve Hoca",
    },
  }),
}));

vi.mock("@/education/educationQueries", () => ({
  useSubjects: () => ({ data: [], isLoading: false, error: null }),
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

type QueryResult = { data: unknown; error: unknown };

function createQueryChain(
  result: QueryResult,
  spy?: {
    selectArg?: string;
    isArgs?: [string, unknown];
    orderArgs?: [string, { ascending?: boolean }][];
    limitArg?: number;
    eqArgs?: [string, unknown][];
    insertArg?: unknown;
    updateArg?: unknown;
  }
) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn((columns?: string) => {
    if (spy && columns) spy.selectArg = columns;
    return chain;
  });
  chain.eq = vi.fn((col: string, val: unknown) => {
    if (spy) {
      if (!spy.eqArgs) spy.eqArgs = [];
      spy.eqArgs.push([col, val]);
    }
    return chain;
  });
  chain.is = vi.fn((col: string, val: unknown) => {
    if (spy) spy.isArgs = [col, val];
    return chain;
  });
  chain.order = vi.fn((col: string, opts: { ascending?: boolean }) => {
    if (spy) {
      if (!spy.orderArgs) spy.orderArgs = [];
      spy.orderArgs.push([col, opts]);
    }
    return chain;
  });
  chain.limit = vi.fn((limit: number) => {
    if (spy) spy.limitArg = limit;
    return chain;
  });
  chain.insert = vi.fn((payload: unknown) => {
    if (spy) spy.insertArg = payload;
    return chain;
  });
  chain.update = vi.fn((payload: unknown) => {
    if (spy) spy.updateArg = payload;
    return chain;
  });
  chain.single = vi.fn(() => Promise.resolve(result));
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  chain.then = (
    onfulfilled?: (value: QueryResult) => unknown,
    onrejected?: (reason: unknown) => unknown
  ) => Promise.resolve(result).then(onfulfilled, onrejected);
  return chain;
}

describe("homeworkService (v1.4-05 · #273 Ödev Akışı)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockResolvedValue({ data: [], error: null });
  });

  describe("Hata Çevirisi (translateHomeworkError)", () => {
    it("42501 kodunu kullanıcı dostu yetki mesajına çevirir", () => {
      const msg = translateHomeworkError({ code: "42501" });
      expect(msg).toContain("Bu işlem için yetkiniz yok");
      expect(msg).toContain("öğretmeni");
    });

    it("23503 kodunu sınıf veya ders bulunamadı mesajına çevirir", () => {
      const msg = translateHomeworkError({ code: "23503" });
      expect(msg).toContain("Seçilen sınıf veya ders bulunamadı");
    });

    it("23514 kodunda son teslim tarihi kuralını doğru açıklar", () => {
      const msg = translateHomeworkError({
        code: "23514",
        message: "check constraint homework_assignments_due_check violated",
      });
      expect(msg).toBe(
        "Son teslim tarihi ödevin verildiği tarihten önce olamaz."
      );
    });

    it("23514 kodunda başlık uzunluğu kısıtını açıklar", () => {
      const msg = translateHomeworkError({ code: "23514" });
      expect(msg).toBe("Ödev başlığı 1 ile 200 karakter arasında olmalıdır.");
    });
  });

  describe("Yardımcılar (extractClassName, extractSubjectName)", () => {
    it("arşivlenmiş sınıflar için null döner", () => {
      expect(
        extractClassName({ name: "12-A", archived_at: "2026-09-01T00:00:00Z" })
      ).toBeNull();
    });

    it("geçerli sınıf adını kırparak döner", () => {
      expect(extractClassName({ name: "  12-A  ", archived_at: null })).toBe(
        "12-A"
      );
    });

    it("arşivlenmiş dersler için null döner", () => {
      expect(
        extractSubjectName({
          name: "Fizik",
          archived_at: "2026-09-01T00:00:00Z",
        })
      ).toBeNull();
    });

    it("ders yoksa null döner", () => {
      expect(extractSubjectName(null)).toBeNull();
    });
  });

  describe("Ödevi Kimin Verdiği (loadStaffNames & K-22)", () => {
    it("class_staff_names RPC çağrısı ile üyelik adlarını toplar", async () => {
      rpcMock.mockResolvedValueOnce({
        data: [
          {
            class_id: "cls-1",
            membership_id: "mem-1",
            display_name: "Ali Öğretmen",
          },
        ],
        error: null,
      });

      const map = await loadStaffNames(["cls-1"]);
      expect(rpcMock).toHaveBeenCalledWith("class_staff_names", {
        target_class_ids: ["cls-1"],
      });
      expect(map.get("mem-1")).toBe("Ali Öğretmen");
    });

    it("adı çözülemeyen atayan için isim uydurulmaz — null kalır (K-22)", () => {
      const rawRow: RawHomeworkRow = {
        id: "hw-1",
        organization_id: "org-1",
        class_id: "cls-1",
        title: "Test Ödevi",
        assigned_by_membership_id: "unknown-mem",
        assigned_on: "2026-09-10",
        due_date: "2026-09-20",
        classes: { name: "12-A", archived_at: null },
      };

      const emptyStaffMap = new Map<string, string>();
      const mapped = mapHomeworkRow(rawRow, emptyStaffMap, "2026-09-11");
      expect(mapped.assignedBy).toBeNull();

      // Kart render edildiğinde uydurma isim veya sarkan ' · ' bulunmamalı
      const markup = renderToStaticMarkup(
        createElement(HomeworkCard, { homework: mapped })
      );
      expect(markup).not.toContain("Öğretmen");
      expect(markup).not.toContain("12-A ·");
    });
  });

  describe("Durum Türetimi (mapHomeworkRow)", () => {
    it("vadesi geçmiş ödev Süresi Doldu olarak işaretlenir", () => {
      const rawRow: RawHomeworkRow = {
        id: "hw-past",
        organization_id: "org-1",
        class_id: "cls-1",
        title: "Eski Ödev",
        assigned_on: "2026-09-01",
        due_date: "2026-09-10",
      };
      const mapped = mapHomeworkRow(rawRow, new Map(), "2026-09-11");
      expect(mapped.status).toBe("Süresi Doldu");
    });

    it("vadesi gelmemiş veya bugünkü ödev Aktif olarak işaretlenir", () => {
      const rawRow: RawHomeworkRow = {
        id: "hw-future",
        organization_id: "org-1",
        class_id: "cls-1",
        title: "Gelecek Ödev",
        assigned_on: "2026-09-11",
        due_date: "2026-09-11",
      };
      const mapped = mapHomeworkRow(rawRow, new Map(), "2026-09-11");
      expect(mapped.status).toBe("Aktif");
    });
  });

  describe("createHomework (Tuzak Korumaları)", () => {
    it("kaydetme yükünde id ve assigned_by_membership_id YOKTUR", async () => {
      const spy: { insertArg?: unknown } = {};
      const chain = createQueryChain(
        { data: { id: "new-hw-id" }, error: null },
        spy
      );
      fromMock.mockReturnValueOnce(chain);

      await createHomework({
        organizationId: "org-1",
        classId: "cls-1",
        title: "Kuvvet ve Hareket",
        dueDate: "2026-09-25",
        description: "Problem seti",
      });

      expect(fromMock).toHaveBeenCalledWith("homework_assignments");
      expect(spy.insertArg).toBeDefined();

      const payload = spy.insertArg as Record<string, unknown>;
      // ⛔ 1. YASAK: authenticated için id ve assigned_by_membership_id salt okunurdur
      expect(payload).not.toHaveProperty("id");
      expect(payload).not.toHaveProperty("assigned_by_membership_id");

      // Gönderilen alanlar şemayla uyumlu
      expect(payload.organization_id).toBe("org-1");
      expect(payload.class_id).toBe("cls-1");
      expect(payload.title).toBe("Kuvvet ve Hareket");
      expect(payload.due_date).toBe("2026-09-25");
      expect(payload.description).toBe("Problem seti");
    });
  });

  describe("updateHomework (Yalnız İzin Verilen Beş Sütun ve Etkilenen Satır Kontrolü)", () => {
    it("yalnızca izin verilen 5 sütunu günceller ve açık organization_id + id süzgeci taşır", async () => {
      const spy: {
        updateArg?: unknown;
        eqArgs?: [string, unknown][];
        selectArg?: string;
      } = {};
      const chain = createQueryChain(
        { data: [{ id: "hw-1" }], error: null },
        spy
      );
      fromMock.mockReturnValueOnce(chain);

      await updateHomework("org-1", "hw-1", {
        title: "Yeni Başlık",
        description: "Yeni Açıklama",
        dueDate: "2026-09-30",
        subjectId: "sub-1",
        archivedAt: null,
      });

      expect(fromMock).toHaveBeenCalledWith("homework_assignments");
      const payload = spy.updateArg as Record<string, unknown>;
      const keys = Object.keys(payload);
      expect(
        keys.every(k =>
          [
            "title",
            "description",
            "due_date",
            "subject_id",
            "archived_at",
          ].includes(k)
        )
      ).toBe(true);
      expect(spy.eqArgs).toContainEqual(["organization_id", "org-1"]);
      expect(spy.eqArgs).toContainEqual(["id", "hw-1"]);
      expect(spy.selectArg).toBe("id");
    });

    it("güncelleme sıfır satır etkilediğinde hata fırlatır (R3 & K-14: gerçekleşmemiş yazma başarılı raporlanmaz)", async () => {
      const chain = createQueryChain({ data: [], error: null });
      fromMock.mockReturnValueOnce(chain);

      await expect(
        updateHomework("org-1", "hw-1", { title: "Test" })
      ).rejects.toThrow("Ödev bulunamadı veya güncellenemedi.");
    });
  });

  describe("archiveHomework & restoreHomework (Açık organizationId, homeworkId ve Satır Kontrolü)", () => {
    it("arşivleme açık (organizationId, homeworkId) ile archived_at sütununa zaman damgası koyar", async () => {
      const spy: {
        updateArg?: unknown;
        eqArgs?: [string, unknown][];
        selectArg?: string;
      } = {};
      const chain = createQueryChain(
        { data: [{ id: "hw-1" }], error: null },
        spy
      );
      fromMock.mockReturnValueOnce(chain);

      await archiveHomework("org-1", "hw-1");
      expect(fromMock).toHaveBeenCalledWith("homework_assignments");
      const payload = spy.updateArg as { archived_at: string };
      expect(payload.archived_at).toBeTruthy();
      expect(spy.eqArgs).toContainEqual(["organization_id", "org-1"]);
      expect(spy.eqArgs).toContainEqual(["id", "hw-1"]);
      expect(spy.selectArg).toBe("id");
    });

    it("arşivleme sıfır satır etkilediğinde hata fırlatır (R3 & K-14)", async () => {
      const chain = createQueryChain({ data: [], error: null });
      fromMock.mockReturnValueOnce(chain);

      await expect(archiveHomework("org-1", "hw-not-found")).rejects.toThrow(
        "Ödev bulunamadı veya arşivlenemedi."
      );
    });

    it("geri yükleme açık (organizationId, homeworkId) ile archived_at sütununu null yapar", async () => {
      const spy: {
        updateArg?: unknown;
        eqArgs?: [string, unknown][];
        selectArg?: string;
      } = {};
      const chain = createQueryChain(
        { data: [{ id: "hw-1" }], error: null },
        spy
      );
      fromMock.mockReturnValueOnce(chain);

      await restoreHomework("org-1", "hw-1");
      expect(fromMock).toHaveBeenCalledWith("homework_assignments");
      const payload = spy.updateArg as { archived_at: null };
      expect(payload.archived_at).toBeNull();
      expect(spy.eqArgs).toContainEqual(["organization_id", "org-1"]);
      expect(spy.eqArgs).toContainEqual(["id", "hw-1"]);
      expect(spy.selectArg).toBe("id");
    });

    it("geri yükleme sıfır satır etkilediğinde hata fırlatır (R3 & K-14)", async () => {
      const chain = createQueryChain({ data: [], error: null });
      fromMock.mockReturnValueOnce(chain);

      await expect(restoreHomework("org-1", "hw-not-found")).rejects.toThrow(
        "Ödev bulunamadı veya geri yüklenemedi."
      );
    });
  });

  describe("loadHomework (R1: Açık Limit ve Truncated Bayrağı)", () => {
    it("açık organization_id süzgeci ve due_date artan sıralaması uygular", async () => {
      const spy: {
        eqArgs?: [string, unknown][];
        isArgs?: [string, unknown];
        orderArgs?: [string, { ascending?: boolean }][];
        limitArg?: number;
      } = {};
      const chain = createQueryChain({ data: [], error: null }, spy);
      fromMock.mockReturnValueOnce(chain);

      const result = await loadHomework("org-123");

      expect(fromMock).toHaveBeenCalledWith("homework_assignments");
      expect(spy.eqArgs).toContainEqual(["organization_id", "org-123"]);
      expect(spy.isArgs).toEqual(["archived_at", null]);
      expect(spy.orderArgs).toContainEqual(["due_date", { ascending: true }]);
      expect(result.rows).toEqual([]);
      expect(result.truncated).toBe(false);
    });

    it("satır sayısı limite eşitse truncated bayrağı true döner (R1 & K-03 sessiz kesme engeli)", async () => {
      const mockRows = Array.from({ length: 3 }, (_, i) => ({
        id: `hw-${i}`,
        organization_id: "org-1",
        class_id: "cls-1",
        title: `Ödev ${i}`,
        assigned_on: "2026-09-01",
        due_date: "2026-09-10",
      }));
      const spy: { limitArg?: number } = {};
      fromMock.mockReturnValueOnce(
        createQueryChain({ data: mockRows, error: null }, spy)
      );

      const result = await loadHomework("org-1", { limit: 3 });

      expect(result.rows).toHaveLength(3);
      expect(result.truncated).toBe(true);
      expect(spy.limitArg).toBe(3);
    });

    it("satır sayısı limitten azsa truncated bayrağı false döner", async () => {
      const mockRows = [
        {
          id: "hw-1",
          organization_id: "org-1",
          class_id: "cls-1",
          title: "Tek Ödev",
          assigned_on: "2026-09-01",
          due_date: "2026-09-10",
        },
      ];
      fromMock.mockReturnValueOnce(
        createQueryChain({ data: mockRows, error: null })
      );

      const result = await loadHomework("org-1", { limit: 3 });

      expect(result.rows).toHaveLength(1);
      expect(result.truncated).toBe(false);
    });

    it("varsayılan üst sınır DEFAULT_HOMEWORK_LIMIT (100)'dir", async () => {
      const spy: { limitArg?: number } = {};
      fromMock.mockReturnValueOnce(
        createQueryChain({ data: [], error: null }, spy)
      );

      await loadHomework("org-1");

      expect(spy.limitArg).toBe(DEFAULT_HOMEWORK_LIMIT);
      expect(DEFAULT_HOMEWORK_LIMIT).toBe(100);
    });
  });

  describe("loadSubjects", () => {
    it("aktif dersleri alfabetik sırayla çeker", async () => {
      const chain = createQueryChain({
        data: [
          { id: "sub-1", name: "Biyoloji" },
          { id: "sub-2", name: "Matematik" },
        ],
        error: null,
      });
      fromMock.mockReturnValueOnce(chain);

      const subjects = await loadSubjects("org-1");
      expect(subjects).toEqual([
        { id: "sub-1", name: "Biyoloji" },
        { id: "sub-2", name: "Matematik" },
      ]);
    });
  });
});

describe("K-23 Regresyon Korumaları (Arayüz & Şema Sözleşmeleri)", () => {
  it("1. subject_id boş bir ödevde ders rozeti çizilmiyor ve 'Genel' gibi bir etiket yok", () => {
    const hwNoSubject: Homework = {
      id: "hw-genel-yok",
      classGroup: "12-A",
      subject: null,
      subjectId: null,
      title: "Haftalık Çalışma Planı",
      description: "Tüm dersler için haftalık soru hedefi.",
      assignedBy: "Zeynep Hoca",
      assignedDate: "10 Eylül 2026",
      dueDate: "15 Eylül 2026",
      rawDueDate: "2026-09-15",
      status: "Aktif",
    };

    const markup = renderToStaticMarkup(
      createElement(HomeworkCard, { homework: hwNoSubject })
    );

    // K-22: Yokluk etiketi de bir iddiadır. "Genel" uydurulamaz ve ders rozeti hiç çizilmez.
    expect(markup).not.toContain("Genel");
  });

  it("2. Yedinci bir ders adı ('Edebiyat' gibi) tipten geçiyor ve ekranda çiziliyor", () => {
    const hwLiterature: Homework = {
      id: "hw-lit-7",
      classGroup: "11-B",
      subject: "Edebiyat",
      title: "Tanzimat Dönemi Roman İncelemesi",
      description: "İntibah ve Mai ve Siyah karşılaştırması.",
      assignedBy: "Ahmet Hoca",
      assignedDate: "10 Eylül 2026",
      dueDate: "17 Eylül 2026",
      rawDueDate: "2026-09-17",
      status: "Aktif",
    };

    const markup = renderToStaticMarkup(
      createElement(HomeworkCard, { homework: hwLiterature })
    );

    // Yedinci ders rozeti ekranda çizilir
    expect(markup).toContain("Edebiyat");
  });

  it("3. 'Tamamlandı' ekranda hiçbir yerde yok", () => {
    const hwActive: Homework = {
      id: "hw-active",
      classGroup: "12-A",
      subject: "Matematik",
      title: "Türev",
      description: "Test 1",
      assignedBy: "Merve Hoca",
      assignedDate: "10 Eylül 2026",
      dueDate: "15 Eylül 2026",
      rawDueDate: "2026-09-15",
      status: "Aktif",
    };

    const markup = renderToStaticMarkup(
      createElement(HomeworkCard, { homework: hwActive })
    );

    expect(markup).not.toContain("Tamamlandı");
  });

  it("4. 'Ödev tamamlama' kartı ReportsPage üzerinde hiçbir yerde yok", () => {
    const teacherReports = renderToStaticMarkup(
      createElement(ReportsPage, { role: "teacher" })
    );
    const adminReports = renderToStaticMarkup(
      createElement(ReportsPage, { role: "admin" })
    );

    expect(teacherReports).not.toContain("Ödev tamamlama");
    expect(adminReports).not.toContain("Ödev tamamlama");
  });

  it("5. R1 regresyonu: truncated: true olduğunda HomeworkPage üst sınır uyarısını ve arşivleme öğüdünü gösterir (K-22)", () => {
    const markup = renderToStaticMarkup(
      createElement(HomeworkPage, {
        role: "teacher",
        truncated: true,
        limit: 100,
      })
    );

    expect(markup).toContain("Liste üst sınıra (100 kayıt) ulaştı.");
    expect(markup).toContain("teslim tarihi geçmiş ödevleri arşivleyin");
    // Bandın öğüdü, ekranda gerçekten yapılabilen bir eylemi göstermeli (K-22,
    // #256'nın dersi) — arşivleme R2'de karta bağlandı, yani öğüt çalışıyor.
    // "Tamamlanan" ise bu dilimde KALDIRILAN kavramdır: teslim takibi yok,
    // dolayısıyla bir ödevin "tamamlandığı" bilinemez.
    expect(markup).not.toContain("tamamlanan");
  });

  it("6. R1 regresyonu: truncated: false olduğunda kesilme bandı çizilmez", () => {
    const markup = renderToStaticMarkup(
      createElement(HomeworkPage, {
        role: "teacher",
        truncated: false,
        limit: 100,
      })
    );

    expect(markup).not.toContain("Liste üst sınıra");
  });

  it("7. R2 regresyonu: yetkili kullanıcı için HomeworkCard üzerinde Düzenle ve Arşivle butonları çizilir", () => {
    const hw: Homework = {
      id: "hw-edit-test",
      classGroup: "12-A",
      subject: "Matematik",
      title: "Trigonometri",
      description: "Test",
      assignedBy: "Merve Hoca",
      assignedDate: "10 Eylül 2026",
      dueDate: "15 Eylül 2026",
      rawDueDate: "2026-09-15",
      status: "Aktif",
    };

    const markup = renderToStaticMarkup(
      createElement(HomeworkCard, {
        homework: hw,
        onEdit: vi.fn(),
        onArchive: vi.fn(),
      })
    );

    expect(markup).toContain("Düzenle");
    expect(markup).toContain("Arşivle");
  });

  it("8. R2 regresyonu: öğrenci ve veli için HomeworkCard üzerinde Düzenle ve Arşivle butonları ÇİZİLMEZ", () => {
    const hw: Homework = {
      id: "hw-read-only",
      classGroup: "12-A",
      subject: "Matematik",
      title: "Trigonometri",
      description: "Test",
      assignedBy: "Merve Hoca",
      assignedDate: "10 Eylül 2026",
      dueDate: "15 Eylül 2026",
      rawDueDate: "2026-09-15",
      status: "Aktif",
    };

    const markup = renderToStaticMarkup(
      createElement(HomeworkCard, {
        homework: hw,
      })
    );

    expect(markup).not.toContain("Düzenle");
    expect(markup).not.toContain("Arşivle");
  });

  it("9. R2 regresyonu: HomeworkCreateDialog düzenleme modunda 'Ödevi düzenle' ve 'Değişiklikleri kaydet' gösterir", () => {
    const existingHw: Homework = {
      id: "hw-edit-dialog",
      classGroup: "12-A",
      classId: "cls-1",
      subject: "Matematik",
      subjectId: "sub-1",
      title: "Mevcut Ödev",
      description: "Mevcut Açıklama",
      assignedBy: "Merve Hoca",
      assignedDate: "10 Eylül 2026",
      dueDate: "15 Eylül 2026",
      rawDueDate: "2026-09-15",
      status: "Aktif",
    };

    const markup = renderToStaticMarkup(
      createElement(HomeworkCreateDialog, {
        open: true,
        onOpenChange: vi.fn(),
        homework: existingHw,
        organizationId: "org-1",
        classes: [
          {
            id: "cls-1",
            name: "12-A",
            studentCount: 20,
            program: null,
            mentor: null,
            mentorMembershipId: null,
            branch: null,
            branchId: null,
            capacity: null,
          },
        ],
      })
    );

    expect(markup).toContain("Ödevi düzenle");
    expect(markup).toContain("Değişiklikleri kaydet");
    expect(markup).toContain(
      "Sınıf bilgisi ödev oluşturulduktan sonra değiştirilemez."
    );
  });
});
