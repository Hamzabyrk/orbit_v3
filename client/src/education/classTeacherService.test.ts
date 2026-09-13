import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assignTeacher,
  loadClassTeachers,
  translateClassTeacherError,
  unassignTeacher,
} from "./classTeacherService";
import { supabase } from "@/lib/supabaseClient";

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe("classTeacherService (v1.4-11 · #287)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadClassTeachers", () => {
    it("kurum ve sınıf kimliğiyle süzer, öğretmen ve ders adını çözer", async () => {
      const mockOrder = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: [
            {
              id: "ct-1",
              organization_id: "org-1",
              class_id: "class-1",
              membership_id: "mem-teacher-1",
              subject_id: "sub-1",
              created_at: "2026-09-13T00:00:00Z",
              archived_at: null,
              subjects: { id: "sub-1", name: "Fizik", archived_at: null },
            },
          ],
          error: null,
        }),
      });
      const mockIs = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEqClass = vi.fn().mockReturnValue({ is: mockIs });
      const mockEqOrg = vi.fn().mockReturnValue({ eq: mockEqClass });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqOrg });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [
          {
            class_id: "class-1",
            membership_id: "mem-teacher-1",
            display_name: "Ahmet Hoca",
          },
        ],
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);

      const result = await loadClassTeachers("org-1", "class-1");

      expect(supabase.from).toHaveBeenCalledWith("class_teachers");
      expect(mockEqOrg).toHaveBeenCalledWith("organization_id", "org-1");
      expect(mockEqClass).toHaveBeenCalledWith("class_id", "class-1");
      expect(mockIs).toHaveBeenCalledWith("archived_at", null);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual({
        id: "ct-1",
        organizationId: "org-1",
        classId: "class-1",
        membershipId: "mem-teacher-1",
        teacherName: "Ahmet Hoca",
        subjectId: "sub-1",
        subjectName: "Fizik",
        createdAt: "2026-09-13T00:00:00Z",
        archivedAt: null,
      });
      expect(result.truncated).toBe(false);
    });

    it("satır sayısı limite ulaştığında truncated true döner", async () => {
      const mockLimit = vi.fn().mockResolvedValue({
        data: [
          {
            id: "ct-1",
            organization_id: "org-1",
            class_id: "class-1",
            membership_id: "mem-1",
            subject_id: "sub-1",
          },
        ],
        error: null,
      });
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockIs = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEqClass = vi.fn().mockReturnValue({ is: mockIs });
      const mockEqOrg = vi.fn().mockReturnValue({ eq: mockEqClass });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqOrg });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);

      const result = await loadClassTeachers("org-1", "class-1", { limit: 1 });
      expect(result.truncated).toBe(true);
    });
  });

  describe("assignTeacher", () => {
    it("yüke ASLA id koymaz ve atamayı kaydeder (#287 / K-00)", async () => {
      let capturedPayload: unknown;

      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: "ct-new-id" },
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockImplementation(payload => {
        capturedPayload = payload;
        return { select: mockSelect };
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as unknown as ReturnType<typeof supabase.from>);

      const res = await assignTeacher({
        organizationId: "org-1",
        classId: "class-1",
        membershipId: "mem-teacher-1",
        subjectId: "sub-1",
      });

      expect(supabase.from).toHaveBeenCalledWith("class_teachers");
      expect(capturedPayload).toEqual({
        organization_id: "org-1",
        class_id: "class-1",
        membership_id: "mem-teacher-1",
        subject_id: "sub-1",
      });
      // ⛔ K-23: Yüke asla `id` konmaz
      expect(capturedPayload).not.toHaveProperty("id");
      expect(res.id).toBe("ct-new-id");
    });

    it("veritabanı hatasında çevrilmiş hata fırlatır", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "23505", message: "duplicate key" },
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as unknown as ReturnType<typeof supabase.from>);

      await expect(
        assignTeacher({
          organizationId: "org-1",
          classId: "class-1",
          membershipId: "mem-1",
          subjectId: "sub-1",
        })
      ).rejects.toThrow("Bu öğretmen bu derse zaten atanmış.");
    });
  });

  describe("unassignTeacher", () => {
    it("atama kaydını arşivler (UPDATE yalnız archived_at)", async () => {
      let capturedPayload: unknown;

      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: "ct-1" }],
        error: null,
      });
      const mockIs = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqId = vi.fn().mockReturnValue({ is: mockIs });
      const mockEqOrg = vi.fn().mockReturnValue({ eq: mockEqId });
      const mockUpdate = vi.fn().mockImplementation(payload => {
        capturedPayload = payload;
        return { eq: mockEqOrg };
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as unknown as ReturnType<typeof supabase.from>);

      await unassignTeacher("org-1", "ct-1");

      expect(mockEqOrg).toHaveBeenCalledWith("organization_id", "org-1");
      expect(mockEqId).toHaveBeenCalledWith("id", "ct-1");
      expect(mockIs).toHaveBeenCalledWith("archived_at", null);
      expect(capturedPayload).toHaveProperty("archived_at");
      // ⛔ class_teachers tablosunda UPDATE yalnızca archived_at sütunundadır
      expect(Object.keys(capturedPayload as object)).toEqual(["archived_at"]);
    });

    it("K-14: Sıfır satır etkilendiğinde hata fırlatır", async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockIs = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqId = vi.fn().mockReturnValue({ is: mockIs });
      const mockEqOrg = vi.fn().mockReturnValue({ eq: mockEqId });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqOrg });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as unknown as ReturnType<typeof supabase.from>);

      await expect(unassignTeacher("org-1", "ct-1")).rejects.toThrow(
        "Öğretmen ataması bulunamadı veya işlem yetkiniz yok."
      );
    });
  });

  describe("translateClassTeacherError", () => {
    it("ORB03 rol uygunluk hatasını açıklar", () => {
      const rawError = {
        code: "ORB03",
        details: "membership_id=mem-student-1",
        message: "Bu üyelik ders ataması taşıyamaz.",
      };

      expect(translateClassTeacherError(rawError)).toBe(
        "Ders ataması yalnızca kurum yöneticisi veya öğretmen rolündeki üyelere yapılabilir."
      );
    });

    it("23505 tekillik hatasını açıklar", () => {
      expect(translateClassTeacherError({ code: "23505" })).toBe(
        "Bu öğretmen bu derse zaten atanmış."
      );
    });

    it("23503 yabancı anahtar hatasını açıklar", () => {
      expect(translateClassTeacherError({ code: "23503" })).toBe(
        "Seçilen sınıf veya ders bulunamadı ya da arşivlenmiş."
      );
    });

    it("42501 yetki hatasını açıklar", () => {
      expect(translateClassTeacherError({ code: "42501" })).toBe(
        "Bu işlem için kurum yöneticisi yetkisi gerekiyor."
      );
    });
  });
});
