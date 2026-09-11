import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// JSX dönüşümü `React`'i kapsamda arıyor; `shared.test.ts` ve
// `platformQueries.test.ts` de aynı satırı taşıyor.
(globalThis as unknown as { React: typeof React }).React = React;

import { StudentDetail } from "./StudentDetail";
import type { Student } from "./types";

/**
 * Öğrenci detayı — canlı bir öğrencinin üzerine uydurma veri basılmaz.
 *
 * Bu testlerin sebebi somut. v1.3 kapandıktan sonra yapılan incelemede
 * `StudentDetail` üç sabit değer taşıyordu ve ikisi **canlıda çiziliyordu**:
 *
 *   1. Gerçek puan, sabit `detail="TYT Deneme 06"` altında gösteriliyordu —
 *      kurumda LGS denemesi yapılsa bile. Üstelik doğrusu elin altındaydı:
 *      `student_latest_exam_scores` `exam_name` döndürüyor, istemci onu
 *      okumuyordu.
 *   2. "Geometri konusunda düzenli tekrar önerildi. Veli görüşmesi için 20
 *      Ağustos tarihinde uygun slot bulundu." bloğu **koşulsuzdu** — istisnasız
 *      her öğrenci için, uydurma bir tarih ve uydurma bir öneriyle.
 *
 * Kök neden ikincisinde değil birincisindeydi: `StatCard.detail` **zorunlu**
 * bir prop'tu. Doldurulamayan zorunlu bir alan uydurulur (**K-03**). Alan
 * opsiyonel yapıldı.
 */
function ogrenci(overrides: Partial<Student> = {}): Student {
  return {
    id: "stu-1",
    name: "Zeynep Kaya",
    group: "12-A",
    branch: "Merkez",
    ...overrides,
  } as Student;
}

describe("StudentDetail — uydurma veri yok (K-03 / K-22)", () => {
  it("⛔ gerçek puanın altına sabit bir sınav adı yazmaz", () => {
    const html = renderToStaticMarkup(
      createElement(StudentDetail, {
        student: ogrenci({ score: 84 }),
        onClose: vi.fn(),
      })
    );

    expect(html).toContain("84");
    expect(html).not.toContain("TYT Deneme 06");
  });

  it("⛔ hiçbir öğrenciye sabit rehberlik notu basmaz", () => {
    const html = renderToStaticMarkup(
      createElement(StudentDetail, {
        student: ogrenci({ score: 84, attendance: 92 }),
        onClose: vi.fn(),
      })
    );

    expect(html).not.toContain("Geometri");
    expect(html).not.toContain("20 Ağustos");
    expect(html).not.toContain("Son not");
  });

  it("⛔ kaynağı olmayan alanlar hiç çizilmez, sıfır ya da tire uydurulmaz", () => {
    const html = renderToStaticMarkup(
      createElement(StudentDetail, {
        // Üretimde bugünkü hâli: puan ve devam var, ödev/ödeme/risk yok.
        student: ogrenci({ score: 84, attendance: 92 }),
        onClose: vi.fn(),
      })
    );

    // `homework` tanımsız: payda (`/9`) da dahil hiçbir şey çizilmemeli.
    expect(html).not.toContain("Ödev tamamlama");
    expect(html).not.toContain("/9");
    expect(html).not.toContain("Ödeme durumu");
    expect(html).not.toContain("Akademik sinyal");
  });

  it("veri varsa çizilir — test yalnızca uydurmayı değil, çizmeyi de sabitler", () => {
    const html = renderToStaticMarkup(
      createElement(StudentDetail, {
        student: ogrenci({
          attendance: 92,
          payment: "Takip gerekli",
          parent: "Murat Kaya",
        }),
        onClose: vi.fn(),
      })
    );

    expect(html).toContain("Murat Kaya");
    expect(html).toContain("Takip gerekli");
    expect(html).toContain("92");
  });

  it("#257: gerçek sınav adı, tarihi ve tam puanı dolu olduğunda çizilir", () => {
    const html = renderToStaticMarkup(
      createElement(StudentDetail, {
        student: ogrenci({
          score: 84,
          latestExamName: "TYT Deneme 01",
          latestExamDate: "2026-09-10",
          latestExamMaxScore: 100,
        }),
        onClose: vi.fn(),
      })
    );

    expect(html).toContain("84 / 100");
    expect(html).toContain("TYT Deneme 01 · 10 Eylül 2026");
  });
});
