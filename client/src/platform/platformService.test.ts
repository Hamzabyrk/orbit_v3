import { describe, expect, it } from "vitest";
import {
  createOrganizationErrorMessage,
  organizationNotEmptyMessage,
} from "./platformService";

describe("organizationNotEmptyMessage", () => {
  it("engelleyen tabloları ve kayıt sayılarını mesaja yazar", () => {
    const message = organizationNotEmptyMessage([
      { table: "students", rows: 12 },
      { table: "classes", rows: 3 },
    ]);

    expect(message).toContain("students (12 kayıt)");
    expect(message).toContain("classes (3 kayıt)");
  });

  // Gerekçeyi gösterememek, silmeye izin vermek için sebep değildir: liste
  // hangi biçimde bozulursa bozulsun reddin kendisi bildirilmeye devam eder.
  it("liste okunamadığında reddi yine de bildirir", () => {
    const base = createOrganizationErrorMessage("organization_not_empty");

    expect(organizationNotEmptyMessage(null)).toBe(base);
    expect(organizationNotEmptyMessage([])).toBe(base);
    expect(organizationNotEmptyMessage("bozuk")).toBe(base);
    expect(organizationNotEmptyMessage([{ tablo: "students" }])).toBe(base);
  });

  it("okunabilen satırları alır, bozuk olanları atar", () => {
    const message = organizationNotEmptyMessage([
      { table: "exams", rows: 4 },
      { table: "payments", rows: "çok" },
    ]);

    expect(message).toContain("exams (4 kayıt)");
    expect(message).not.toContain("payments");
  });

  // "Tekrar deneyin" burada yanlış tavsiyedir: kayıtlar durdukça her deneme
  // reddedilir. Genel silme hatasından ayrı bir metin taşıdığı sabitleniyor.
  it("genel silme hatasıyla aynı metni taşımaz", () => {
    expect(createOrganizationErrorMessage("organization_not_empty")).not.toBe(
      createOrganizationErrorMessage("organization_delete_failed")
    );
    expect(
      createOrganizationErrorMessage("organization_not_empty")
    ).not.toMatch(/tekrar deneyin/i);
  });
});
