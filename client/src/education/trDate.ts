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

/**
 * Kurum saatindeki (Europe/Istanbul) takvim gününü ISO formatında (YYYY-MM-DD) döner (v1.3-15 & orbit_today).
 *
 * Sunucunun TimeZone ayarı UTC olduğu için her gece 00:00-03:00 arası
 * `current_date` Türkiye'nin bir gün gerisindedir.
 *
 * Kural veritabanında yaşar (`orbit_today()`); buradaki onun istemci kopyasıdır.
 * İleride kurum saat dilimi ayarlanabilir olursa bu fonksiyon o ayarı okumak zorundadır (K-06).
 */
export function getOrbitToday(referenceDate: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(referenceDate);
}
