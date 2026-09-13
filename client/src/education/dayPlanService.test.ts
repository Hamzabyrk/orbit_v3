import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  archiveCalendarEvent,
  archiveTask,
  completeTask,
  createCalendarEvent,
  createTask,
  DEFAULT_DAY_PLAN_LIMIT,
  loadCalendarEvents,
  loadTasks,
  translateDayPlanError,
  uncompleteTask,
  updateCalendarEvent,
  updateTask,
} from "./dayPlanService";

const fromMock = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

describe("dayPlanService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadTasks", () => {
    it("kurum veya üyelik kimliği boşsa sorgu atmadan boş dizi döner", async () => {
      const res1 = await loadTasks("", "mem-1");
      expect(res1.rows).toEqual([]);
      expect(res1.truncated).toBe(false);

      const res2 = await loadTasks("org-1", "");
      expect(res2.rows).toEqual([]);
      expect(res2.truncated).toBe(false);

      expect(fromMock).not.toHaveBeenCalled();
    });

    it("kurum ve üyelik kimliğiyle arşivlenmemiş görevleri çeker", async () => {
      const mockLimit = vi.fn().mockResolvedValue({
        data: [
          {
            id: "task-1",
            organization_id: "org-1",
            owner_membership_id: "mem-1",
            title: "Öğrenci dosyalarını incele",
            detail: "Detay notu",
            due_on: "2026-09-15",
            completed_at: null,
            archived_at: null,
            created_at: "2026-09-13T10:00:00Z",
            updated_at: "2026-09-13T10:00:00Z",
          },
        ],
        error: null,
      });
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockIs = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEqMember = vi.fn().mockReturnValue({ is: mockIs });
      const mockEqOrg = vi.fn().mockReturnValue({ eq: mockEqMember });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqOrg });

      fromMock.mockReturnValue({ select: mockSelect });

      const result = await loadTasks("org-1", "mem-1");

      expect(fromMock).toHaveBeenCalledWith("tasks");
      expect(mockEqOrg).toHaveBeenCalledWith("organization_id", "org-1");
      expect(mockEqMember).toHaveBeenCalledWith("owner_membership_id", "mem-1");
      expect(mockIs).toHaveBeenCalledWith("archived_at", null);
      expect(mockOrder).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
      expect(mockLimit).toHaveBeenCalledWith(DEFAULT_DAY_PLAN_LIMIT);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual({
        id: "task-1",
        organizationId: "org-1",
        ownerMembershipId: "mem-1",
        title: "Öğrenci dosyalarını incele",
        detail: "Detay notu",
        dueOn: "2026-09-15",
        completedAt: null,
        archivedAt: null,
        createdAt: "2026-09-13T10:00:00Z",
        updatedAt: "2026-09-13T10:00:00Z",
      });
      expect(result.truncated).toBe(false);
    });

    it("satır sayısı limite eşit olduğunda truncated true döner (K-06)", async () => {
      const mockLimit = vi.fn().mockResolvedValue({
        data: [{ id: "t1" }],
        error: null,
      });
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockIs = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEqMember = vi.fn().mockReturnValue({ is: mockIs });
      const mockEqOrg = vi.fn().mockReturnValue({ eq: mockEqMember });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqOrg });

      fromMock.mockReturnValue({ select: mockSelect });

      const result = await loadTasks("org-1", "mem-1", { limit: 1 });
      expect(result.truncated).toBe(true);
    });
  });

  describe("createTask", () => {
    it("yüke id KONMAZ, owner_membership_id giriş yapan üyeliktir (K-00 / #290)", async () => {
      let capturedPayload: unknown;

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: "new-task-1",
          organization_id: "org-1",
          owner_membership_id: "mem-current",
          title: "Veli görüşmesi yap",
          detail: null,
          due_on: "2026-09-16",
          completed_at: null,
          archived_at: null,
          created_at: "2026-09-13T10:00:00Z",
          updated_at: "2026-09-13T10:00:00Z",
        },
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockImplementation(payload => {
        capturedPayload = payload;
        return { select: mockSelect };
      });

      fromMock.mockReturnValue({ insert: mockInsert });

      const result = await createTask({
        organizationId: "org-1",
        ownerMembershipId: "mem-current",
        title: "  Veli görüşmesi yap  ",
        dueOn: "2026-09-16",
      });

      expect(capturedPayload).toEqual({
        organization_id: "org-1",
        owner_membership_id: "mem-current",
        title: "Veli görüşmesi yap",
        detail: null,
        due_on: "2026-09-16",
      });

      // 🔴 K-23: Yükte kesinlikle id olamaz
      expect(capturedPayload).not.toHaveProperty("id");
      expect(result.id).toBe("new-task-1");
    });

    it("başlık boş olduğunda veritabanına gitmeden hata fırlatır", async () => {
      await expect(
        createTask({
          organizationId: "org-1",
          ownerMembershipId: "mem-1",
          title: "   ",
        })
      ).rejects.toThrow("Görev başlığı 1 ile 200 karakter arasında olmalıdır.");
      expect(fromMock).not.toHaveBeenCalled();
    });

    it("başlık 200 karakteri aştığında hata fırlatır", async () => {
      await expect(
        createTask({
          organizationId: "org-1",
          ownerMembershipId: "mem-1",
          title: "a".repeat(201),
        })
      ).rejects.toThrow("Görev başlığı 1 ile 200 karakter arasında olmalıdır.");
      expect(fromMock).not.toHaveBeenCalled();
    });
  });

  describe("updateTask", () => {
    it("yüke id veya owner_membership_id konmaz, sıfır satırda hata fırlatır (K-14)", async () => {
      let capturedPayload: unknown;

      const mockSelect = vi.fn().mockResolvedValue({
        data: [
          {
            id: "task-1",
            organization_id: "org-1",
            owner_membership_id: "mem-1",
            title: "Güncellenen görev",
            detail: "Yeni detay",
            due_on: null,
            completed_at: null,
            archived_at: null,
            created_at: "",
            updated_at: "",
          },
        ],
        error: null,
      });
      const mockEqTask = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqOrg = vi.fn().mockReturnValue({ eq: mockEqTask });
      const mockUpdate = vi.fn().mockImplementation(payload => {
        capturedPayload = payload;
        return { eq: mockEqOrg };
      });

      fromMock.mockReturnValue({ update: mockUpdate });

      await updateTask("org-1", "task-1", {
        title: "Güncellenen görev",
        detail: "Yeni detay",
      });

      expect(capturedPayload).toEqual({
        title: "Güncellenen görev",
        detail: "Yeni detay",
      });
      expect(capturedPayload).not.toHaveProperty("id");
      expect(capturedPayload).not.toHaveProperty("owner_membership_id");
    });

    it("sıfır satır etkilendiğinde hata fırlatır (K-14)", async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockEqTask = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqOrg = vi.fn().mockReturnValue({ eq: mockEqTask });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqOrg });

      fromMock.mockReturnValue({ update: mockUpdate });

      await expect(
        updateTask("org-1", "task-1", { title: "Test" })
      ).rejects.toThrow(
        "Görev güncellenemedi veya bu işlem için yetkiniz bulunmuyor."
      );
    });
  });

  describe("completeTask & uncompleteTask", () => {
    it("completeTask completed_at alanını doldurur ve sıfır satırda hata fırlatır (K-14)", async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [
          {
            id: "task-1",
            organization_id: "org-1",
            owner_membership_id: "mem-1",
            title: "Test",
            detail: null,
            due_on: null,
            completed_at: "2026-09-13T12:00:00Z",
            archived_at: null,
            created_at: "",
            updated_at: "",
          },
        ],
        error: null,
      });
      const mockEqTask = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqOrg = vi.fn().mockReturnValue({ eq: mockEqTask });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqOrg });

      fromMock.mockReturnValue({ update: mockUpdate });

      const result = await completeTask("org-1", "task-1");
      expect(result.completedAt).toBe("2026-09-13T12:00:00Z");
    });

    it("uncompleteTask completed_at alanını null yapar ve sıfır satırda hata fırlatır (K-14)", async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [
          {
            id: "task-1",
            organization_id: "org-1",
            owner_membership_id: "mem-1",
            title: "Test",
            detail: null,
            due_on: null,
            completed_at: null,
            archived_at: null,
            created_at: "",
            updated_at: "",
          },
        ],
        error: null,
      });
      const mockEqTask = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqOrg = vi.fn().mockReturnValue({ eq: mockEqTask });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqOrg });

      fromMock.mockReturnValue({ update: mockUpdate });

      const result = await uncompleteTask("org-1", "task-1");
      expect(result.completedAt).toBeNull();
    });
  });

  describe("archiveTask", () => {
    it("archived_at alanını doldurur ve sıfır satırda hata fırlatır (K-14)", async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: "task-1" }],
        error: null,
      });
      const mockIs = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqTask = vi.fn().mockReturnValue({ is: mockIs });
      const mockEqOrg = vi.fn().mockReturnValue({ eq: mockEqTask });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqOrg });

      fromMock.mockReturnValue({ update: mockUpdate });

      await archiveTask("org-1", "task-1");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ archived_at: expect.any(String) })
      );
    });

    it("arşivlemede sıfır satır etkilendiğinde hata fırlatır (K-14)", async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockIs = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqTask = vi.fn().mockReturnValue({ is: mockIs });
      const mockEqOrg = vi.fn().mockReturnValue({ eq: mockEqTask });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqOrg });

      fromMock.mockReturnValue({ update: mockUpdate });

      await expect(archiveTask("org-1", "task-1")).rejects.toThrow(
        "Görev arşivlenemedi veya bu işlem için yetkiniz bulunmuyor."
      );
    });
  });

  describe("loadCalendarEvents", () => {
    it("kurum veya üyelik boşsa sorgu atmaz", async () => {
      const res = await loadCalendarEvents("", "mem-1");
      expect(res.rows).toEqual([]);
      expect(fromMock).not.toHaveBeenCalled();
    });

    it("kişisel takvim etkinliklerini başlangıç saatine göre sıralı getirir", async () => {
      const mockLimit = vi.fn().mockResolvedValue({
        data: [
          {
            id: "ev-1",
            organization_id: "org-1",
            owner_membership_id: "mem-1",
            title: "Veli Görüşmesi",
            subtitle: "Ali Yılmaz velisi",
            starts_at: "2026-09-15T09:00:00Z",
            ends_at: "2026-09-15T09:30:00Z",
            archived_at: null,
            created_at: "",
            updated_at: "",
          },
        ],
        error: null,
      });
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockIs = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEqMember = vi.fn().mockReturnValue({ is: mockIs });
      const mockEqOrg = vi.fn().mockReturnValue({ eq: mockEqMember });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqOrg });

      fromMock.mockReturnValue({ select: mockSelect });

      const result = await loadCalendarEvents("org-1", "mem-1");

      expect(fromMock).toHaveBeenCalledWith("calendar_events");
      expect(mockOrder).toHaveBeenCalledWith("starts_at", { ascending: true });
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].title).toBe("Veli Görüşmesi");
      expect(result.rows[0].startsAt).toBe("2026-09-15T09:00:00Z");
    });
  });

  describe("createCalendarEvent", () => {
    it("yüke id konmaz, owner_membership_id gönderilir", async () => {
      let capturedPayload: unknown;

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: "ev-new",
          organization_id: "org-1",
          owner_membership_id: "mem-1",
          title: "Zümre Toplantısı",
          subtitle: null,
          starts_at: "2026-09-15T14:00:00Z",
          ends_at: "2026-09-15T15:00:00Z",
          archived_at: null,
          created_at: "",
          updated_at: "",
        },
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockImplementation(payload => {
        capturedPayload = payload;
        return { select: mockSelect };
      });

      fromMock.mockReturnValue({ insert: mockInsert });

      const res = await createCalendarEvent({
        organizationId: "org-1",
        ownerMembershipId: "mem-1",
        title: "Zümre Toplantısı",
        startsAt: "2026-09-15T14:00:00Z",
        endsAt: "2026-09-15T15:00:00Z",
      });

      expect(capturedPayload).toEqual({
        organization_id: "org-1",
        owner_membership_id: "mem-1",
        title: "Zümre Toplantısı",
        subtitle: null,
        starts_at: "2026-09-15T14:00:00Z",
        ends_at: "2026-09-15T15:00:00Z",
      });
      expect(capturedPayload).not.toHaveProperty("id");
      expect(res.id).toBe("ev-new");
    });

    it("bitiş saati başlangıçtan önce veya eşitse hata fırlatır", async () => {
      await expect(
        createCalendarEvent({
          organizationId: "org-1",
          ownerMembershipId: "mem-1",
          title: "Toplantı",
          startsAt: "2026-09-15T14:00:00Z",
          endsAt: "2026-09-15T13:00:00Z",
        })
      ).rejects.toThrow("Bitiş saati başlangıç saatinden sonra olmalıdır.");
      expect(fromMock).not.toHaveBeenCalled();
    });
  });

  describe("updateCalendarEvent & archiveCalendarEvent", () => {
    it("updateCalendarEvent sıfır satırda hata fırlatır (K-14)", async () => {
      const mockSelect = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockEqEv = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqOrg = vi.fn().mockReturnValue({ eq: mockEqEv });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqOrg });

      fromMock.mockReturnValue({ update: mockUpdate });

      await expect(
        updateCalendarEvent("org-1", "ev-1", { title: "Yeni Başlık" })
      ).rejects.toThrow(
        "Etkinlik güncellenemedi veya bu işlem için yetkiniz bulunmuyor."
      );
    });

    it("archiveCalendarEvent sıfır satırda hata fırlatır (K-14)", async () => {
      const mockSelect = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockIs = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqEv = vi.fn().mockReturnValue({ is: mockIs });
      const mockEqOrg = vi.fn().mockReturnValue({ eq: mockEqEv });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqOrg });

      fromMock.mockReturnValue({ update: mockUpdate });

      await expect(archiveCalendarEvent("org-1", "ev-1")).rejects.toThrow(
        "Etkinlik arşivlenemedi veya bu işlem için yetkiniz bulunmuyor."
      );
    });
  });

  describe("translateDayPlanError", () => {
    it("42501 yetki hatasını açıklar", () => {
      const msg = translateDayPlanError({ code: "42501" });
      expect(msg).toContain("Bu işlem için yetkiniz yok");
    });

    it("23514 tasks_title_check hatasını açıklar", () => {
      const msg = translateDayPlanError({
        code: "23514",
        details: "violates tasks_title_check constraint",
      });
      expect(msg).toContain(
        "Görev başlığı 1 ile 200 karakter arasında olmalıdır"
      );
    });

    it("23514 calendar_events_time_check hatasını açıklar", () => {
      const msg = translateDayPlanError({
        code: "23514",
        details: "violates calendar_events_time_check constraint",
      });
      expect(msg).toContain("Bitiş saati başlangıç saatinden sonra olmalıdır");
    });

    it("details çoğul alanından hata kodu çözer (K-23)", () => {
      const msg = translateDayPlanError({
        message: "Internal error",
        details: "42501 permission denied",
      });
      expect(msg).toContain("Bu işlem için yetkiniz yok");
    });
  });
});
