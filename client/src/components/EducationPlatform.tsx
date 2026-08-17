import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { OrbitMark } from "@/components/OrbitMark";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  School,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { availableEducationSections } from "./educationAccess";
import type { EducationRole, EducationSection } from "./educationAccess";

type Role = EducationRole;
type Section = EducationSection;
type AttendanceState = "Katıldı" | "Geç kaldı" | "Gelmedi" | "İzinli";

type Student = {
  id: string;
  name: string;
  code: string;
  group: string;
  branch: string;
  parent: string;
  attendance: number;
  score: number;
  homework: number;
  payment: "Güncel" | "Takip gerekli";
  risk: "Dengeli" | "Takip gerekli";
};

type ClassGroup = {
  id: string;
  name: string;
  program: string;
  mentor: string;
  studentCount: number;
  attendance: number;
  nextLesson: string;
};
type ScheduleItem = {
  time: string;
  title: string;
  group: string;
  teacher: string;
  room: string;
  tone: string;
};
type Automation = {
  id: string;
  title: string;
  description: string;
  trigger: string;
  impact: string;
  active: boolean;
  category: string;
};

const students: Student[] = [
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
  },
];

const classes: ClassGroup[] = [
  {
    id: "cls-1",
    name: "YKS 12-A",
    program: "Sayısal hazırlık",
    mentor: "Merve Karaca",
    studentCount: 18,
    attendance: 94,
    nextLesson: "Bugün · 10:00 Matematik",
  },
  {
    id: "cls-2",
    name: "YKS 12-B",
    program: "Eşit ağırlık hazırlık",
    mentor: "Bora Ekin",
    studentCount: 16,
    attendance: 89,
    nextLesson: "Bugün · 11:30 Türkçe",
  },
  {
    id: "cls-3",
    name: "YKS 11-C",
    program: "Temel yeterlilik",
    mentor: "Merve Karaca",
    studentCount: 20,
    attendance: 97,
    nextLesson: "Yarın · 09:00 Fizik",
  },
];

const schedule: ScheduleItem[] = [
  {
    time: "09:00",
    title: "TYT Matematik",
    group: "YKS 12-A",
    teacher: "Merve Karaca",
    room: "Derslik 204",
    tone: "bg-sky-50 text-sky-700 ring-sky-100",
  },
  {
    time: "10:30",
    title: "Problem Atölyesi",
    group: "YKS 12-B",
    teacher: "Bora Ekin",
    room: "Derslik 105",
    tone: "bg-violet-50 text-violet-700 ring-violet-100",
  },
  {
    time: "13:00",
    title: "Rehberlik Görüşmesi",
    group: "Zeynep Kaya",
    teacher: "Merve Karaca",
    room: "Görüşme Odası",
    tone: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  {
    time: "14:30",
    title: "TYT Deneme Analizi",
    group: "YKS 11-C",
    teacher: "Seda Kılıç",
    room: "Etüt Salonu",
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
];

const initialAutomations: Automation[] = [
  {
    id: "auto-1",
    title: "Aday kayıt takibi",
    description:
      "Yeni aday kaydını danışmana atar, ilk görüşme tamamlanana kadar takip görevi açar.",
    trigger: "Yeni aday formu geldiğinde",
    impact: "4 aday takipte",
    active: true,
    category: "Kayıt",
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
  },
];

const roleMeta: Record<
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

const roleEmail: Record<Role, string> = {
  admin: "yonetici@orbit.edu.tr",
  teacher: "ogretmen@orbit.edu.tr",
  student: "ogrenci@orbit.edu.tr",
  parent: "veli@orbit.edu.tr",
};

export function EducationLoginScreen({
  onLogin,
}: {
  onLogin: (role: Role) => void;
}) {
  const [selectedRole, setSelectedRole] = useState<Role>("admin");
  const [email, setEmail] = useState(roleEmail.admin);
  const [password, setPassword] = useState("demo123");
  const [loading, setLoading] = useState(false);
  const selectRole = (role: Role) => {
    setSelectedRole(role);
    setEmail(roleEmail[role]);
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== "demo123") {
      toast.error("Giriş bilgileri doğrulanamadı", {
        description: "Demo şifresi demo123 olarak ayarlanmıştır.",
      });
      return;
    }
    const matchedRole =
      (Object.keys(roleEmail) as Role[]).find(
        role => roleEmail[role] === email
      ) ?? selectedRole;
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      toast.success(`Hoş geldiniz, ${roleMeta[matchedRole].name}`);
      onLogin(matchedRole);
    }, 280);
  };
  return (
    <main className="min-h-screen overflow-hidden bg-[#eef7ff] px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1200px] flex-col">
        <header className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 p-2">
            <OrbitMark
              inverted
              priority
              className="h-full w-full object-contain"
            />
          </span>
          <div>
            <p className="font-orbit text-[20px] font-extrabold tracking-[-.06em] text-slate-900">
              ORBIT
            </p>
            <p className="-mt-1 text-[9px] font-bold uppercase tracking-[.16em] text-blue-600">
              Education
            </p>
          </div>
        </header>
        <section className="my-auto grid overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_26px_80px_rgba(75,135,180,.18)] lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
          <div className="p-7 sm:p-10 lg:p-14">
            <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-blue-600">
              Eğitim kurumunuz için ortak çalışma alanı
            </p>
            <h1 className="mt-3 font-display text-[31px] font-extrabold tracking-[-.06em] text-slate-950 sm:text-[38px]">
              İyi eğitim, iyi takip ile başlar.
            </h1>
            <p className="mt-3 max-w-md text-[13px] leading-6 text-slate-500">
              Öğrenci, veli, öğretmen ve kurum yöneticileri aynı akademik
              akışta; herkes yalnızca kendisine ait çalışma alanını görür.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-2">
              {(Object.keys(roleMeta) as Role[]).map(role => {
                const Icon = roleMeta[role].icon;
                const selected = selectedRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => selectRole(role)}
                    className={`rounded-xl border p-3 text-left transition ${selected ? "border-slate-900 bg-slate-900 text-white shadow-[0_8px_18px_rgba(15,23,42,.12)]" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/50"}`}
                  >
                    <Icon
                      className={`h-4 w-4 ${selected ? "text-white" : "text-blue-600"}`}
                    />
                    <p className="mt-2 text-[11px] font-extrabold">
                      {roleMeta[role].label}
                    </p>
                    <p
                      className={`mt-0.5 text-[9px] ${selected ? "text-white/70" : "text-slate-400"}`}
                    >
                      {roleMeta[role].description}
                    </p>
                  </button>
                );
              })}
            </div>
            <form onSubmit={submit} className="mt-7 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                  E-posta adresi
                </span>
                <input
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  type="email"
                  className="h-12 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                  Şifre
                </span>
                <input
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  type="password"
                  className="h-12 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </label>
              <button
                disabled={loading}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-[13px] font-extrabold text-white shadow-[0_10px_18px_rgba(15,23,42,.12)] transition hover:bg-slate-800 disabled:opacity-70"
              >
                {loading
                  ? "Giriş yapılıyor"
                  : `${roleMeta[selectedRole].label} olarak giriş yap`}
                <ChevronRight className="h-4 w-4" />
              </button>
            </form>
            <p className="mt-5 text-[10px] leading-5 text-slate-400">
              Demo şifresi:{" "}
              <strong className="font-bold text-slate-600">demo123</strong>. Rol
              kartı seçildiğinde ilgili demo e-posta hesabı otomatik doldurulur.
            </p>
          </div>
          <aside className="relative hidden overflow-hidden bg-slate-900 p-10 text-white lg:block">
            <div className="absolute -right-20 -top-16 h-72 w-72 rounded-full bg-blue-500/35 blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between border-b border-white/15 pb-5">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-sky-200">
                    ORBIT education
                  </p>
                  <p className="mt-1 text-[11px] text-slate-300">
                    Kurum genel görünümü
                  </p>
                </div>
                <Badge tone="green">Sistemler güncel</Badge>
              </div>
              <h2 className="mt-10 max-w-md font-display text-[38px] font-extrabold leading-[1.08] tracking-[-.06em]">
                Eğitim ekibinizin günlük ritmi, tek yerde.
              </h2>
              <p className="mt-4 max-w-md text-[13px] leading-6 text-slate-300">
                Devam, sınav, ödev, veli iletişimi ve takip gerektiren
                öğrenciler doğru kişiye doğru anda ulaşır.
              </p>
              <div className="mt-12 rounded-2xl border border-white/15 bg-white/[.06] p-4">
                <div className="flex items-center justify-between border-b border-white/15 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg border border-white/15 bg-white/[.06]">
                      <LayoutDashboard className="h-3.5 w-3.5 text-sky-100" />
                    </span>
                    <span className="text-[11px] font-bold text-slate-100">
                      Bugünün eğitim özeti
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400">15 Ağustos</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/15 p-3">
                    <p className="text-[9px] text-slate-300">Bugünkü devam</p>
                    <p className="mt-1.5 text-[21px] font-extrabold">%93</p>
                    <p className="mt-1 text-[9px] text-emerald-300">
                      4 yoklama tamamlandı
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/15 p-3">
                    <p className="text-[9px] text-slate-300">Aktif öğrenci</p>
                    <p className="mt-1.5 text-[21px] font-extrabold">54</p>
                    <p className="mt-1 text-[9px] text-sky-200">
                      3 sınıfta kayıtlı
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
                  <Sparkles className="h-4 w-4 text-emerald-300" />
                  <p className="text-[10px] font-semibold text-slate-100">
                    3 eğitim otomasyonu bugün çalıştı.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

const allNav: {
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

function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "green" | "amber" | "blue" | "violet" | "rose";
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Users;
  tone?: "blue" | "green" | "amber" | "violet" | "rose";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <section className="rounded-2xl border border-slate-200/85 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,.035)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold text-slate-500">{label}</p>
        <span
          className={`grid h-8 w-8 place-items-center rounded-xl ${tones[tone]}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-4 font-display text-[24px] font-extrabold tracking-[-.055em] text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-[10px] font-medium text-slate-400">{detail}</p>
    </section>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-blue-600">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-display text-[26px] font-extrabold tracking-[-.05em] text-slate-950 sm:text-[31px]">
          {title}
        </h1>
        <p className="mt-1.5 max-w-2xl text-[12px] leading-5 text-slate-500">
          {description}
        </p>
      </div>
      {action && onAction ? (
        <button
          onClick={onAction}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-[12px] font-bold text-white shadow-[0_8px_16px_rgba(15,23,42,.12)] transition hover:bg-slate-800 active:scale-[.98]"
        >
          <Plus className="h-4 w-4" />
          {action}
        </button>
      ) : null}
    </div>
  );
}

export function EducationPlatform({
  onLogout,
  initialRole = "admin",
}: {
  onLogout: () => void;
  initialRole?: Role;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  const [active, setActive] = useState<Section>("Genel Bakış");
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [attendances, setAttendances] = useState<
    Record<string, AttendanceState>
  >({
    "stu-001": "Katıldı",
    "stu-002": "Katıldı",
    "stu-003": "Geç kaldı",
    "stu-004": "Gelmedi",
    "stu-005": "Katıldı",
  });
  const [automations, setAutomations] = useState(initialAutomations);
  const [message, setMessage] = useState("");
  const meta = roleMeta[role];
  const navItems = allNav.filter(item =>
    availableEducationSections(role).includes(item.label)
  );
  const visibleStudents = useMemo(() => {
    const roleStudents =
      role === "teacher"
        ? students.filter(
            student =>
              student.group === "YKS 12-A" || student.group === "YKS 11-C"
          )
        : role === "student" || role === "parent"
          ? students.filter(student => student.id === "stu-001")
          : students;
    return roleStudents.filter(student =>
      `${student.name} ${student.code} ${student.group}`
        .toLocaleLowerCase("tr")
        .includes(query.toLocaleLowerCase("tr"))
    );
  }, [role, query]);

  const changeRole = (nextRole: Role) => {
    setRole(nextRole);
    setActive("Genel Bakış");
    setMobileNav(false);
    toast.success(`${roleMeta[nextRole].label} görünümü açıldı`, {
      description: "Demo rol önizlemesi yerel olarak değiştirildi.",
    });
  };

  const navigate = (section: Section) => {
    setActive(section);
    setMobileNav(false);
  };

  const renderDashboard = () => {
    if (role === "teacher") return <TeacherDashboard onNavigate={navigate} />;
    if (role === "student") return <StudentDashboard onNavigate={navigate} />;
    if (role === "parent") return <ParentDashboard onNavigate={navigate} />;
    return <AdminDashboard onNavigate={navigate} />;
  };

  const renderPage = () => {
    if (active === "Genel Bakış") return renderDashboard();
    if (active === "Öğrenciler")
      return (
        <StudentsPage
          students={visibleStudents}
          query={query}
          onQuery={setQuery}
          onSelect={setSelectedStudent}
          onAdd={() =>
            toast.info("Yeni öğrenci", {
              description:
                "Demo MVP’de öğrenci kayıt formu bir sonraki iterasyonda kalıcı veri modeline bağlanacak.",
            })
          }
        />
      );
    if (active === "Sınıflar")
      return <ClassesPage role={role} onNavigate={navigate} />;
    if (active === "Ders Programı") return <SchedulePage role={role} />;
    if (active === "Yoklama")
      return (
        <AttendancePage
          role={role}
          attendances={attendances}
          setAttendances={setAttendances}
        />
      );
    if (active === "Sınavlar")
      return <AssessmentsPage role={role} onNavigate={navigate} />;
    if (active === "İletişim")
      return (
        <CommunicationsPage
          role={role}
          message={message}
          setMessage={setMessage}
        />
      );
    if (active === "Kayıt ve Ödemeler") return <PaymentsPage role={role} />;
    if (active === "Otomasyonlar")
      return (
        <AutomationsPage
          automations={automations}
          setAutomations={setAutomations}
        />
      );
    if (active === "Raporlar") return <ReportsPage role={role} />;
    return <SettingsPage />;
  };

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[258px] flex-col border-r border-slate-200 bg-white px-3 py-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="mb-7 flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 p-1.5 shadow-[0_6px_14px_rgba(15,23,42,.12)]">
                <OrbitMark inverted className="h-full w-full object-contain" />
              </span>
              <div>
                <p className="font-orbit text-[18px] font-extrabold tracking-[-.055em] text-slate-900">
                  ORBIT
                </p>
                <p className="-mt-0.5 text-[9px] font-bold uppercase tracking-[.13em] text-slate-400">
                  Education
                </p>
              </div>
            </div>
            <button
              onClick={() => setMobileNav(false)}
              aria-label="Menüyü kapat"
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/65 px-3 py-3">
            <div className="flex items-center gap-2">
              <span
                className={`grid h-8 w-8 place-items-center rounded-lg ${meta.color}`}
              >
                <meta.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-extrabold text-slate-800">
                  {meta.name}
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                  {meta.label}
                </p>
              </div>
            </div>
          </div>
          <nav className="space-y-1">
            {(["Ana çalışma alanı", "Kurum yönetimi"] as const).map(group => (
              <div
                key={group}
                className={group === "Kurum yönetimi" ? "mt-6" : ""}
              >
                <p className="mb-2 px-3 text-[9px] font-extrabold uppercase tracking-[.14em] text-slate-400">
                  {group}
                </p>
                {navItems
                  .filter(item => item.group === group)
                  .map(item => {
                    const Icon = item.icon;
                    const selected = active === item.label;
                    return (
                      <button
                        key={item.label}
                        onClick={() => navigate(item.label)}
                        className={`flex h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-[12px] font-semibold transition ${selected ? "bg-slate-900 text-white shadow-[0_7px_14px_rgba(15,23,42,.10)]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
                      >
                        <Icon
                          className={`h-4 w-4 ${selected ? "text-white" : "text-slate-400"}`}
                        />
                        <span className="flex-1">{item.label}</span>
                        {item.label === "Yoklama" &&
                        role !== "student" &&
                        role !== "parent" ? (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${selected ? "bg-white/15" : "bg-rose-50 text-rose-600"}`}
                          >
                            1
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
              </div>
            ))}
          </nav>
          <div className="mt-auto border-t border-slate-100 pt-4">
            <button
              onClick={onLogout}
              className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4 text-slate-400" />
              Çıkış Yap
            </button>
          </div>
        </aside>
        {mobileNav ? (
          <button
            aria-label="Menüyü kapat"
            onClick={() => setMobileNav(false)}
            className="fixed inset-0 z-30 bg-slate-950/20 lg:hidden"
          />
        ) : null}
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-slate-200/80 bg-[#f6f8fc]/90 px-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileNav(true)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div>
                <p className="text-[11px] font-semibold text-slate-500">
                  {meta.description}
                </p>
                <p className="text-[10px] text-slate-400">
                  Çorlu Şube · Trakya pilotu · 2026–2027 dönemi
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() =>
                  toast.info("Bildirimler", {
                    description:
                      "2 otomasyon, 1 yoklama ve 3 iletişim bildirimi var.",
                  })
                }
                className="relative grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
              </button>
              <div className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:flex">
                {(Object.keys(roleMeta) as Role[]).map(itemRole => (
                  <button
                    key={itemRole}
                    onClick={() => changeRole(itemRole)}
                    className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${role === itemRole ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                  >
                    {roleMeta[itemRole].short}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  const next =
                    role === "parent"
                      ? "admin"
                      : (Object.keys(roleMeta) as Role[])[
                          (Object.keys(roleMeta) as Role[]).indexOf(role) + 1
                        ];
                  changeRole(next);
                }}
                className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-[11px] font-extrabold text-white sm:hidden"
              >
                {meta.name
                  .split(" ")
                  .map(word => word[0])
                  .join("")}
              </button>
            </div>
          </header>
          <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {renderPage()}
          </div>
        </main>
      </div>
      {selectedStudent ? (
        <StudentDetail
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      ) : null}
    </div>
  );
}

function AdminDashboard({
  onNavigate,
}: {
  onNavigate: (section: Section) => void;
}) {
  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-[0_10px_30px_rgba(15,23,42,.04)] sm:px-7">
        <div className="absolute -right-20 -top-28 h-64 w-64 rounded-full bg-sky-100/70 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-blue-600">
              Kurum genel bakış
            </p>
            <h1 className="mt-2 font-display text-[27px] font-extrabold tracking-[-.055em] text-slate-950 sm:text-[33px]">
              Günün eğitim operasyonu kontrol altında.
            </h1>
            <p className="mt-2 max-w-2xl text-[12px] leading-5 text-slate-500">
              Çorlu Şube’de aday kayıtları, dersler, yoklamalar ve veli
              takipleri tek çalışma alanında güncel.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="green">Sistemler çalışıyor</Badge>
            <Badge tone="blue">15 Ağustos 2026</Badge>
          </div>
        </div>
      </section>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Aktif öğrenci"
          value="54"
          detail="3 sınıfta kayıtlı"
          icon={Users}
        />
        <StatCard
          label="Bugünkü devam"
          value="%93"
          detail="4 yoklama tamamlandı"
          icon={ClipboardCheck}
          tone="green"
        />
        <StatCard
          label="Takip gerekli"
          value="4"
          detail="Akademik veya devam sinyali"
          icon={CircleAlert}
          tone="amber"
        />
        <StatCard
          label="Yaklaşan tahsilat"
          value="₺86.400"
          detail="7 taksit bu hafta vade"
          icon={WalletCards}
          tone="violet"
        />
        <StatCard
          label="Çalışan otomasyon"
          value="3"
          detail="Son 24 saatte 15 işlem"
          icon={Sparkles}
          tone="blue"
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.03)]">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-[17px] font-extrabold tracking-[-.03em] text-slate-900">
                Bugünün akışı
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Ders, görüşme ve otomasyon kaynaklı kritik noktalar
              </p>
            </div>
            <button
              onClick={() => onNavigate("Ders Programı")}
              className="text-[11px] font-bold text-blue-600"
            >
              Takvimi aç
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {schedule.slice(0, 3).map(item => (
              <div
                key={item.time}
                className="flex items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-3"
              >
                <span className="w-10 text-[11px] font-extrabold tabular-nums text-slate-500">
                  {item.time}
                </span>
                <span
                  className={`grid h-9 w-9 place-items-center rounded-lg ring-1 ${item.tone}`}
                >
                  <BookOpen className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-slate-800">
                    {item.title}{" "}
                    <span className="font-medium text-slate-400">
                      · {item.group}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {item.teacher} · {item.room}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-amber-100 bg-amber-50/55 p-5">
          <div className="flex gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <CircleAlert className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[14px] font-extrabold text-amber-900">
                İnsan takibi gerekenler
              </h2>
              <p className="mt-1 text-[11px] leading-5 text-amber-800">
                Efe Demir’in son iki deneme sonucunda gerileme ve Aras Öztürk’te
                devamsızlık sinyali var.
              </p>
              <button
                onClick={() => onNavigate("Öğrenciler")}
                className="mt-3 text-[11px] font-bold text-amber-800 underline underline-offset-4"
              >
                Öğrencileri incele
              </button>
            </div>
          </div>
        </section>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.03)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-[17px] font-extrabold tracking-[-.03em] text-slate-900">
                Sınıf performansı
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Son deneme ve devam görünümü
              </p>
            </div>
            <button
              onClick={() => onNavigate("Sınıflar")}
              className="text-[11px] font-bold text-blue-600"
            >
              Tüm sınıflar
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {classes.map(group => (
              <div
                key={group.id}
                className="rounded-xl border border-slate-100 p-3.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-extrabold text-slate-800">
                      {group.name}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {group.program} · {group.studentCount} öğrenci
                    </p>
                  </div>
                  <Badge tone={group.attendance < 90 ? "amber" : "green"}>
                    Devam %{group.attendance}
                  </Badge>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <span
                    style={{ width: `${group.attendance}%` }}
                    className={`block h-full rounded-full ${group.attendance < 90 ? "bg-amber-400" : "bg-emerald-500"}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.03)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-[17px] font-extrabold tracking-[-.03em] text-slate-900">
                Otomasyon merkezi
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Bugün çalışan eğitim akışları
              </p>
            </div>
            <button
              onClick={() => onNavigate("Otomasyonlar")}
              className="text-[11px] font-bold text-blue-600"
            >
              Yönet
            </button>
          </div>
          <div className="mt-4 space-y-3">
            <AutomationMini
              title="Aday kayıt takibi"
              detail="4 aday için sonraki adım açıldı"
              icon={UserRoundCheck}
            />
            <AutomationMini
              title="Devamsızlık bildirimi"
              detail="3 veli bildirimi taslağı hazırlandı"
              icon={ClipboardCheck}
            />
            <AutomationMini
              title="Deneme sonucu takibi"
              detail="42 öğrenci gelişim özeti aldı"
              icon={BarChart3}
            />
            <AutomationMini
              title="Veli iletişim merkezi"
              detail="2 görüşme önerisi bekliyor"
              icon={MessageSquare}
            />
          </div>
        </section>
      </div>
    </>
  );
}

function TeacherDashboard({
  onNavigate,
}: {
  onNavigate: (section: Section) => void;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Öğretmen çalışma alanı"
        title="Bugün sınıflarınızla ilerleyin."
        description="Ders programı, yoklama ve takip gerektiren öğrenciler burada."
        action="Yoklama al"
        onAction={() => onNavigate("Yoklama")}
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Bugünkü ders"
          value="3"
          detail="İlk ders 09:00"
          icon={CalendarDays}
        />
        <StatCard
          label="Sınıf ortalaması"
          value="76"
          detail="Son TYT denemesi"
          icon={BarChart3}
          tone="violet"
        />
        <StatCard
          label="Teslim bekleyen"
          value="6"
          detail="Problem seti · bugün"
          icon={BookOpen}
          tone="amber"
        />
        <StatCard
          label="Takip önerisi"
          value="2"
          detail="Rehberlik görüşmesi"
          icon={CircleAlert}
          tone="rose"
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-display text-[17px] font-extrabold text-slate-900">
            Bugünün dersleri
          </h2>
          <div className="mt-4 space-y-3">
            {schedule
              .filter(
                item =>
                  item.teacher === "Merve Karaca" ||
                  item.teacher === "Seda Kılıç"
              )
              .map(item => (
                <div
                  key={item.time}
                  className="flex gap-3 rounded-xl border border-slate-100 p-3.5"
                >
                  <span className="text-[12px] font-extrabold text-slate-600">
                    {item.time}
                  </span>
                  <div>
                    <p className="text-[12px] font-bold text-slate-800">
                      {item.title} · {item.group}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {item.room} · Yoklama ders başlangıcında açılacak
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </section>
        <section className="rounded-2xl border border-amber-100 bg-amber-50/55 p-5">
          <h2 className="text-[15px] font-extrabold text-amber-900">
            Takip önerileri
          </h2>
          <div className="mt-3 space-y-3 text-[11px] text-amber-900">
            <p>
              <strong>Efe Demir:</strong> Matematik netlerinde iki denemedir
              düşüş var.
            </p>
            <p>
              <strong>Aras Öztürk:</strong> Bu hafta bir devamsızlık kaydı
              oluştu.
            </p>
          </div>
          <button
            onClick={() => onNavigate("Öğrenciler")}
            className="mt-4 text-[11px] font-bold text-amber-800 underline underline-offset-4"
          >
            Öğrenci profillerini aç
          </button>
        </section>
      </div>
    </>
  );
}

function StudentDashboard({
  onNavigate,
}: {
  onNavigate: (section: Section) => void;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Kişisel çalışma alanı"
        title="Merhaba Zeynep, bugün planın hazır."
        description="Derslerini, ödevlerini ve sınav hedeflerini tek bakışta takip et."
        action="Ders programım"
        onAction={() => onNavigate("Ders Programı")}
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Bugünkü ders"
          value="2"
          detail="İlk ders 09:00"
          icon={CalendarDays}
        />
        <StatCard
          label="Tamamlanan ödev"
          value="8/9"
          detail="Bu hafta"
          icon={Check}
          tone="green"
        />
        <StatCard
          label="Son deneme"
          value="84"
          detail="+6 puan gelişim"
          icon={BarChart3}
          tone="violet"
        />
        <StatCard
          label="Devam"
          value="%96"
          detail="Bu dönem"
          icon={ClipboardCheck}
          tone="blue"
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-display text-[17px] font-extrabold text-slate-900">
            Sıradaki adımlar
          </h2>
          <div className="mt-4 space-y-3">
            <ActionLine
              title="TYT Matematik"
              detail="09:00 · Derslik 204"
              icon={BookOpen}
              tone="blue"
            />
            <ActionLine
              title="Problem Seti 04"
              detail="Teslim için 1 gün kaldı"
              icon={ClipboardCheck}
              tone="amber"
            />
            <ActionLine
              title="Deneme sonucu"
              detail="Sözel mantıkta gelişim notunu incele"
              icon={BarChart3}
              tone="violet"
            />
          </div>
        </section>
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-emerald-700">
            Bu hafta
          </p>
          <h2 className="mt-2 text-[18px] font-extrabold tracking-[-.04em] text-emerald-950">
            Hedefine sakin ve düzenli ilerliyorsun.
          </h2>
          <p className="mt-2 text-[11px] leading-5 text-emerald-800">
            Son denemede problem çözme alanında 6 puan gelişim var. Bir sonraki
            odak alanın geometri.
          </p>
        </section>
      </div>
    </>
  );
}

function ParentDashboard({
  onNavigate,
}: {
  onNavigate: (section: Section) => void;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Veli takip alanı"
        title="Zeynep’in haftası dengede ilerliyor."
        description="Devam, ders programı, akademik gelişim ve ödeme bilgilerini sade biçimde takip edin."
        action="Öğrenci programı"
        onAction={() => onNavigate("Ders Programı")}
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Devam"
          value="%96"
          detail="Bu dönem"
          icon={ClipboardCheck}
          tone="green"
        />
        <StatCard
          label="Son deneme"
          value="84"
          detail="+6 puan gelişim"
          icon={BarChart3}
          tone="violet"
        />
        <StatCard
          label="Yaklaşan ders"
          value="09:00"
          detail="TYT Matematik"
          icon={CalendarDays}
        />
        <StatCard
          label="Ödeme planı"
          value="Güncel"
          detail="Sonraki taksit 5 Eylül"
          icon={WalletCards}
          tone="green"
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-display text-[17px] font-extrabold text-slate-900">
            Son gelişim özeti
          </h2>
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-extrabold text-slate-800">
                  TYT Deneme 06
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  14 Ağustos 2026 · Sınıf ortalamasının üzerinde
                </p>
              </div>
              <Badge tone="green">84 puan</Badge>
            </div>
            <p className="mt-4 text-[11px] leading-5 text-slate-600">
              Zeynep’in problem çözme performansında düzenli gelişim görülüyor.
              Geometri alanında öğretmen tarafından ek çalışma önerildi.
            </p>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-display text-[17px] font-extrabold text-slate-900">
            İletişim ve duyurular
          </h2>
          <div className="mt-4 space-y-3">
            <ActionLine
              title="Veli görüşmesi"
              detail="20 Ağustos · 15:30 önerildi"
              icon={MessageSquare}
              tone="violet"
            />
            <ActionLine
              title="Deneme analiz dosyası"
              detail="İncelemeye hazır"
              icon={FileText}
              tone="blue"
            />
          </div>
          <button
            onClick={() => onNavigate("İletişim")}
            className="mt-4 text-[11px] font-bold text-blue-600"
          >
            Tüm mesajları aç
          </button>
        </section>
      </div>
    </>
  );
}

function StudentsPage({
  students: visibleStudents,
  query,
  onQuery,
  onSelect,
  onAdd,
}: {
  students: Student[];
  query: string;
  onQuery: (value: string) => void;
  onSelect: (student: Student) => void;
  onAdd: () => void;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Öğrenci operasyonları"
        title="Öğrenciler"
        description="Akademik gelişim, devam ve ödeme sinyallerini öğrenci bazında takip edin."
        action="Yeni öğrenci"
        onAction={onAdd}
      />
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={event => onQuery(event.target.value)}
            placeholder="Öğrenci adı, kodu veya sınıf ara..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-[12px] outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
          />
        </div>
      </div>
      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,.025)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-[.08em] text-slate-400">
                <th className="px-5 py-3.5">Öğrenci</th>
                <th className="px-5 py-3.5">Sınıf</th>
                <th className="px-5 py-3.5">Devam</th>
                <th className="px-5 py-3.5">Son sınav</th>
                <th className="px-5 py-3.5">Takip</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {visibleStudents.map(student => (
                <tr
                  key={student.id}
                  className="border-b border-slate-100 text-[12px] last:border-0 hover:bg-slate-50/70"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-[11px] font-extrabold text-blue-700">
                        {student.name
                          .split(" ")
                          .map(part => part[0])
                          .join("")}
                      </span>
                      <div>
                        <p className="font-extrabold text-slate-800">
                          {student.name}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {student.code} · Veli: {student.parent}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-600">
                    {student.group}
                  </td>
                  <td className="px-5 py-4">
                    <Badge tone={student.attendance < 90 ? "amber" : "green"}>
                      %{student.attendance}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 font-extrabold text-slate-800">
                    {student.score} puan
                  </td>
                  <td className="px-5 py-4">
                    <Badge
                      tone={
                        student.risk === "Takip gerekli" ? "amber" : "green"
                      }
                    >
                      {student.risk}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => onSelect(student)}
                      className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-blue-600 transition hover:bg-blue-50"
                    >
                      Profili aç
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function ClassesPage({
  role,
  onNavigate,
}: {
  role: Role;
  onNavigate: (section: Section) => void;
}) {
  const shown =
    role === "teacher"
      ? classes.filter(group => group.mentor === "Merve Karaca")
      : classes;
  return (
    <>
      <PageHeader
        eyebrow="Akademik organizasyon"
        title="Sınıflar ve gruplar"
        description="Program, öğretmen, öğrenci sayısı ve devam görünümünü birlikte izleyin."
        action={role === "admin" ? "Yeni sınıf" : undefined}
        onAction={
          role === "admin"
            ? () =>
                toast.info("Yeni sınıf", {
                  description:
                    "Demo MVP’de sınıf oluşturma formu bir sonraki kalıcı veri fazına hazırlandı.",
                })
            : undefined
        }
      />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map(group => (
          <article
            key={group.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.025)]"
          >
            <div className="flex items-start justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <School className="h-5 w-5" />
              </span>
              <Badge tone={group.attendance < 90 ? "amber" : "green"}>
                Devam %{group.attendance}
              </Badge>
            </div>
            <h2 className="mt-5 font-display text-[18px] font-extrabold tracking-[-.035em] text-slate-900">
              {group.name}
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">{group.program}</p>
            <div className="mt-5 space-y-2.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Mentor</span>
                <span className="font-bold text-slate-700">{group.mentor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Öğrenci</span>
                <span className="font-bold text-slate-700">
                  {group.studentCount} kayıt
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sıradaki ders</span>
                <span className="font-bold text-slate-700">
                  {group.nextLesson}
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigate("Öğrenciler")}
              className="mt-5 flex items-center gap-1.5 text-[11px] font-bold text-blue-600"
            >
              Öğrencileri görüntüle <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </article>
        ))}
      </div>
    </>
  );
}

function SchedulePage({ role }: { role: Role }) {
  const show =
    role === "student" || role === "parent"
      ? schedule.filter(
          item => item.group === "YKS 12-A" || item.group === "Zeynep Kaya"
        )
      : role === "teacher"
        ? schedule.filter(
            item =>
              item.teacher === "Merve Karaca" || item.teacher === "Seda Kılıç"
          )
        : schedule;
  return (
    <>
      <PageHeader
        eyebrow="Haftalık plan"
        title={
          role === "student"
            ? "Ders programım"
            : role === "parent"
              ? "Zeynep’in ders programı"
              : "Ders programı"
        }
        description="Bugün için ders, etüt, rehberlik ve sınav planını takip edin."
      />
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
          {["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"].map(
            (day, index) => (
              <button
                key={day}
                className={`rounded-lg px-3 py-2 text-[11px] font-bold ${index === 0 ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}
              >
                {day}
                {index === 0 ? " · Bugün" : ""}
              </button>
            )
          )}
        </div>
        <div className="mt-5 space-y-3">
          {show.map(item => (
            <div
              key={`${item.time}-${item.title}`}
              className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center"
            >
              <span className="w-12 text-[12px] font-extrabold tabular-nums text-slate-500">
                {item.time}
              </span>
              <span
                className={`grid h-9 w-9 place-items-center rounded-lg ring-1 ${item.tone}`}
              >
                <BookOpen className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-extrabold text-slate-800">
                  {item.title}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {item.group} · {item.teacher} · {item.room}
                </p>
              </div>
              <Badge tone="slate">50 dk</Badge>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function AttendancePage({
  role,
  attendances,
  setAttendances,
}: {
  role: Role;
  attendances: Record<string, AttendanceState>;
  setAttendances: React.Dispatch<
    React.SetStateAction<Record<string, AttendanceState>>
  >;
}) {
  const [saved, setSaved] = useState(false);
  const states: AttendanceState[] = [
    "Katıldı",
    "Geç kaldı",
    "Gelmedi",
    "İzinli",
  ];
  const selected =
    role === "teacher"
      ? students.filter(
          student =>
            student.group === "YKS 12-A" || student.group === "YKS 11-C"
        )
      : students;
  const tone = (status: AttendanceState) =>
    status === "Katıldı"
      ? "green"
      : status === "Geç kaldı"
        ? "amber"
        : status === "Gelmedi"
          ? "rose"
          : "blue";
  return (
    <>
      <PageHeader
        eyebrow="Ders operasyonu"
        title="Yoklama"
        description="TYT Matematik · YKS 12-A · 15 Ağustos, 09:00"
        action={saved ? "Kaydedildi" : "Yoklamayı kaydet"}
        onAction={() => {
          setSaved(true);
          toast.success("Yoklama kaydedildi", {
            description:
              "Devamsızlık otomasyonu çalışmak üzere kuyruğa alındı.",
          });
        }}
      />
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,.025)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[12px] font-extrabold text-slate-800">
              YKS 12-A · TYT Matematik
            </p>
            <p className="mt-1 text-[10px] text-slate-500">
              18 kayıtlı öğrenci · yoklama durumunu ders bitmeden doğrulayın
            </p>
          </div>
          <Badge tone={saved ? "green" : "amber"}>
            {saved ? "Kaydedildi" : "Taslak"}
          </Badge>
        </div>
        <div className="divide-y divide-slate-100">
          {selected.map(student => (
            <div
              key={student.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-[220px] items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-[11px] font-extrabold text-slate-600">
                  {student.name
                    .split(" ")
                    .map(word => word[0])
                    .join("")}
                </span>
                <div>
                  <p className="text-[12px] font-extrabold text-slate-800">
                    {student.name}
                  </p>
                  <p className="text-[10px] text-slate-400">{student.code}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {states.map(state => (
                  <button
                    key={state}
                    onClick={() => {
                      setSaved(false);
                      setAttendances(current => ({
                        ...current,
                        [student.id]: state,
                      }));
                    }}
                    className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${attendances[student.id] === state ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
                  >
                    {state}
                  </button>
                ))}
              </div>
              <div className="sm:ml-auto">
                <Badge tone={tone(attendances[student.id])}>
                  {attendances[student.id]}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function AssessmentsPage({
  role,
  onNavigate,
}: {
  role: Role;
  onNavigate: (section: Section) => void;
}) {
  const isPersonal = role === "student" || role === "parent";
  return (
    <>
      <PageHeader
        eyebrow="Ölçme ve değerlendirme"
        title={isPersonal ? "Akademik gelişim" : "Sınavlar ve başarı"}
        description={
          isPersonal
            ? "Son denemeler ve konu bazlı gelişim sinyalleri."
            : "Deneme sonuçları, sınıf görünümü ve takip önerileri."
        }
        action={
          role === "admin" || role === "teacher" ? "Sonuç gir" : undefined
        }
        onAction={
          role === "admin" || role === "teacher"
            ? () =>
                toast.info("Sonuç girişi", {
                  description:
                    "Demo MVP’de sonuç girişi ekranı değerlendirme veri modelinin sonraki adımıdır.",
                })
            : undefined
        }
      />
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-[17px] font-extrabold text-slate-900">
                TYT Deneme 06
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                14 Ağustos 2026 · {isPersonal ? "Zeynep Kaya" : "54 öğrenci"}
              </p>
            </div>
            <Badge tone="green">Yayınlandı</Badge>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatCard
              label={isPersonal ? "Puan" : "Kurum ortalaması"}
              value={isPersonal ? "84" : "72"}
              detail="100 üzerinden"
              icon={BarChart3}
              tone="violet"
            />
            <StatCard
              label="Gelişim"
              value="+6"
              detail="Önceki denemeye göre"
              icon={Activity}
              tone="green"
            />
            <StatCard
              label="Odak alanı"
              value="Geometri"
              detail="Ek çalışma önerildi"
              icon={BookOpen}
              tone="amber"
            />
          </div>
          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <p className="text-[11px] font-extrabold text-slate-700">
              Konu bazlı görünüm
            </p>
            <div className="mt-4 space-y-3">
              {[
                { label: "Matematik", value: 82, color: "bg-blue-500" },
                { label: "Türkçe", value: 88, color: "bg-emerald-500" },
                { label: "Fen", value: 71, color: "bg-violet-500" },
                { label: "Geometri", value: 62, color: "bg-amber-400" },
              ].map(item => (
                <div key={item.label}>
                  <div className="mb-1 flex justify-between text-[10px] font-bold">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="text-slate-400">{item.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white">
                    <span
                      style={{ width: `${item.value}%` }}
                      className={`block h-full rounded-full ${item.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="rounded-2xl border border-amber-100 bg-amber-50/55 p-5">
          <h2 className="text-[15px] font-extrabold text-amber-900">
            Takip önerisi
          </h2>
          <p className="mt-2 text-[11px] leading-5 text-amber-800">
            {isPersonal
              ? "Geometri konularında kısa tekrar ve soru çözüm etüdü öneriliyor."
              : "YKS 12-B sınıfında geometri ortalaması kurum eşiğinin altında. Rehberlik ve etüt planı oluşturabilirsiniz."}
          </p>
          {!isPersonal && (
            <button
              onClick={() => onNavigate("İletişim")}
              className="mt-4 text-[11px] font-bold text-amber-800 underline underline-offset-4"
            >
              Veli bilgilendirmesi oluştur
            </button>
          )}
        </section>
      </div>
    </>
  );
}

function CommunicationsPage({
  role,
  message,
  setMessage,
}: {
  role: Role;
  message: string;
  setMessage: (value: string) => void;
}) {
  const audience =
    role === "teacher"
      ? "YKS 12-A velileri"
      : role === "parent"
        ? "Merve Karaca"
        : role === "student"
          ? "Merve Karaca"
          : "Çorlu Şube velileri";
  const submit = () => {
    if (!message.trim()) return toast.error("Mesajınızı yazın");
    toast.success("Mesaj taslağı gönderildi", {
      description: "Demo ortamında iletişim aktivitesi kaydedildi.",
    });
    setMessage("");
  };
  return (
    <>
      <PageHeader
        eyebrow="İletişim merkezi"
        title={
          role === "student"
            ? "Mesajlarım"
            : role === "parent"
              ? "Öğretmen iletişimi"
              : "Duyurular ve iletişim"
        }
        description="Doğru kişiyle, doğru öğrenci veya sınıf bağlamında iletişim kurun."
      />
      <div className="mt-6 grid gap-6 xl:grid-cols-[.82fr_1.18fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
          <p className="px-2 text-[10px] font-extrabold uppercase tracking-[.13em] text-slate-400">
            Son iletişimler
          </p>
          <div className="mt-3 space-y-1">
            <MessageListItem
              name="Merve Karaca"
              detail="Deneme analiz dosyası paylaşıldı"
              time="10:24"
              selected
            />
            <MessageListItem
              name="Çorlu Şube"
              detail="20 Ağustos veli görüşmesi"
              time="Dün"
            />
            <MessageListItem
              name="ORBIT Otomasyon"
              detail="Devamsızlık bildirimi hazırlandı"
              time="Dün"
            />
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,.025)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-[12px] font-extrabold text-slate-800">
              {audience}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Bağlam: Zeynep Kaya · TYT Deneme 06
            </p>
          </div>
          <div className="space-y-4 px-5 py-5">
            <div className="max-w-[78%] rounded-2xl rounded-tl-sm bg-slate-100 px-3.5 py-3 text-[11px] leading-5 text-slate-700">
              Merhaba, Zeynep’in son deneme sonucunu ve gelecek haftaki çalışma
              önerisini paylaştım.
            </div>
            <div className="ml-auto max-w-[78%] rounded-2xl rounded-tr-sm bg-blue-600 px-3.5 py-3 text-[11px] leading-5 text-white">
              Teşekkür ederim. Geometri çalışması için ek kaynak önerir misiniz?
            </div>
          </div>
          <div className="border-t border-slate-100 p-4">
            <textarea
              value={message}
              onChange={event => setMessage(event.target.value)}
              placeholder="Mesajınızı yazın..."
              className="min-h-[88px] w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-[12px] outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={submit}
                className="h-9 rounded-lg bg-slate-900 px-3.5 text-[11px] font-bold text-white"
              >
                Mesajı gönder
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function PaymentsPage({ role }: { role: Role }) {
  const items = [
    {
      student: "Zeynep Kaya",
      plan: "YKS Sayısal Paket",
      due: "05 Eylül 2026",
      amount: "₺7.200",
      status: "Güncel",
    },
    {
      student: "Derin Yıldız",
      plan: "YKS Eşit Ağırlık Paket",
      due: "28 Ağustos 2026",
      amount: "₺6.800",
      status: "Hatırlatma gerekli",
    },
    {
      student: "Aras Öztürk",
      plan: "YKS Eşit Ağırlık Paket",
      due: "18 Ağustos 2026",
      amount: "₺6.800",
      status: "Gecikme riski",
    },
  ];
  const visible =
    role === "parent"
      ? items.filter(item => item.student === "Zeynep Kaya")
      : items;
  return (
    <>
      <PageHeader
        eyebrow="Kayıt operasyonu"
        title={role === "parent" ? "Kayıt ve ödeme planı" : "Kayıt ve ödemeler"}
        description={
          role === "parent"
            ? "Zeynep Kaya’nın kayıt paketi ve yaklaşan taksitleri."
            : "Kayıt paketleri, taksit planları ve takip gerektiren ödemeler."
        }
        action={role === "admin" ? "Yeni kayıt" : undefined}
        onAction={
          role === "admin"
            ? () =>
                toast.info("Yeni kayıt", {
                  description:
                    "Demo MVP’de kayıt paketleri ve taksit planı yerel veri ile sonraki iterasyonda oluşturulabilir.",
                })
            : undefined
        }
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Bu ay tahsilat"
          value="₺248.600"
          detail="Planlanan tahsilatın %82’si"
          icon={WalletCards}
          tone="green"
        />
        <StatCard
          label="Yaklaşan taksit"
          value="7"
          detail="Önümüzdeki 7 gün"
          icon={Clock3}
          tone="amber"
        />
        <StatCard
          label="Takip gereken"
          value="2"
          detail="İletişim önerisi oluşturuldu"
          icon={CircleAlert}
          tone="rose"
        />
      </div>
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,.025)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-[.08em] text-slate-400">
                <th className="px-5 py-3.5">Öğrenci</th>
                <th className="px-5 py-3.5">Kayıt paketi</th>
                <th className="px-5 py-3.5">Sonraki taksit</th>
                <th className="px-5 py-3.5">Tutar</th>
                <th className="px-5 py-3.5">Durum</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {visible.map(item => (
                <tr
                  key={item.student}
                  className="border-b border-slate-100 text-[12px] last:border-0"
                >
                  <td className="px-5 py-4 font-extrabold text-slate-800">
                    {item.student}
                  </td>
                  <td className="px-5 py-4 text-slate-600">{item.plan}</td>
                  <td className="px-5 py-4 font-semibold text-slate-600">
                    {item.due}
                  </td>
                  <td className="px-5 py-4 font-extrabold text-slate-800">
                    {item.amount}
                  </td>
                  <td className="px-5 py-4">
                    <Badge
                      tone={
                        item.status === "Güncel"
                          ? "green"
                          : item.status === "Gecikme riski"
                            ? "rose"
                            : "amber"
                      }
                    >
                      {item.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {role === "admin" && item.status !== "Güncel" ? (
                      <button
                        onClick={() =>
                          toast.success("Hatırlatma hazırlandı", {
                            description: `${item.student} velisi için ödeme hatırlatması iletişim kuyruğuna eklendi.`,
                          })
                        }
                        className="text-[11px] font-bold text-blue-600"
                      >
                        Hatırlat
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-[10px] leading-5 text-blue-800">
        <strong>Not:</strong> Bu alan eğitim kurumu tahsilat operasyonunu takip
        eder; resmi muhasebe veya e-Fatura kaydı oluşturmaz.
      </p>
    </>
  );
}

function AutomationsPage({
  automations,
  setAutomations,
}: {
  automations: Automation[];
  setAutomations: React.Dispatch<React.SetStateAction<Automation[]>>;
}) {
  const toggle = (id: string) =>
    setAutomations(current =>
      current.map(item =>
        item.id === id ? { ...item, active: !item.active } : item
      )
    );
  return (
    <>
      <PageHeader
        eyebrow="Eğitim otomasyonları"
        title="Tekrarlayan takipleri sisteme bırakın."
        description="ORBIT, eğitim ekibinin yerini almaz; doğru kişiye doğru zamanda takip ve iletişim önerisi sunar."
        action="Yeni otomasyon"
        onAction={() =>
          toast.info("Otomasyon kataloğu", {
            description:
              "Yeni otomasyon şablonu ekleme, gerçek n8n bağlantısı fazında etkinleşecek.",
          })
        }
      />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {automations.map(automation => (
          <article
            key={automation.id}
            className="flex min-h-[255px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.025)]"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
                <Sparkles className="h-5 w-5" />
              </span>
              <button
                onClick={() => {
                  toggle(automation.id);
                  toast.success(
                    automation.active
                      ? "Otomasyon duraklatıldı"
                      : "Otomasyon etkinleştirildi",
                    { description: automation.title }
                  );
                }}
                className={`relative h-6 w-11 rounded-full transition ${automation.active ? "bg-emerald-500" : "bg-slate-200"}`}
                aria-label={`${automation.title} durumunu değiştir`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${automation.active ? "left-6" : "left-1"}`}
                />
              </button>
            </div>
            <div className="mt-5">
              <Badge tone="violet">{automation.category}</Badge>
              <h2 className="mt-3 text-[15px] font-extrabold tracking-[-.025em] text-slate-900">
                {automation.title}
              </h2>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                {automation.description}
              </p>
            </div>
            <div className="mt-auto border-t border-slate-100 pt-3">
              <p className="text-[10px] font-semibold text-slate-500">
                Tetikleyici:{" "}
                <span className="font-medium text-slate-400">
                  {automation.trigger}
                </span>
              </p>
              <p className="mt-1 text-[10px] font-bold text-emerald-700">
                {automation.impact}
              </p>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function ReportsPage({ role }: { role: Role }) {
  return (
    <>
      <PageHeader
        eyebrow="Kurum içgörüleri"
        title={role === "teacher" ? "Sınıf raporları" : "Kurum raporları"}
        description="Akademik, devam ve operasyon görünümünü karar vermeyi kolaylaştıracak şekilde izleyin."
      />
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <ReportCard
          title="Devam görünümü"
          subtitle="Son 4 hafta"
          values={[92, 94, 90, 93]}
          labels={["1. hf", "2. hf", "3. hf", "Bu hf"]}
          color="bg-emerald-500"
        />
        <ReportCard
          title="Deneme gelişimi"
          subtitle="TYT kurum ortalaması"
          values={[68, 71, 69, 72]}
          labels={["D-03", "D-04", "D-05", "D-06"]}
          color="bg-violet-500"
        />
        <ReportCard
          title="Ödev tamamlama"
          subtitle="Aktif gruplar"
          values={[78, 82, 86, 84]}
          labels={["May", "Haz", "Tem", "Ağu"]}
          color="bg-blue-500"
        />
      </div>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
        <h2 className="font-display text-[17px] font-extrabold text-slate-900">
          Raporu aksiyona dönüştür
        </h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Raporlar yalnızca izleme için değil, eğitim ekibinin bir sonraki
          adımını netleştirmek için kullanılmalıdır.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <ActionLine
            title="YKS 12-B"
            detail="Geometri etüdü önerildi"
            icon={BookOpen}
            tone="amber"
          />
          <ActionLine
            title="Devam sinyali"
            detail="2 öğrenci için veli bildirimi"
            icon={ClipboardCheck}
            tone="rose"
          />
          <ActionLine
            title="Kayıt dönüşümü"
            detail="4 aday için takip görevi"
            icon={UserRoundCheck}
            tone="blue"
          />
        </div>
      </section>
    </>
  );
}

function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Kurum ayarları"
        title="Kurum ve erişim ayarları"
        description="Kurum profili, şube yapısı ve kullanıcı yetkileri ilerleyen fazlarda kalıcı olarak burada yönetilecek."
      />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <School className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-[14px] font-extrabold text-slate-900">
                Kurum profili
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                ORBIT Eğitim Kurumları · Çorlu Şube
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              toast.info("Kurum ayarları", {
                description:
                  "Kalıcı kurum ayarları veri tabanı fazında etkinleştirilecek.",
              })
            }
            className="mt-5 text-[11px] font-bold text-blue-600"
          >
            Düzenlemeyi planla
          </button>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-[14px] font-extrabold text-slate-900">
                Roller ve erişim
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Yönetici, öğretmen, öğrenci ve veli görünümü demo olarak etkin.
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              toast.info("Rol yönetimi", {
                description:
                  "Kurum, şube ve sınıf bazlı erişim kuralı MVP veri modelinde tanımlanmıştır.",
              })
            }
            className="mt-5 text-[11px] font-bold text-blue-600"
          >
            Yetkileri incele
          </button>
        </section>
      </div>
    </>
  );
}

function StudentDetail({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${student.name} öğrenci profili`}
    >
      <button
        onClick={onClose}
        aria-label="Profili kapat"
        className="absolute inset-0"
      />
      <aside className="relative h-full w-full max-w-[480px] overflow-y-auto bg-white p-6 shadow-2xl sm:rounded-2xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3 pr-10">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-[14px] font-extrabold text-blue-700">
            {student.name
              .split(" ")
              .map(word => word[0])
              .join("")}
          </span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-blue-600">
              Öğrenci profili
            </p>
            <h2 className="mt-1 font-display text-[22px] font-extrabold tracking-[-.04em] text-slate-900">
              {student.name}
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              {student.group} · {student.code}
            </p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <StatCard
            label="Devam"
            value={`%${student.attendance}`}
            detail="Bu dönem"
            icon={ClipboardCheck}
            tone={student.attendance < 90 ? "amber" : "green"}
          />
          <StatCard
            label="Son sınav"
            value={String(student.score)}
            detail="TYT Deneme 06"
            icon={BarChart3}
            tone="violet"
          />
        </div>
        <section className="mt-6 rounded-xl border border-slate-200 p-4">
          <h3 className="text-[12px] font-extrabold text-slate-800">
            Takip özeti
          </h3>
          <div className="mt-3 space-y-3 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Veli</span>
              <span className="font-bold text-slate-700">{student.parent}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Ödev tamamlama</span>
              <span className="font-bold text-slate-700">
                {student.homework}/9
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Ödeme durumu</span>
              <Badge tone={student.payment === "Güncel" ? "green" : "amber"}>
                {student.payment}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Akademik sinyal</span>
              <Badge tone={student.risk === "Dengeli" ? "green" : "amber"}>
                {student.risk}
              </Badge>
            </div>
          </div>
        </section>
        <section className="mt-4 rounded-xl border border-blue-100 bg-blue-50/55 p-4">
          <p className="text-[11px] font-extrabold text-blue-900">Son not</p>
          <p className="mt-1 text-[11px] leading-5 text-blue-800">
            Geometri konusunda düzenli tekrar önerildi. Veli görüşmesi için 20
            Ağustos tarihinde uygun slot bulundu.
          </p>
          <button
            onClick={() =>
              toast.success("Veli görüşmesi önerildi", {
                description: `${student.parent} için iletişim kuyruğuna taslak eklendi.`,
              })
            }
            className="mt-3 text-[11px] font-bold text-blue-700 underline underline-offset-4"
          >
            Veli görüşmesi öner
          </button>
        </section>
      </aside>
    </div>
  );
}

function AutomationMini({
  title,
  detail,
  icon: Icon,
}: {
  title: string;
  detail: string;
  icon: typeof Sparkles;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-50 text-violet-600">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-extrabold text-slate-700">{title}</p>
        <p className="mt-0.5 truncate text-[10px] text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
function ActionLine({
  title,
  detail,
  icon: Icon,
  tone,
}: {
  title: string;
  detail: string;
  icon: typeof BookOpen;
  tone: "blue" | "amber" | "violet" | "green" | "rose";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    green: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
      <span
        className={`grid h-8 w-8 place-items-center rounded-lg ${tones[tone]}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-extrabold text-slate-700">{title}</p>
        <p className="mt-0.5 text-[10px] text-slate-500">{detail}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </div>
  );
}
function MessageListItem({
  name,
  detail,
  time,
  selected = false,
}: {
  name: string;
  detail: string;
  time: string;
  selected?: boolean;
}) {
  return (
    <button
      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${selected ? "bg-blue-50" : "hover:bg-slate-50"}`}
    >
      <span
        className={`grid h-9 w-9 place-items-center rounded-full text-[10px] font-extrabold ${selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
      >
        {name
          .split(" ")
          .map(word => word[0])
          .join("")}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex justify-between gap-2">
          <strong className="truncate text-[11px] text-slate-800">
            {name}
          </strong>
          <small className="text-[9px] text-slate-400">{time}</small>
        </span>
        <span className="mt-0.5 block truncate text-[10px] text-slate-500">
          {detail}
        </span>
      </span>
    </button>
  );
}
function ReportCard({
  title,
  subtitle,
  values,
  labels,
  color,
}: {
  title: string;
  subtitle: string;
  values: number[];
  labels: string[];
  color: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
      <h2 className="font-display text-[16px] font-extrabold text-slate-900">
        {title}
      </h2>
      <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
      <div className="mt-6 flex h-36 items-end justify-between gap-3">
        {values.map((value, index) => (
          <div
            key={labels[index]}
            className="flex h-full flex-1 flex-col justify-end"
          >
            <span
              style={{ height: `${value}%` }}
              className={`rounded-t-md ${color}`}
            />
            <span className="mt-2 text-center text-[9px] font-bold text-slate-400">
              {labels[index]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
