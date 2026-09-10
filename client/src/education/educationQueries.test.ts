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

  it("öğrenci anahtarı arama terimi verildiğinde terimi de taşır (v1.4-01)", () => {
    const keyWithSearch = educationKeys.students("org-123", "Ali");
    expect(keyWithSearch).toEqual([
      "education",
      "students",
      { organizationId: "org-123", search: "Ali" },
    ]);

    // Farklı arama terimleri farklı cache anahtarı üretir
    const keyVeli = educationKeys.students("org-123", "Veli");
    expect(keyWithSearch).not.toEqual(keyVeli);

    // Boşluklar kırpılır
    const keyTrimmed = educationKeys.students("org-123", "  Ali  ");
    expect(keyTrimmed).toEqual(keyWithSearch);

    // Boş arama anahtara search eklemez
    const keyEmpty = educationKeys.students("org-123", "   ");
    expect(keyEmpty).toEqual(educationKeys.students("org-123"));
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

  it("ödeme listesi anahtarı [alan, kaynak, kapsam] sözleşmesine uyar ve kurumu taşır (v1.3-01e)", () => {
    const key = educationKeys.payments("org-pay-1");
    expect(key).toEqual([
      "education",
      "payments",
      { organizationId: "org-pay-1" },
    ]);
  });

  it("ödeme özet anahtarı [alan, kaynak, kapsam] sözleşmesine uyar ve kurumu taşır (v1.3-01e)", () => {
    const key = educationKeys.paymentOverview("org-pay-1");
    expect(key).toEqual([
      "education",
      "paymentOverview",
      { organizationId: "org-pay-1" },
    ]);
  });

  it("sınıf kayıtları anahtarı [alan, kaynak, kapsam] sözleşmesine uyar ve kurumu + sınıfı taşır (v1.4-02)", () => {
    const key = educationKeys.classEnrollments("org-123", "class-456");
    expect(key).toEqual([
      "education",
      "classEnrollments",
      { organizationId: "org-123", classId: "class-456" },
    ]);

    const otherClassKey = educationKeys.classEnrollments(
      "org-123",
      "class-789"
    );
    expect(key).not.toEqual(otherClassKey);
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

    const payKey1 = educationKeys.payments("org-a");
    const payKey2 = educationKeys.payments("org-b");
    expect(payKey1).not.toEqual(payKey2);

    const overKey1 = educationKeys.paymentOverview("org-a");
    const overKey2 = educationKeys.paymentOverview("org-b");
    expect(overKey1).not.toEqual(overKey2);
  });
});
