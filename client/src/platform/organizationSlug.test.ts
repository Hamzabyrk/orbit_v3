import { describe, expect, it } from "vitest";
import {
  isValidOrganizationSlug,
  slugifyOrganizationName,
  SLUG_MAX_LENGTH,
} from "./organizationSlug";

describe("slugifyOrganizationName", () => {
  it("Türkçe harfleri ASCII karşılıklarına çevirir", () => {
    expect(slugifyOrganizationName("Çorlu Işık Dershanesi")).toBe(
      "corlu-isik-dershanesi"
    );
    expect(slugifyOrganizationName("Güngören Öğrenci Merkezi")).toBe(
      "gungoren-ogrenci-merkezi"
    );
  });

  it("büyük İ harfini birleşik noktalı karaktere düşürmez", () => {
    // "İ".toLowerCase() birleşik nokta içeren bir karakter üretir ve slug
    // kalıbına uymaz. Çeviri küçültmeden önce yapıldığı için sorun oluşmaz.
    const slug = slugifyOrganizationName("İZMİR ETÜT");

    expect(slug).toBe("izmir-etut");
    expect(isValidOrganizationSlug(slug)).toBe(true);
  });

  it("baştaki ve sondaki ayırıcıları hiç üretmez", () => {
    expect(slugifyOrganizationName("  --Anadolu Kursu!!  ")).toBe(
      "anadolu-kursu"
    );
  });

  it("art arda gelen ayırıcıları teke indirir", () => {
    expect(slugifyOrganizationName("Beta   ///   Kurs")).toBe("beta-kurs");
  });

  it("rakamları korur", () => {
    expect(slugifyOrganizationName("75. Yıl Etüt 2026")).toBe(
      "75-yil-etut-2026"
    );
  });

  it("hiç geçerli karakter yoksa boş dize döner", () => {
    // Bozuk bir slug üretip Edge Function'a göndermektense boş dönüp
    // operatörden elle yazmasını istemek doğrusu.
    expect(slugifyOrganizationName("!!! ???")).toBe("");
    expect(isValidOrganizationSlug("")).toBe(false);
  });

  it("uzunluk sınırını aşmaz", () => {
    const slug = slugifyOrganizationName("Uzun".repeat(60));

    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
  });
});

describe("isValidOrganizationSlug", () => {
  it("Edge Function'ın kabul ettiği biçimi kabul eder", () => {
    expect(isValidOrganizationSlug("corlu-isik")).toBe(true);
    expect(isValidOrganizationSlug("ab")).toBe(true);
  });

  it("kalıbı ihlal eden değerleri reddeder", () => {
    expect(isValidOrganizationSlug("a")).toBe(false);
    expect(isValidOrganizationSlug("-corlu")).toBe(false);
    expect(isValidOrganizationSlug("corlu-")).toBe(false);
    expect(isValidOrganizationSlug("corlu--isik")).toBe(false);
    expect(isValidOrganizationSlug("Corlu")).toBe(false);
    expect(isValidOrganizationSlug("çorlu")).toBe(false);
    expect(isValidOrganizationSlug("corlu isik")).toBe(false);
  });
});
