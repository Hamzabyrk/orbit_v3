import { describe, expect, it } from "vitest";
import {
  getAffectedQueryKeys,
  REALTIME_BATCH_DEBOUNCE_MS,
  type EducationTable,
} from "./realtimeMapping";
import { educationKeys } from "@/education/educationQueries";

describe("realtimeMapping (K-06 ve K-19 Sorgu Anahtarı Eşlemesi)", () => {
  const orgId = "org-uuid-test";

  it("birleştirme (debounce) penceresi 300 ms olarak tanımlıdır", () => {
    expect(REALTIME_BATCH_DEBOUNCE_MS).toBe(300);
  });

  it("kurum kimliği boş veya tanımsızken hiçbir sorgu döndürmez", () => {
    expect(getAffectedQueryKeys("students", "")).toEqual([]);
    expect(getAffectedQueryKeys("installments", "")).toEqual([]);
  });

  it("bilinmeyen veya dinlenmeyen tablolarda boş dizi döner", () => {
    expect(getAffectedQueryKeys("audit_events", orgId)).toEqual([]);
    expect(getAffectedQueryKeys("organization_memberships", orgId)).toEqual([]);
    expect(getAffectedQueryKeys("unknown_table", orgId)).toEqual([]);
  });

  // ⛔ Öğrenci ADI üç yerde okunuyor: öğrenci listesinde doğrudan, yoklama ve
  // ödeme servislerinin `select`'lerinde GÖMÜLÜ (`students ( full_name )`).
  // Yalnız öğrenci sorgusu tazelenirse yönetici bir adı düzelttiğinde ödeme
  // ekranı eski adı göstermeye devam eder — sessiz bayatlık.
  it("1. students: öğrenci, yoklama ve ödeme sorgularını tazeler (ad gömülü okunuyor)", () => {
    const keys = getAffectedQueryKeys("students", orgId);
    expect(keys).toHaveLength(3);
    expect(keys).toContainEqual(educationKeys.students(orgId));
    expect(keys).toContainEqual(educationKeys.attendance(orgId));
    expect(keys).toContainEqual(educationKeys.payments(orgId));
    // ⛔ Ders programı öğrenci adı okumuyor; oraya dokunulmamalı.
    expect(keys).not.toContainEqual(educationKeys.schedule(orgId));
  });

  // ⛔ Sınıf adı `scheduleService`'in `select`'inde de gömülü okunuyor.
  it("2. classes: sınıf, öğrenci ve ders programı sorgularını tazeler (sınıf adı gömülü)", () => {
    const keys = getAffectedQueryKeys("classes", orgId);
    expect(keys).toHaveLength(3);
    expect(keys).toContainEqual(educationKeys.classes(orgId));
    expect(keys).toContainEqual(educationKeys.students(orgId));
    expect(keys).toContainEqual(educationKeys.schedule(orgId));
  });

  it("3. class_enrollments: hem sınıf (studentCount) hem öğrenci (group) sorgusunu tazeler", () => {
    const keys = getAffectedQueryKeys("class_enrollments", orgId);
    expect(keys).toHaveLength(2);
    expect(keys).toContainEqual(educationKeys.classes(orgId));
    expect(keys).toContainEqual(educationKeys.students(orgId));
  });

  it("4. schedule_entries: yalnızca ders programı sorgusunu tazeler", () => {
    const keys = getAffectedQueryKeys("schedule_entries", orgId);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toEqual(educationKeys.schedule(orgId));
  });

  it("5. attendance_sessions: hem yoklama hem öğrenci (Student.attendance) sorgusunu tazeler", () => {
    const keys = getAffectedQueryKeys("attendance_sessions", orgId);
    expect(keys).toHaveLength(2);
    expect(keys).toContainEqual(educationKeys.attendance(orgId));
    expect(keys).toContainEqual(educationKeys.students(orgId));
  });

  it("6. attendance_records: hem yoklama hem öğrenci (Student.attendance) sorgusunu tazeler", () => {
    const keys = getAffectedQueryKeys("attendance_records", orgId);
    expect(keys).toHaveLength(2);
    expect(keys).toContainEqual(educationKeys.attendance(orgId));
    expect(keys).toContainEqual(educationKeys.students(orgId));
  });

  it("7. exams: hem sınav hem öğrenci (Student.score) sorgusunu tazeler", () => {
    const keys = getAffectedQueryKeys("exams", orgId);
    expect(keys).toHaveLength(2);
    expect(keys).toContainEqual(educationKeys.exam(orgId));
    expect(keys).toContainEqual(educationKeys.students(orgId));
  });

  it("8. exam_results: hem sınav (katılımcı sayısı) hem öğrenci (Student.score) sorgusunu tazeler", () => {
    const keys = getAffectedQueryKeys("exam_results", orgId);
    expect(keys).toHaveLength(2);
    expect(keys).toContainEqual(educationKeys.exam(orgId));
    expect(keys).toContainEqual(educationKeys.students(orgId));
  });

  it("9. payment_plans: ödeme listesi, özet kartları ve öğrenci (Student.payment) sorgusunu tazeler", () => {
    const keys = getAffectedQueryKeys("payment_plans", orgId);
    expect(keys).toHaveLength(3);
    expect(keys).toContainEqual(educationKeys.payments(orgId));
    expect(keys).toContainEqual(educationKeys.paymentOverview(orgId));
    expect(keys).toContainEqual(educationKeys.students(orgId));
  });

  it("10. installments: hem ödeme hem özet hem öğrenci (Student.payment) sorgusunu tazeler", () => {
    const keys = getAffectedQueryKeys("installments", orgId);
    expect(keys).toHaveLength(3);
    expect(keys).toContainEqual(educationKeys.payments(orgId));
    expect(keys).toContainEqual(educationKeys.paymentOverview(orgId));
    expect(keys).toContainEqual(educationKeys.students(orgId));
  });

  it("⛔ Hiçbir tekil tablo mesajı toptan tazeleme (educationKeys.all) döndürmez", () => {
    const tables: EducationTable[] = [
      "students",
      "classes",
      "class_enrollments",
      "schedule_entries",
      "attendance_sessions",
      "attendance_records",
      "exams",
      "exam_results",
      "payment_plans",
      "installments",
    ];

    for (const tbl of tables) {
      const keys = getAffectedQueryKeys(tbl, orgId);
      expect(keys).not.toContainEqual(educationKeys.all);
    }
  });
});
