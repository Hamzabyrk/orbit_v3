import { describe, expect, it } from "vitest";
import {
  availableEducationSections,
  canAccessEducationSection,
} from "./educationAccess";

describe("education role access", () => {
  it("gives the administrator access to the full Faz 1 MVP navigation", () => {
    expect(availableEducationSections("admin")).toContain("Otomasyonlar");
    expect(availableEducationSections("admin")).toContain("Kayıt ve Ödemeler");
    expect(availableEducationSections("admin")).toHaveLength(13);
  });

  it("gives the day-plan workspace to admin and teacher only", () => {
    expect(canAccessEducationSection("admin", "Gün Planı")).toBe(true);
    expect(canAccessEducationSection("teacher", "Gün Planı")).toBe(true);
    expect(canAccessEducationSection("student", "Gün Planı")).toBe(false);
    expect(canAccessEducationSection("parent", "Gün Planı")).toBe(false);
  });

  it("keeps the teacher inside academic and classroom operations", () => {
    expect(canAccessEducationSection("teacher", "Yoklama")).toBe(true);
    expect(canAccessEducationSection("teacher", "Öğrenciler")).toBe(true);
    expect(canAccessEducationSection("teacher", "Kayıt ve Ödemeler")).toBe(
      false
    );
    expect(canAccessEducationSection("teacher", "Otomasyonlar")).toBe(false);
  });

  it("limits student and parent views to their own operational context", () => {
    expect(availableEducationSections("student")).toEqual([
      "Genel Bakış",
      "Ders Programı",
      "Sınavlar",
      "Ödevler",
      "İletişim",
    ]);
    expect(canAccessEducationSection("parent", "Kayıt ve Ödemeler")).toBe(true);
    expect(canAccessEducationSection("parent", "Öğrenciler")).toBe(false);
  });

  it("gives every role access to Ödevler, with capability handled inside the page", () => {
    expect(canAccessEducationSection("admin", "Ödevler")).toBe(true);
    expect(canAccessEducationSection("teacher", "Ödevler")).toBe(true);
    expect(canAccessEducationSection("student", "Ödevler")).toBe(true);
    expect(canAccessEducationSection("parent", "Ödevler")).toBe(true);
  });
});
