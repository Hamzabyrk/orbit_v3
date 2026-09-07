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

  it("farklı kurumlar için farklı sorgu anahtarları üretir (önbellek karışması önlenir)", () => {
    const key1 = educationKeys.students("org-a");
    const key2 = educationKeys.students("org-b");
    expect(key1).not.toEqual(key2);

    const classKey1 = educationKeys.classes("org-a");
    const classKey2 = educationKeys.classes("org-b");
    expect(classKey1).not.toEqual(classKey2);
  });
});
