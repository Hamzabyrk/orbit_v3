import { describe, expect, it } from "vitest";
import {
  formatLoginNumber,
  isMemberStatus,
  memberErrorMessage,
  sortMembers,
  type OrganizationMember,
} from "./memberService";

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
});
