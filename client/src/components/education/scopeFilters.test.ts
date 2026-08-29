import { describe, expect, it } from "vitest";
import {
  classes as demoClasses,
  initialHomework as demoHomework,
  paymentRows as demoPaymentRows,
  schedule as demoSchedule,
  students as demoStudents,
} from "./demoData";
import {
  filterAttendanceStudents,
  filterClassesForRole,
  filterHomeworkForRole,
  filterPaymentsForRole,
  filterScheduleForRole,
  filterScheduleForTeacher,
  filterStudentsForRole,
} from "./scopeFilters";
import type { Role } from "./types";

describe("scopeFilters - uretim modu (isDemo = false)", () => {
  const nonAdminRoles: Role[] = ["teacher", "student", "parent"];

  it("ogretmen, ogrenci ve veli icin yedi filtrenin hepsi bos kume doner (K-04)", () => {
    for (const role of nonAdminRoles) {
      expect(filterScheduleForTeacher(demoSchedule, false)).toEqual([]);
      expect(filterStudentsForRole(demoStudents, role, false)).toEqual([]);
      expect(filterAttendanceStudents(demoStudents, role, false)).toEqual([]);
      expect(filterClassesForRole(demoClasses, role, false)).toEqual([]);
      expect(filterHomeworkForRole(demoHomework, role, false)).toEqual([]);
      expect(filterPaymentsForRole(demoPaymentRows, role, false)).toEqual([]);
      expect(filterScheduleForRole(demoSchedule, role, false)).toEqual([]);
    }
  });

  it("admin rolu icin yonetimsel veriler uretimde de tum listeyi filtrelemeden gorur", () => {
    expect(filterStudentsForRole(demoStudents, "admin", false)).toEqual(
      demoStudents
    );
    expect(filterAttendanceStudents(demoStudents, "admin", false)).toEqual(
      demoStudents
    );
    expect(filterClassesForRole(demoClasses, "admin", false)).toEqual(
      demoClasses
    );
    expect(filterHomeworkForRole(demoHomework, "admin", false)).toEqual(
      demoHomework
    );
    expect(filterPaymentsForRole(demoPaymentRows, "admin", false)).toEqual(
      demoPaymentRows
    );
    expect(filterScheduleForRole(demoSchedule, "admin", false)).toEqual(
      demoSchedule
    );
  });
});

describe("scopeFilters - demo modu (isDemo = true)", () => {
  it("ogretmen programi demo ogretmenlerinin derslerini listeler", () => {
    const teacherSchedule = filterScheduleForTeacher(demoSchedule, true);
    expect(teacherSchedule.length).toBeGreaterThan(0);
    expect(
      teacherSchedule.every(
        item => item.teacher === "Merve Karaca" || item.teacher === "Seda Kılıç"
      )
    ).toBe(true);
  });

  it("demo Ogrenciler listesi ogretmen ile ogrenci/veli rollerinde dogru suzulur", () => {
    const teacherStudents = filterStudentsForRole(
      demoStudents,
      "teacher",
      true
    );
    expect(teacherStudents.length).toBeGreaterThan(0);
    expect(
      teacherStudents.every(
        s => s.group === "YKS 12-A" || s.group === "YKS 11-C"
      )
    ).toBe(true);

    const studentView = filterStudentsForRole(demoStudents, "student", true);
    expect(studentView).toHaveLength(1);
    expect(studentView[0].id).toBe("stu-001");

    const parentView = filterStudentsForRole(demoStudents, "parent", true);
    expect(parentView).toHaveLength(1);
    expect(parentView[0].id).toBe("stu-001");
  });

  it("demo yoklama ogrencilerini ogretmenin siniflariyla suzer", () => {
    const teacherStudents = filterAttendanceStudents(
      demoStudents,
      "teacher",
      true
    );
    expect(teacherStudents.length).toBeGreaterThan(0);
    expect(
      teacherStudents.every(
        s => s.group === "YKS 12-A" || s.group === "YKS 11-C"
      )
    ).toBe(true);
    expect(filterAttendanceStudents(demoStudents, "student", true)).toEqual([]);
  });

  it("demo siniflari ogretmenin mentorlugune gore filtreler", () => {
    const teacherClasses = filterClassesForRole(demoClasses, "teacher", true);
    expect(teacherClasses.length).toBeGreaterThan(0);
    expect(teacherClasses.every(g => g.mentor === "Merve Karaca")).toBe(true);
  });

  it("demo odevleri role gore filtreler", () => {
    const teacherHomework = filterHomeworkForRole(
      demoHomework,
      "teacher",
      true
    );
    expect(teacherHomework.length).toBeGreaterThan(0);
    expect(
      teacherHomework.every(
        h => h.classGroup === "YKS 12-A" || h.classGroup === "YKS 11-C"
      )
    ).toBe(true);

    const studentHomework = filterHomeworkForRole(
      demoHomework,
      "student",
      true
    );
    expect(studentHomework.length).toBeGreaterThan(0);
    expect(studentHomework.every(h => h.classGroup === "YKS 12-A")).toBe(true);

    const parentHomework = filterHomeworkForRole(demoHomework, "parent", true);
    expect(parentHomework).toEqual(studentHomework);
  });

  it("demo odemeleri kaydini veli ile eslestirir", () => {
    const parentPayments = filterPaymentsForRole(
      demoPaymentRows,
      "parent",
      true
    );
    expect(parentPayments.length).toBeGreaterThan(0);
    expect(parentPayments.every(i => i.student === "Zeynep Kaya")).toBe(true);
  });

  it("demo ders programini role gore filtreler", () => {
    const studentSchedule = filterScheduleForRole(
      demoSchedule,
      "student",
      true
    );
    expect(studentSchedule.length).toBeGreaterThan(0);
    expect(
      studentSchedule.every(
        i => i.group === "YKS 12-A" || i.group === "Zeynep Kaya"
      )
    ).toBe(true);

    const parentSchedule = filterScheduleForRole(demoSchedule, "parent", true);
    expect(parentSchedule).toEqual(studentSchedule);

    const teacherSchedule = filterScheduleForRole(
      demoSchedule,
      "teacher",
      true
    );
    expect(teacherSchedule.length).toBeGreaterThan(0);
    expect(
      teacherSchedule.every(
        i => i.teacher === "Merve Karaca" || i.teacher === "Seda Kılıç"
      )
    ).toBe(true);
  });
});
