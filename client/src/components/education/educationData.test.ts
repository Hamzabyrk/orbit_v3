import { afterEach, describe, expect, it, vi } from "vitest";

let mockIsDemoMode = false;

vi.mock("@/auth/runtime", () => ({
  get isDemoMode() {
    return mockIsDemoMode;
  },
}));

async function loadEducationData(demoMode: boolean) {
  vi.resetModules();
  mockIsDemoMode = demoMode;
  return await import("./educationData");
}

afterEach(() => {
  vi.resetModules();
});

describe("educationData ortam dallanması", () => {
  describe("Production modu (isDemoMode === false)", () => {
    it("dizi ve nesne dışa aktarımlarını boş döndürür, sahte veri sızdırmaz", async () => {
      const data = await loadEducationData(false);

      expect(data.classes).toEqual([]);
      expect(data.schedule).toEqual([]);
      expect(data.students).toEqual([]);
      expect(data.paymentRows).toEqual([]);
      expect(data.initialAutomations).toEqual([]);
      expect(data.initialHomework).toEqual([]);
      expect(data.initialAttendances).toEqual({});
    });

    it("gün planı nesnelerinde admin ve teacher anahtarlarını korur ve dizileri boş tutar", async () => {
      // Anahtarlar eksilirse dayPlanEventsByRole[role] undefined döner ve UI
      // boş durum yerine çalışma anında çöker. Bu yüzden anahtar varlığı ile
      // dizilerin boşluğu ayrı ayrı doğrulanır.
      const data = await loadEducationData(false);

      expect(data.dayPlanEventsByRole).toHaveProperty("admin");
      expect(data.dayPlanEventsByRole).toHaveProperty("teacher");
      expect(Array.isArray(data.dayPlanEventsByRole.admin)).toBe(true);
      expect(Array.isArray(data.dayPlanEventsByRole.teacher)).toBe(true);
      expect(data.dayPlanEventsByRole.admin).toHaveLength(0);
      expect(data.dayPlanEventsByRole.teacher).toHaveLength(0);

      expect(data.dayPlanTasksByRole).toHaveProperty("admin");
      expect(data.dayPlanTasksByRole).toHaveProperty("teacher");
      expect(Array.isArray(data.dayPlanTasksByRole.admin)).toBe(true);
      expect(Array.isArray(data.dayPlanTasksByRole.teacher)).toBe(true);
      expect(data.dayPlanTasksByRole.admin).toHaveLength(0);
      expect(data.dayPlanTasksByRole.teacher).toHaveLength(0);
    });
  });

  describe("Demo modu (isDemoMode === true)", () => {
    it("tüm dışa aktarımların dolu olduğunu garanti eder", async () => {
      // Demo verisinin tek tek içeriği değişebilir; bu nedenle içeriğe değil,
      // verinin boş olmamasına bakılır.
      const data = await loadEducationData(true);

      expect(data.classes.length).toBeGreaterThan(0);
      expect(data.schedule.length).toBeGreaterThan(0);
      expect(data.students.length).toBeGreaterThan(0);
      expect(data.paymentRows.length).toBeGreaterThan(0);
      expect(data.initialAutomations.length).toBeGreaterThan(0);
      expect(data.initialHomework.length).toBeGreaterThan(0);
      expect(Object.keys(data.initialAttendances).length).toBeGreaterThan(0);

      expect(data.dayPlanEventsByRole).toHaveProperty("admin");
      expect(data.dayPlanEventsByRole).toHaveProperty("teacher");
      expect(data.dayPlanEventsByRole.admin.length).toBeGreaterThan(0);
      expect(data.dayPlanEventsByRole.teacher.length).toBeGreaterThan(0);

      expect(data.dayPlanTasksByRole).toHaveProperty("admin");
      expect(data.dayPlanTasksByRole).toHaveProperty("teacher");
      expect(data.dayPlanTasksByRole.admin.length).toBeGreaterThan(0);
      expect(data.dayPlanTasksByRole.teacher.length).toBeGreaterThan(0);
    });
  });
});
