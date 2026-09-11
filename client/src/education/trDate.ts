/**
 * Türkçe takvim ve tarih yardımcıları (v1.3-01 · E parçası & K-06).
 *
 * Sınav ve ödeme modülleri aynı tarih biçimlendiriciyi paylaşır.
 * İki ayrı modülde aynı kuralın kopyalanması önlenir (K-06).
 */

export const TR_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
] as const;

/**
 * ISO tarih dizgesini (YYYY-MM-DD) Türkçe arayüz formatına çevirir (ör. "14 Ağustos 2026", "5 Eylül 2026").
 *
 * Başında tek sıfır olan günleri sayıya çevirir ("5 Eylül", "05 Eylül" değil).
 * Geçersiz veya boş değerlerde güvenli davranır (K-04).
 */
export function formatTrDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;

  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (Number.isNaN(day) || Number.isNaN(monthIdx)) {
    return dateStr;
  }

  const monthName = TR_MONTHS[monthIdx] || parts[1];
  return `${day} ${monthName} ${year}`;
}
