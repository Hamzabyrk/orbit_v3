export type EducationRole = "admin" | "teacher" | "student" | "parent";

export type EducationSection =
  | "Genel Bakış"
  | "Gün Planı"
  | "Öğrenciler"
  | "Sınıflar"
  | "Ders Programı"
  | "Yoklama"
  | "Sınavlar"
  | "İletişim"
  | "Kayıt ve Ödemeler"
  | "Otomasyonlar"
  | "Raporlar"
  | "Ayarlar";

const access: Record<EducationRole, EducationSection[]> = {
  admin: [
    "Genel Bakış",
    "Gün Planı",
    "Öğrenciler",
    "Sınıflar",
    "Ders Programı",
    "Yoklama",
    "Sınavlar",
    "İletişim",
    "Kayıt ve Ödemeler",
    "Otomasyonlar",
    "Raporlar",
    "Ayarlar",
  ],
  teacher: [
    "Genel Bakış",
    "Gün Planı",
    "Öğrenciler",
    "Sınıflar",
    "Ders Programı",
    "Yoklama",
    "Sınavlar",
    "İletişim",
    "Raporlar",
  ],
  student: ["Genel Bakış", "Ders Programı", "Sınavlar", "İletişim"],
  parent: [
    "Genel Bakış",
    "Ders Programı",
    "Sınavlar",
    "İletişim",
    "Kayıt ve Ödemeler",
  ],
};

export function availableEducationSections(
  role: EducationRole
): EducationSection[] {
  return access[role];
}

export function canAccessEducationSection(
  role: EducationRole,
  section: EducationSection
): boolean {
  return availableEducationSections(role).includes(section);
}
