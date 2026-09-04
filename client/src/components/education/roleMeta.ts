import {
  BookOpen,
  GraduationCap,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import type { Role } from "./types";
import { isDemoMode } from "@/auth/runtime";

/**
 * Demo ortamında gösterilen sahte rol isimleri.
 *
 * Üretim kodunun bu isimlere erişebildiği hiçbir yol yoktu (#133) — ama
 * isimler yine de üretim PAKETİNE giriyordu ve paketi açan biri için aradaki
 * fark yok (#144). Ölçülmüştü: dördü de son derlemede yan yana duruyordu.
 *
 * Üçlü, `educationData.ts`'in her ihracında kullanılan kalıbın aynısı ve aynı
 * işi yapıyor: `isDemoMode` derleme zamanında `false`'a katlandığı için üretim
 * derlemesinde isim literalleri ulaşılamaz hale gelir ve elenir.
 *
 * Üretimdeki karşılık boş dizedir, uydurma bir isim değil — bu dalı okuyan bir
 * kod yolu ortaya çıkarsa sahte bir ad göstermek yerine hiçbir şey göstersin
 * (K-03). Bugün böyle bir yol yok: her tüketici zaten demo moduna bakıyor.
 */
export const demoRoleNames: Record<Role, string> = isDemoMode
  ? {
      admin: "Ayşe Yalçın",
      teacher: "Merve Karaca",
      student: "Zeynep Kaya",
      parent: "Murat Kaya",
    }
  : { admin: "", teacher: "", student: "", parent: "" };

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
