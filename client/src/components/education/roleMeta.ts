import {
  BookOpen,
  GraduationCap,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import type { Role } from "./types";

export const roleMeta: Record<
  Role,
  {
    label: string;
    short: string;
    name: string;
    description: string;
    icon: typeof ShieldCheck;
    color: string;
  }
> = {
  admin: {
    label: "Kurum Yöneticisi",
    short: "Yönetici",
    name: "Ayşe Yalçın",
    description: "Kurum genelini yönetin",
    icon: ShieldCheck,
    color: "bg-slate-900 text-white",
  },
  teacher: {
    label: "Öğretmen",
    short: "Öğretmen",
    name: "Merve Karaca",
    description: "Sınıflarınız ve öğrencileriniz",
    icon: GraduationCap,
    color: "bg-blue-600 text-white",
  },
  student: {
    label: "Öğrenci",
    short: "Öğrenci",
    name: "Zeynep Kaya",
    description: "Kendi programınız ve gelişiminiz",
    icon: BookOpen,
    color: "bg-emerald-600 text-white",
  },
  parent: {
    label: "Veli",
    short: "Veli",
    name: "Murat Kaya",
    description: "Zeynep Kaya için takip alanı",
    icon: UserRoundCheck,
    color: "bg-violet-600 text-white",
  },
};
