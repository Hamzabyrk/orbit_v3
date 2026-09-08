import { describe, expect, it } from "vitest";
import {
  ATTENDANCE_DB_STATUSES,
  ATTENDANCE_STATES,
  attendanceStateToDbStatus,
  dbStatusToAttendanceState,
  getAttendanceTone,
} from "./attendanceStatus";

describe("attendanceStatus (K-06 & K-04)", () => {
  describe("dbStatusToAttendanceState", () => {
    it("dört veritabanı enum değerini doğru Türkçe etiketlerle eşler", () => {
      expect(dbStatusToAttendanceState("present")).toBe("Katıldı");
      expect(dbStatusToAttendanceState("late")).toBe("Geç kaldı");
      expect(dbStatusToAttendanceState("absent")).toBe("Gelmedi");
      expect(dbStatusToAttendanceState("excused")).toBe("İzinli");
    });

    it("tanınmayan veya geçersiz değerlerde fail-closed olarak null döner (K-04)", () => {
      expect(dbStatusToAttendanceState("unknown")).toBeNull();
      expect(dbStatusToAttendanceState("")).toBeNull();
      expect(dbStatusToAttendanceState(null)).toBeNull();
      expect(dbStatusToAttendanceState(undefined)).toBeNull();
      expect(dbStatusToAttendanceState("PRESENT")).toBeNull();
    });
  });

  describe("attendanceStateToDbStatus", () => {
    it("dört Türkçe etiketi doğru veritabanı enum değerleriyle eşler", () => {
      expect(attendanceStateToDbStatus("Katıldı")).toBe("present");
      expect(attendanceStateToDbStatus("Geç kaldı")).toBe("late");
      expect(attendanceStateToDbStatus("Gelmedi")).toBe("absent");
      expect(attendanceStateToDbStatus("İzinli")).toBe("excused");
    });

    it("tanınmayan veya geçersiz değerlerde fail-closed olarak null döner (K-04)", () => {
      expect(attendanceStateToDbStatus("Bilinmiyor")).toBeNull();
      expect(attendanceStateToDbStatus("")).toBeNull();
      expect(attendanceStateToDbStatus(null)).toBeNull();
      expect(attendanceStateToDbStatus(undefined)).toBeNull();
    });
  });

  describe("listeler ve sabitler", () => {
    it("ATTENDANCE_DB_STATUSES dört enum değerini tam ve sıralı taşır", () => {
      expect(ATTENDANCE_DB_STATUSES).toEqual([
        "present",
        "late",
        "absent",
        "excused",
      ]);
    });

    it("ATTENDANCE_STATES dört arayüz durumunu tam ve sıralı taşır", () => {
      expect(ATTENDANCE_STATES).toEqual([
        "Katıldı",
        "Geç kaldı",
        "Gelmedi",
        "İzinli",
      ]);
    });
  });

  describe("getAttendanceTone", () => {
    it("her durum için doğru görsel renk tonunu üretir", () => {
      expect(getAttendanceTone("Katıldı")).toBe("green");
      expect(getAttendanceTone("Geç kaldı")).toBe("amber");
      expect(getAttendanceTone("Gelmedi")).toBe("rose");
      expect(getAttendanceTone("İzinli")).toBe("blue");
      expect(getAttendanceTone(null)).toBe("slate");
      expect(getAttendanceTone(undefined)).toBe("slate");
    });
  });
});
