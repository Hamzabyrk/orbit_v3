import { describe, expect, it } from "vitest";
import { shouldConfirmLeaving } from "./navigationGuards";

describe("navigationGuards - shouldConfirmLeaving (v1.4-03 Revizyon 2)", () => {
  it("kirli durumdayken Yoklama'dan başka bir bölüme çıkışta onay gerektirir (true döner)", () => {
    // Öğretmen yoklamayı doldurmuş (isDirty = true) ve Öğrenciler'e tıklamış
    expect(shouldConfirmLeaving("Yoklama", "Öğrenciler", true)).toBe(true);
    expect(shouldConfirmLeaving("Yoklama", "Sınıflar", true)).toBe(true);
    expect(shouldConfirmLeaving("Yoklama", "Genel Bakış", true)).toBe(true);
  });

  it("temiz durumdayken Yoklama'dan başka bir bölüme geçişte onay gerektirmez (false döner)", () => {
    // Yoklama henüz değiştirilmemiş veya kaydedilmiş (isDirty = false)
    expect(shouldConfirmLeaving("Yoklama", "Öğrenciler", false)).toBe(false);
    expect(shouldConfirmLeaving("Yoklama", "Sınıflar", false)).toBe(false);
    expect(shouldConfirmLeaving("Yoklama", "Genel Bakış", false)).toBe(false);
  });

  it("kirli olsa bile Yoklama'dan Yoklama'ya tıklandığında onay gerektirmez (false döner)", () => {
    // Aynı menü öğesine tekrar basılması sayfadan ayrılma sayılmaz
    expect(shouldConfirmLeaving("Yoklama", "Yoklama", true)).toBe(false);
    expect(shouldConfirmLeaving("Yoklama", "Yoklama", false)).toBe(false);
  });

  it("kirli durumdayken Sınavlar'dan başka bir bölüme çıkışta onay gerektirir (true döner) (v1.4-04 #270)", () => {
    expect(shouldConfirmLeaving("Sınavlar", "Öğrenciler", true)).toBe(true);
    expect(shouldConfirmLeaving("Sınavlar", "Sınıflar", true)).toBe(true);
    expect(shouldConfirmLeaving("Sınavlar", "Genel Bakış", true)).toBe(true);
  });

  it("temiz durumdayken Sınavlar'dan başka bir bölüme geçişte onay gerektirmez (false döner)", () => {
    expect(shouldConfirmLeaving("Sınavlar", "Öğrenciler", false)).toBe(false);
    expect(shouldConfirmLeaving("Sınavlar", "Sınıflar", false)).toBe(false);
  });

  it("kirli olsa bile Sınavlar'dan Sınavlar'a tıklandığında onay gerektirmez (false döner)", () => {
    expect(shouldConfirmLeaving("Sınavlar", "Sınavlar", true)).toBe(false);
    expect(shouldConfirmLeaving("Sınavlar", "Sınavlar", false)).toBe(false);
  });

  it("Yoklama ve Sınavlar dışındaki bir sayfadan ayrılırken kirli olsa bile onay gerektirmez (false döner)", () => {
    expect(shouldConfirmLeaving("Öğrenciler", "Sınıflar", true)).toBe(false);
    expect(shouldConfirmLeaving("Genel Bakış", "Yoklama", true)).toBe(false);
    expect(shouldConfirmLeaving("Ders Programı", "Ödemeler", true)).toBe(false);
  });
});
