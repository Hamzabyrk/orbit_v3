import {
  BookOpen,
  GraduationCap,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import type { Role } from "./types";

/**
 * Demo ortamında gösterilen sahte rol isimleri.
 * Üretim kodunun demo isimlere erişebildiği hiçbir yol bırakılmamıştır (#133).
 */
export const demoRoleNames: Record<Role, string> = {
  admin: "Ayşe Yalçın",
  teacher: "Merve Karaca",
  student: "Zeynep Kaya",
  parent: "Murat Kaya",
};

export const roleMeta: Record<
  Role,
  {
    label: string;
    short: string;
    description: string;
    icon: typeof ShieldCheck;
    color: string;
  }
> = {
  admin: {
    label: "Kurum Yöneticisi",
    short: "Yönetici",
    description: "Kurum genelini yönetin",
    icon: ShieldCheck,
    color: "bg-slate-900 text-white",
  },
  teacher: {
    label: "Öğretmen",
    short: "Öğretmen",
    description: "Sınıflarınız ve öğrencileriniz",
    icon: GraduationCap,
    color: "bg-blue-600 text-white",
  },
  student: {
    label: "Öğrenci",
    short: "Öğrenci",
    description: "Kendi programınız ve gelişiminiz",
    icon: BookOpen,
    color: "bg-emerald-600 text-white",
  },
  parent: {
    label: "Veli",
    short: "Veli",
    description: "Öğrencinizin takip alanı",
    icon: UserRoundCheck,
    color: "bg-violet-600 text-white",
  },
};
