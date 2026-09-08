import { describe, expect, it } from "vitest";
import { educationKeys } from "./educationQueries";

describe("educationKeys (K-19 ve Cache İzolasyonu)", () => {
  it("genel anahtar kökünü doğru üretir", () => {
    expect(educationKeys.all).toEqual(["education"]);
  });

  it("öğrenci anahtarı [alan, kaynak, kapsam] sözleşmesine uyar ve kurumu taşır", () => {
    const key = educationKeys.students("org-123");
    expect(key).toEqual([
      "education",
      "students",
      { organizationId: "org-123" },
    ]);
  });

  it("sınıf anahtarı [alan, kaynak, kapsam] sözleşmesine uyar ve kurumu taşır", () => {
    const key = educationKeys.classes("org-456");
    expect(key).toEqual([
      "education",
      "classes",
      { organizationId: "org-456" },
    ]);
  });

  it("ders programı anahtarı [alan, kaynak, kapsam] sözleşmesine uyar ve kurumu taşır", () => {
    const key = educationKeys.schedule("org-789");
    expect(key).toEqual([
      "education",
      "schedule",
      { organizationId: "org-789" },
    ]);
  });

  it("yoklama anahtarı [alan, kaynak, kapsam] sözleşmesine uyar ve kurumu taşır (v1.3-01c)", () => {
    const key = educationKeys.attendance("org-att-1");
    expect(key).toEqual([
      "education",
      "attendance",
      { organizationId: "org-att-1" },
    ]);
  });

  it("sınav anahtarı [alan, kaynak, kapsam] sözleşmesine uyar ve kurumu taşır (v1.3-01d)", () => {
    const key = educationKeys.exam("org-exam-1");
    expect(key).toEqual([
      "education",
      "exam",
      { organizationId: "org-exam-1" },
    ]);
  });

  it("farklı kurumlar için farklı sorgu anahtarları üretir (önbellek karışması önlenir)", () => {
    const key1 = educationKeys.students("org-a");
    const key2 = educationKeys.students("org-b");
    expect(key1).not.toEqual(key2);

    const classKey1 = educationKeys.classes("org-a");
    const classKey2 = educationKeys.classes("org-b");
    expect(classKey1).not.toEqual(classKey2);

    const scheduleKey1 = educationKeys.schedule("org-a");
    const scheduleKey2 = educationKeys.schedule("org-b");
    expect(scheduleKey1).not.toEqual(scheduleKey2);

    const attKey1 = educationKeys.attendance("org-a");
    const attKey2 = educationKeys.attendance("org-b");
    expect(attKey1).not.toEqual(attKey2);

    const examKey1 = educationKeys.exam("org-a");
    const examKey2 = educationKeys.exam("org-b");
    expect(examKey1).not.toEqual(examKey2);
  });
});
