import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  School,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Users,
  WalletCards,
} from "lucide-react";
import type {
  Automation,
  AttendanceState,
  ClassGroup,
  PaymentRow,
  Role,
  ScheduleItem,
  Section,
  Student,
} from "./types";

export const students: Student[] = [
  {
    id: "stu-001",
    name: "Zeynep Kaya",
    code: "YKS-24018",
    group: "YKS 12-A",
    branch: "Çorlu Şube",
    parent: "Murat Kaya",
    attendance: 96,
    score: 84,
    homework: 8,
    payment: "Güncel",
    risk: "Dengeli",
    isMock: true,
  },
  {
    id: "stu-002",
    name: "Efe Demir",
    code: "YKS-24027",
    group: "YKS 12-A",
    branch: "Çorlu Şube",
    parent: "Elif Demir",
    attendance: 88,
    score: 71,
    homework: 5,
    payment: "Güncel",
    risk: "Takip gerekli",
    isMock: true,
  },
  {
    id: "stu-003",
    name: "Derin Yıldız",
    code: "YKS-24031",
    group: "YKS 12-B",
    branch: "Çorlu Şube",
    parent: "Selin Yıldız",
    attendance: 94,
    score: 78,
    homework: 7,
    payment: "Takip gerekli",
    risk: "Dengeli",
    isMock: true,
  },
  {
    id: "stu-004",
    name: "Aras Öztürk",
    code: "YKS-24042",
    group: "YKS 12-B",
    branch: "Çorlu Şube",
    parent: "Berna Öztürk",
    attendance: 82,
    score: 63,
    homework: 3,
    payment: "Güncel",
    risk: "Takip gerekli",
    isMock: true,
  },
  {
    id: "stu-005",
    name: "Nisan Akın",
    code: "YKS-24049",
    group: "YKS 11-C",
    branch: "Çorlu Şube",
    parent: "Emre Akın",
    attendance: 98,
    score: 89,
    homework: 9,
    payment: "Güncel",
    risk: "Dengeli",
    isMock: true,
  },
];

export const classes: ClassGroup[] = [
  {
    id: "cls-1",
    name: "YKS 12-A",
    program: "Sayısal hazırlık",
    mentor: "Merve Karaca",
    studentCount: 18,
    attendance: 94,
    nextLesson: "Bugün · 10:00 Matematik",
    isMock: true,
  },
  {
    id: "cls-2",
    name: "YKS 12-B",
    program: "Eşit ağırlık hazırlık",
    mentor: "Bora Ekin",
    studentCount: 16,
    attendance: 89,
    nextLesson: "Bugün · 11:30 Türkçe",
    isMock: true,
  },
  {
    id: "cls-3",
    name: "YKS 11-C",
    program: "Temel yeterlilik",
    mentor: "Merve Karaca",
    studentCount: 20,
    attendance: 97,
    nextLesson: "Yarın · 09:00 Fizik",
    isMock: true,
  },
];

export const schedule: ScheduleItem[] = [
  {
    time: "09:00",
    title: "TYT Matematik",
    group: "YKS 12-A",
    teacher: "Merve Karaca",
    room: "Derslik 204",
    tone: "bg-sky-50 text-sky-700 ring-sky-100",
    isMock: true,
  },
  {
    time: "10:30",
    title: "Problem Atölyesi",
    group: "YKS 12-B",
    teacher: "Bora Ekin",
    room: "Derslik 105",
    tone: "bg-violet-50 text-violet-700 ring-violet-100",
    isMock: true,
  },
  {
    time: "13:00",
    title: "Rehberlik Görüşmesi",
    group: "Zeynep Kaya",
    teacher: "Merve Karaca",
    room: "Görüşme Odası",
    tone: "bg-amber-50 text-amber-700 ring-amber-100",
    isMock: true,
  },
  {
    time: "14:30",
    title: "TYT Deneme Analizi",
    group: "YKS 11-C",
    teacher: "Seda Kılıç",
    room: "Etüt Salonu",
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    isMock: true,
  },
];

export const initialAutomations: Automation[] = [
  {
    id: "auto-1",
    title: "Aday kayıt takibi",
    description:
      "Yeni aday kaydını danışmana atar, ilk görüşme tamamlanana kadar takip görevi açar.",
    trigger: "Yeni aday formu geldiğinde",
    impact: "4 aday takipte",
    active: true,
    category: "Kayıt",
    isMock: true,
  },
  {
    id: "auto-2",
    title: "Devamsızlık bildirimi",
    description:
      "Yoklamada görünmeyen öğrenci için veliye onaylı bildirim ve rehberlik görevi oluşturur.",
    trigger: "Yoklama tamamlandığında",
    impact: "Bugün 3 öğrenci işlendi",
    active: true,
    category: "Devam",
    isMock: true,
  },
  {
    id: "auto-3",
    title: "Deneme sonucu takibi",
    description:
      "Deneme sonucu yayınlandığında öğrenci, veli ve öğretmen için takip özeti hazırlar.",
    trigger: "Sınav sonucu yayınlandığında",
    impact: "Son 7 gün · 42 özet",
    active: true,
    category: "Akademik",
    isMock: true,
  },
  {
    id: "auto-4",
    title: "Veli iletişim merkezi",
    description:
      "Duyuru ve görüşme taslaklarını doğru sınıf veya veli grubuna yönlendirir.",
    trigger: "İletişim görevi oluşturulduğunda",
    impact: "2 görüşme önerisi bekliyor",
    active: false,
    category: "İletişim",
    isMock: true,
  },
];

export const paymentRows: PaymentRow[] = [
  {
    student: "Zeynep Kaya",
    plan: "YKS Sayısal Paket",
    due: "05 Eylül 2026",
    amount: "₺7.200",
    status: "Güncel",
    isMock: true,
  },
  {
    student: "Derin Yıldız",
    plan: "YKS Eşit Ağırlık Paket",
    due: "28 Ağustos 2026",
    amount: "₺6.800",
    status: "Hatırlatma gerekli",
    isMock: true,
  },
  {
    student: "Aras Öztürk",
    plan: "YKS Eşit Ağırlık Paket",
    due: "18 Ağustos 2026",
    amount: "₺6.800",
    status: "Gecikme riski",
    isMock: true,
  },
];

export const initialAttendances: Record<string, AttendanceState> = {
  "stu-001": "Katıldı",
  "stu-002": "Katıldı",
  "stu-003": "Geç kaldı",
  "stu-004": "Gelmedi",
  "stu-005": "Katıldı",
};

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

export const roleEmail: Record<Role, string> = {
  admin: "yonetici@orbit.edu.tr",
  teacher: "ogretmen@orbit.edu.tr",
  student: "ogrenci@orbit.edu.tr",
  parent: "veli@orbit.edu.tr",
};

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
