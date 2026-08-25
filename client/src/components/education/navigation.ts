import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  NotebookPen,
  School,
  Settings,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import type { Role, Section } from "./types";

export const allNav: {
  label: Section;
  icon: typeof LayoutDashboard;
  roles: Role[];
  group: "Ana çalışma alanı" | "Kurum yönetimi";
}[] = [
  {
    label: "Genel Bakış",
    icon: LayoutDashboard,
    roles: ["admin", "teacher", "student", "parent"],
    group: "Ana çalışma alanı",
  },
  {
    label: "Gün Planı",
    icon: ListTodo,
    roles: ["admin", "teacher"],
    group: "Ana çalışma alanı",
  },
  {
    label: "Öğrenciler",
    icon: Users,
    roles: ["admin", "teacher"],
    group: "Ana çalışma alanı",
  },
  {
    label: "Sınıflar",
    icon: School,
    roles: ["admin", "teacher"],
    group: "Ana çalışma alanı",
  },
  {
    label: "Ders Programı",
    icon: CalendarDays,
    roles: ["admin", "teacher", "student", "parent"],
    group: "Ana çalışma alanı",
  },
  {
    label: "Yoklama",
    icon: ClipboardCheck,
    roles: ["admin", "teacher"],
    group: "Ana çalışma alanı",
  },
  {
    label: "Sınavlar",
    icon: BarChart3,
    roles: ["admin", "teacher", "student", "parent"],
    group: "Ana çalışma alanı",
  },
  {
    label: "Ödevler",
    icon: NotebookPen,
    roles: ["admin", "teacher", "student", "parent"],
    group: "Ana çalışma alanı",
  },
  {
    label: "İletişim",
    icon: MessageSquare,
    roles: ["admin", "teacher", "student", "parent"],
    group: "Ana çalışma alanı",
  },
  {
    label: "Kayıt ve Ödemeler",
    icon: WalletCards,
    roles: ["admin", "parent"],
    group: "Kurum yönetimi",
  },
  {
    label: "Otomasyonlar",
    icon: Sparkles,
    roles: ["admin"],
    group: "Kurum yönetimi",
  },
  {
    label: "Raporlar",
    icon: FileText,
    roles: ["admin", "teacher"],
    group: "Kurum yönetimi",
  },
  {
    label: "Ayarlar",
    icon: Settings,
    roles: ["admin"],
    group: "Kurum yönetimi",
  },
];
