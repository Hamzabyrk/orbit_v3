import {
  Bell,
  Lock,
  RotateCcw,
  School,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
  User,
  type LucideIcon,
} from "lucide-react";

export type SettingsCategoryId =
  | "profil"
  | "kurum"
  | "bildirimler"
  | "roller"
  | "sistem"
  | "guvenlik"
  | "veri-yonetimi"
  | "veri-ice-aktarma";

export type SettingsCategoryMeta = {
  id: SettingsCategoryId;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  eyebrow: string;
};

export const SETTINGS_CATEGORIES: SettingsCategoryMeta[] = [
  {
    id: "profil",
    title: "Profil",
    subtitle: "Kişisel hesap ve iletişim",
    icon: User,
    eyebrow: "Kişisel bilgiler",
  },
  {
    id: "kurum",
    title: "Kurum",
    subtitle: "Şube ve kurum bilgileri",
    icon: School,
    eyebrow: "Kurum ve şube bilgileri",
  },
  {
    id: "bildirimler",
    title: "Bildirimler",
    subtitle: "Takip ve hatırlatma tercihleri",
    icon: Bell,
    eyebrow: "Bildirim tercihleri",
  },
  {
    id: "roller",
    title: "Roller ve Erişim",
    subtitle: "Rol bazlı görünürlük matrisi",
    icon: ShieldCheck,
    eyebrow: "Erişim matrisi",
  },
  {
    id: "sistem",
    title: "Sistem",
    subtitle: "Genel çalışma varsayımları",
    icon: SlidersHorizontal,
    eyebrow: "Sistem varsayımları",
  },
  {
    id: "guvenlik",
    title: "Güvenlik",
    subtitle: "Oturum ve erişim tercihleri",
    icon: Lock,
    eyebrow: "Hesap güvenliği",
  },
  {
    id: "veri-yonetimi",
    title: "Veri Yönetimi",
    subtitle: "Dışa aktarma ve sıfırlama",
    icon: RotateCcw,
    eyebrow: "Arşiv, dışa aktarma ve sıfırlama",
  },
  {
    id: "veri-ice-aktarma",
    title: "Veri İçe Aktarma",
    subtitle: "Eski kayıtları sisteme aktarın",
    icon: UploadCloud,
    eyebrow: "Toplu veri aktarımı",
  },
];
