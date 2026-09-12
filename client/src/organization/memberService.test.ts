import { describe, expect, it, vi } from "vitest";
import {
  formatLoginNumber,
  isMemberStatus,
  loadOrganizationMembers,
  memberErrorMessage,
  resolveBranchSelection,
  sortMembers,
  type OrganizationMember,
} from "./memberService";

const fromMock = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: (table: string) => fromMock(table),
  },
}));

describe("memberService", () => {
  describe("formatLoginNumber", () => {
    it("kurum kodu 1003 ve kişi kodu 1000 olduğunda 8 haneli numarayı üretir", () => {
      expect(formatLoginNumber(1003, 1000)).toBe("10031000");
    });

    it("kişi kodu null olduğunda uydurulmuş numara üretmez, null döner", () => {
      expect(formatLoginNumber(1003, null)).toBeNull();
    });

    it("kurum kodu null olduğunda null döner", () => {
      expect(formatLoginNumber(null, 1000)).toBeNull();
    });

    it("kurum veya kişi kodu undefined olduğunda null döner", () => {
      expect(formatLoginNumber(undefined, 1000)).toBeNull();
      expect(formatLoginNumber(1003, undefined)).toBeNull();
      expect(formatLoginNumber(undefined, undefined)).toBeNull();
    });
  });

  describe("isMemberStatus", () => {
    it("geçerli durumları tanır", () => {
      expect(isMemberStatus("invited")).toBe(true);
      expect(isMemberStatus("active")).toBe(true);
      expect(isMemberStatus("suspended")).toBe(true);
    });

    it("tanınmayan durumları reddeder", () => {
      expect(isMemberStatus("unknown")).toBe(false);
      expect(isMemberStatus("pending")).toBe(false);
      expect(isMemberStatus("")).toBe(false);
    });
  });

  describe("sortMembers", () => {
    it("üyeleri admin -> teacher -> student -> parent sırasına göre dizer", () => {
      const unsorted: OrganizationMember[] = [
        {
          membershipId: "1",
          displayName: "Ahmet Veli",
          loginNumber: "10011001",
          role: "parent",
          branchName: null,
          status: "active",
        },
        {
          membershipId: "2",
          displayName: "Mehmet Öğrenci",
          loginNumber: "10011002",
          role: "student",
          branchName: null,
          status: "active",
        },
        {
          membershipId: "3",
          displayName: "Ayşe Yönetici",
          loginNumber: "10011003",
          role: "admin",
          branchName: null,
          status: "active",
        },
        {
          membershipId: "4",
          displayName: "Fatma Öğretmen",
          loginNumber: "10011004",
          role: "teacher",
          branchName: null,
          status: "active",
        },
      ];

      const sorted = sortMembers(unsorted);

      expect(sorted.map(m => m.role)).toEqual([
        "admin",
        "teacher",
        "student",
        "parent",
      ]);
    });

    it("aynı roldeki üyeleri ada göre alfabetik sıralar", () => {
      const unsorted: OrganizationMember[] = [
        {
          membershipId: "1",
          displayName: "Zeynep Kaya",
          loginNumber: "10011001",
          role: "teacher",
          branchName: null,
          status: "active",
        },
        {
          membershipId: "2",
          displayName: "Ali Demir",
          loginNumber: "10011002",
          role: "teacher",
          branchName: null,
          status: "active",
        },
        {
          membershipId: "3",
          displayName: "Çiğdem Çelik",
          loginNumber: "10011003",
          role: "teacher",
          branchName: null,
          status: "active",
        },
        {
          membershipId: "4",
          displayName: "Burak Şen",
          loginNumber: "10011004",
          role: "teacher",
          branchName: null,
          status: "active",
        },
      ];

      const sorted = sortMembers(unsorted);

      expect(sorted.map(m => m.displayName)).toEqual([
        "Ali Demir",
        "Burak Şen",
        "Çiğdem Çelik",
        "Zeynep Kaya",
      ]);
    });

    it("adı null olan üye kendi rol grubunun sonuna gider", () => {
      const unsorted: OrganizationMember[] = [
        {
          membershipId: "1",
          displayName: null,
          loginNumber: "10011001",
          role: "teacher",
          branchName: null,
          status: "active",
        },
        {
          membershipId: "2",
          displayName: "Zeynep Kaya",
          loginNumber: "10011002",
          role: "teacher",
          branchName: null,
          status: "active",
        },
        {
          membershipId: "3",
          displayName: "Ali Demir",
          loginNumber: "10011003",
          role: "teacher",
          branchName: null,
          status: "active",
        },
      ];

      const sorted = sortMembers(unsorted);

      expect(sorted.map(m => m.displayName)).toEqual([
        "Ali Demir",
        "Zeynep Kaya",
        null,
      ]);
    });

    it("adı null olan iki üye birbirine göre kararlı sırada kalır", () => {
      const unsorted: OrganizationMember[] = [
        {
          membershipId: "mem-a",
          displayName: null,
          loginNumber: "10011001",
          role: "student",
          branchName: null,
          status: "active",
        },
        {
          membershipId: "mem-b",
          displayName: "Ayşe Kaya",
          loginNumber: "10011002",
          role: "student",
          branchName: null,
          status: "active",
        },
        {
          membershipId: "mem-c",
          displayName: null,
          loginNumber: "10011003",
          role: "student",
          branchName: null,
          status: "active",
        },
      ];

      const sorted = sortMembers(unsorted);

      expect(sorted.map(m => m.membershipId)).toEqual([
        "mem-b",
        "mem-a",
        "mem-c",
      ]);
    });
  });

  describe("memberErrorMessage", () => {
    it("bilinen hata kodları için anlamlı Türkçe mesaj döner", () => {
      expect(memberErrorMessage("unauthorized", "yedek")).toBe(
        "Oturumunuz düşmüş görünüyor. Tekrar giriş yapın."
      );
      expect(memberErrorMessage("forbidden", "yedek")).toBe(
        "Bu işlem için kurum yöneticisi yetkisi gerekiyor veya üye bulunamadı."
      );
      expect(memberErrorMessage("password_update_failed", "yedek")).toBe(
        "Yeni şifre kaydedilemedi. Lütfen tekrar deneyin."
      );
      expect(memberErrorMessage("member_create_failed", "yedek")).toBe(
        "Üye oluşturulamadı. Bilgileri kontrol edip tekrar deneyin."
      );
    });

    it("bilinmeyen veya geçersiz hata kodlarında genel mesaj döner", () => {
      expect(
        memberErrorMessage(
          "unknown_code",
          "Yeni şifre üretilemedi. Lütfen tekrar deneyin."
        )
      ).toBe("Yeni şifre üretilemedi. Lütfen tekrar deneyin.");
      expect(
        memberErrorMessage(
          null,
          "Yeni şifre üretilemedi. Lütfen tekrar deneyin."
        )
      ).toBe("Yeni şifre üretilemedi. Lütfen tekrar deneyin.");
      expect(
        memberErrorMessage(
          undefined,
          "Üye oluşturulamadı. Bilgileri kontrol edip tekrar deneyin."
        )
      ).toBe("Üye oluşturulamadı. Bilgileri kontrol edip tekrar deneyin.");
    });
  });

  describe("resolveBranchSelection", () => {
    it("seçim yapılmadığında (boş string, null, undefined) undefined döner ve gönderimi engeller", () => {
      expect(resolveBranchSelection("")).toBeUndefined();
      expect(resolveBranchSelection(null)).toBeUndefined();
      expect(resolveBranchSelection(undefined)).toBeUndefined();
    });

    it("kurum geneli (__all__) seçildiğinde sunucu sözleşmesine uygun null döner", () => {
      expect(resolveBranchSelection("__all__")).toBeNull();
    });

    it("belirli bir şube ID'si seçildiğinde şube ID'sini aynen korur", () => {
      expect(resolveBranchSelection("branch-corlu")).toBe("branch-corlu");
      expect(
        resolveBranchSelection("9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d")
      ).toBe("9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d");
    });
  });

  describe("loadOrganizationMembers (v1.4-10 · Bağlı Kişi)", () => {
    it("öğrenci ve veli üyeliklerinin bağlı kişi bilgisini çözer, bağlı olmayana null atar", async () => {
      fromMock.mockImplementation((table: string) => {
        const chain: Record<string, unknown> = {};
        chain.select = vi.fn().mockReturnValue(chain);
        chain.eq = vi.fn().mockReturnValue(chain);
        chain.is = vi.fn().mockReturnValue(chain);
        chain.in = vi.fn().mockImplementation(() => {
          if (table === "profiles") {
            return Promise.resolve({
              data: [
                { id: "u-stu-1", display_name: "Ali Profil" },
                { id: "u-stu-2", display_name: "Ayşe Profil" },
                { id: "u-par-1", display_name: "Fatma Profil" },
                { id: "u-adm-1", display_name: "Yönetici Profil" },
              ],
              error: null,
            });
          }
          if (table === "branches") {
            return Promise.resolve({ data: [], error: null });
          }
          if (table === "students") {
            return Promise.resolve({
              data: [
                {
                  id: "stu-rec-1",
                  full_name: "Ali Öğrenci",
                  auth_user_id: "u-stu-1",
                },
              ],
              error: null,
            });
          }
          if (table === "guardians") {
            return Promise.resolve({
              data: [
                {
                  id: "g-rec-1",
                  full_name: "Fatma Veli",
                  auth_user_id: "u-par-1",
                },
              ],
              error: null,
            });
          }
          return Promise.resolve({ data: [], error: null });
        });

        if (table === "organization_memberships") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "m-1",
                    user_id: "u-stu-1",
                    branch_id: null,
                    person_code: 1001,
                    role: "student",
                    status: "active",
                  },
                  {
                    id: "m-2",
                    user_id: "u-stu-2",
                    branch_id: null,
                    person_code: 1002,
                    role: "student",
                    status: "active",
                  },
                  {
                    id: "m-3",
                    user_id: "u-par-1",
                    branch_id: null,
                    person_code: 1003,
                    role: "parent",
                    status: "active",
                  },
                  {
                    id: "m-4",
                    user_id: "u-adm-1",
                    branch_id: null,
                    person_code: 1004,
                    role: "admin",
                    status: "active",
                  },
                ],
                error: null,
              }),
            }),
          };
        }

        return chain;
      });

      const members = await loadOrganizationMembers("org-1", 1001);

      // m-4: admin
      const admin = members.find(m => m.membershipId === "m-4");
      expect(admin?.linkedPerson).toBeUndefined();

      // m-1: bağlı öğrenci
      const linkedStudent = members.find(m => m.membershipId === "m-1");
      expect(linkedStudent?.linkedPerson).toEqual({
        type: "student",
        id: "stu-rec-1",
        name: "Ali Öğrenci",
      });

      // m-2: bağlı OLMAYAN öğrenci
      const unlinkedStudent = members.find(m => m.membershipId === "m-2");
      expect(unlinkedStudent?.linkedPerson).toBeNull();

      // m-3: bağlı veli
      const linkedGuardian = members.find(m => m.membershipId === "m-3");
      expect(linkedGuardian?.linkedPerson).toEqual({
        type: "guardian",
        id: "g-rec-1",
        name: "Fatma Veli",
      });
    });
  });
});
