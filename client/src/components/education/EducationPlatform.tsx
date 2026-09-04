import { useEffect, useMemo, useState } from "react";
import { OrbitMark } from "@/components/OrbitMark";
import { Bell, LogOut, Menu, PanelLeft, ShieldCheck, X } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { clearDemoData, readDemoData, writeDemoData } from "@/lib/demoStorage";
import { isDemoMode } from "@/auth/runtime";
import { availableEducationSections } from "@/components/educationAccess";
import { filterStudentsForRole } from "./scopeFilters";
import { AdminDashboard } from "./dashboards/AdminDashboard";
import { ParentDashboard } from "./dashboards/ParentDashboard";
import { StudentDashboard } from "./dashboards/StudentDashboard";
import { TeacherDashboard } from "./dashboards/TeacherDashboard";
import {
  dayPlanTasksByRole,
  initialAttendances,
  initialAutomations,
  initialHomework,
  students,
} from "./educationData";
import { allNav } from "./navigation";
import { roleMeta } from "./roleMeta";
import { AssessmentsPage } from "./pages/AssessmentsPage";
import { AttendancePage } from "./pages/AttendancePage";
import { AutomationsPage } from "./pages/AutomationsPage";
import { ClassesPage } from "./pages/ClassesPage";
import { CommunicationsPage } from "./pages/CommunicationsPage";
import { DayPlanPage } from "./pages/DayPlanPage";
import { HomeworkPage } from "./pages/HomeworkPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SchedulePage } from "./pages/SchedulePage";
import { SettingsPage } from "./pages/SettingsPage";
import { StudentsPage } from "./pages/StudentsPage";
import { StudentDetail } from "./StudentDetail";
import type {
  AttendanceState,
  DayPlanRole,
  DayPlanTask,
  Homework,
  Role,
  Section,
  Student,
} from "./types";

// Başlık grubun İÇERİĞİNİ adlandırır. Tek bir koşul yetmiyor çünkü aynı grup
// her rolde farklı maddeler taşıyor; `role !== "admin"` fırçası öğretmende
// Raporlar'ı, velide Ödemeler'i "hesap ayarı" gibi göstermişti (#147).
//
// Açık eşleme bilinçli: bir rolün madde listesi değişirse başlığının da
// gözden geçirilmesi gerekir ve bu, buraya bakmayı zorunlu kılar.
const secondaryGroupTitle: Record<Role, string> = {
  admin: "Kurum yönetimi",
  teacher: "Raporlar ve Ayarlar",
  student: "Hesap ve Ayarlar",
  parent: "Ödemeler ve Ayarlar",
};

export function EducationPlatform({
  onLogout,
  initialRole = "admin",
  displayName,
  organizationName,
  branchName,
  canSwitchRole = true,
  onRoleChange,
  canAccessPlatform = false,
}: {
  onLogout: () => void | Promise<void>;
  initialRole?: Role;
  displayName?: string;
  organizationName?: string;
  branchName?: string | null;
  canSwitchRole?: boolean;
  onRoleChange?: (role: Role) => void;
  /** Kullanıcı platform operatörü mü. Menüdeki platform bağlantısını yönetir. */
  canAccessPlatform?: boolean;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  const [active, setActive] = useState<Section>("Genel Bakış");
  const [mobileNav, setMobileNav] = useState(false);
  // Masaüstünde menüyü simge şeridine indirir. Mobilde anlamı yok; orada menü
  // zaten çekmece olarak açılıp kapanıyor.
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [attendances, setAttendances] = useState<
    Record<string, AttendanceState>
  >(() => readDemoData("attendances", initialAttendances));
  const [automations, setAutomations] = useState(() =>
    readDemoData("automations", initialAutomations)
  );
  const [dayPlanTasks, setDayPlanTasks] = useState<
    Record<DayPlanRole, DayPlanTask[]>
  >(() => readDemoData("dayPlanTasks", dayPlanTasksByRole));
  const [homework, setHomework] = useState<Homework[]>(() =>
    readDemoData("homework", initialHomework)
  );
  const [message, setMessage] = useState("");
  const meta = roleMeta[role];
  const currentDisplayName = displayName ?? "";
  const navItems = allNav.filter(item =>
    availableEducationSections(role).includes(item.label)
  );
  const visibleStudents = useMemo(() => {
    const roleStudents = filterStudentsForRole(students, role, isDemoMode);
    return roleStudents.filter(student =>
      `${student.name} ${student.code} ${student.group}`
        .toLocaleLowerCase("tr")
        .includes(query.toLocaleLowerCase("tr"))
    );
  }, [role, query]);

  useEffect(() => {
    writeDemoData("attendances", attendances);
  }, [attendances]);

  useEffect(() => {
    writeDemoData("automations", automations);
  }, [automations]);

  useEffect(() => {
    writeDemoData("dayPlanTasks", dayPlanTasks);
  }, [dayPlanTasks]);

  useEffect(() => {
    writeDemoData("homework", homework);
  }, [homework]);

  const resetDemoData = () => {
    clearDemoData("attendances");
    clearDemoData("automations");
    clearDemoData("dayPlanTasks");
    clearDemoData("homework");
    setAttendances(initialAttendances);
    setAutomations(initialAutomations);
    setDayPlanTasks(dayPlanTasksByRole);
    setHomework(initialHomework);
    toast.success("Demo verileri sıfırlandı", {
      description:
        "Yoklama, otomasyon, gün planı ve ödev verileri ilk demo durumuna döndürüldü.",
    });
  };

  const changeRole = (nextRole: Role) => {
    if (!canSwitchRole) return;
    setRole(nextRole);
    onRoleChange?.(nextRole);
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
    if (active === "Gün Planı") {
      // "Gün Planı" is only exposed to admin/teacher in `allNav`, and
      // `changeRole` resets `active` to "Genel Bakış" on every role switch,
      // so this branch is unreachable for student/parent.
      const dayPlanRole = role as DayPlanRole;
      return (
        <DayPlanPage
          role={dayPlanRole}
          tasks={dayPlanTasks[dayPlanRole]}
          setTasks={updater =>
            setDayPlanTasks(current => ({
              ...current,
              [dayPlanRole]:
                typeof updater === "function"
                  ? (updater as (prev: DayPlanTask[]) => DayPlanTask[])(
                      current[dayPlanRole]
                    )
                  : updater,
            }))
          }
        />
      );
    }
    if (active === "Öğrenciler")
      return (
        <StudentsPage
          role={role}
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
    if (active === "Ödevler")
      return (
        <HomeworkPage
          role={role}
          homework={homework}
          setHomework={setHomework}
        />
      );
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
    return <SettingsPage role={role} onResetDemoData={resetDemoData} />;
  };

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[258px] flex-col border-r border-slate-200 bg-white px-3 py-4 transition-all lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"} ${navCollapsed ? "lg:w-[74px] lg:px-2" : "lg:w-[258px]"}`}
        >
          <div className="mb-7 flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 p-1.5 shadow-[0_6px_14px_rgba(15,23,42,.12)]">
                <OrbitMark inverted className="h-full w-full object-contain" />
              </span>
              <div className={navCollapsed ? "lg:hidden" : ""}>
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
          <div
            className={`mb-5 rounded-xl border border-blue-100 bg-blue-50/65 px-3 py-3 ${navCollapsed ? "lg:hidden" : ""}`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`grid h-8 w-8 place-items-center rounded-lg ${meta.color}`}
              >
                <meta.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-extrabold text-slate-800">
                  {currentDisplayName}
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                  {meta.label}
                </p>
              </div>
            </div>
          </div>
          {/*
            `flex-1 overflow-y-auto` olmadan menü, ekran yüksekliğini aşınca
            kesiliyordu ve kaydırılamıyordu: `lg:h-screen` yüksekliği sabitliyor
            ama taşan içeriğe ne yapılacağını söylemiyor. Küçük dizüstü
            ekranlarda alttaki maddelere hiç ulaşılamıyordu.
          */}
          <nav className="-mr-1 flex-1 space-y-1 overflow-y-auto pr-1">
            {(["Ana çalışma alanı", "Kurum yönetimi"] as const).map(group => {
              const groupItems = navItems.filter(item => item.group === group);
              if (groupItems.length === 0) return null;

              const groupTitle =
                group === "Kurum yönetimi" ? secondaryGroupTitle[role] : group;

              return (
                <div
                  key={group}
                  className={
                    group === "Kurum yönetimi" ? "mt-6 space-y-1" : "space-y-1"
                  }
                >
                  <p
                    className={`mb-2 px-3 text-[9px] font-extrabold uppercase tracking-[.14em] text-slate-400 ${navCollapsed ? "lg:hidden" : ""}`}
                  >
                    {groupTitle}
                  </p>
                  {groupItems.map(item => {
                    const Icon = item.icon;
                    const selected = active === item.label;
                    return (
                      <button
                        key={item.label}
                        onClick={() => navigate(item.label)}
                        // Şerit hâlindeyken etiket gizlendiği için erişilebilir
                        // ad ve fare üzerinde ipucu `title` ile korunuyor.
                        title={navCollapsed ? item.label : undefined}
                        className={`flex h-9 w-full items-center gap-3 rounded-lg text-left text-[12px] font-semibold transition ${navCollapsed ? "px-3 lg:justify-center lg:px-0" : "px-3"} ${selected ? "bg-slate-900 text-white shadow-[0_7px_14px_rgba(15,23,42,.10)]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${selected ? "text-white" : "text-slate-400"}`}
                        />
                        <span
                          className={`flex-1 ${navCollapsed ? "lg:hidden" : ""}`}
                        >
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
          <div className="mt-auto space-y-1 border-t border-slate-100 pt-4">
            {/*
              Platform paneline giden tek görünür yol. Bağlantı yokken operatör
              panele ancak adresi elle yazarak ulaşabiliyordu; kurucu ekip
              üyeleri hem kurum üyesi hem operatör olduğu için girişte doğrudan
              dershane paneline düşüyor ve panelin var olduğunu göremiyordu.
              Yalnızca gerçekten operatör olana gösterilir.
            */}
            {canAccessPlatform ? (
              <Link
                href="/platform"
                title={navCollapsed ? "Platform yönetimi" : undefined}
                className={`flex h-9 w-full items-center gap-3 rounded-lg text-[12px] font-semibold text-slate-600 transition hover:bg-slate-100 ${navCollapsed ? "px-3 lg:justify-center lg:px-0" : "px-3"}`}
              >
                <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400" />
                <span className={navCollapsed ? "lg:hidden" : ""}>
                  Platform yönetimi
                </span>
              </Link>
            ) : null}
            <button
              onClick={onLogout}
              title={navCollapsed ? "Çıkış Yap" : undefined}
              className={`flex h-9 w-full items-center gap-3 rounded-lg text-[12px] font-semibold text-slate-600 transition hover:bg-slate-100 ${navCollapsed ? "px-3 lg:justify-center lg:px-0" : "px-3"}`}
            >
              <LogOut className="h-4 w-4 shrink-0 text-slate-400" />
              <span className={navCollapsed ? "lg:hidden" : ""}>Çıkış Yap</span>
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
                aria-label="Menüyü aç"
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>
              {/*
                Masaüstünde menü daraltma. Mobildeki düğmeden ayrı: orada menü
                çekmece olarak açılıp kapanıyor, burada simge şeridine iniyor.
                Tek düğmeyle iki davranışı yönetmek, ekran genişliğini JS'te
                okumayı gerektirirdi.
              */}
              <button
                onClick={() => setNavCollapsed(value => !value)}
                aria-label={navCollapsed ? "Menüyü genişlet" : "Menüyü daralt"}
                aria-pressed={navCollapsed}
                title={navCollapsed ? "Menüyü genişlet" : "Menüyü daralt"}
                className="hidden h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 lg:grid"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
              <div>
                <p className="text-[11px] font-semibold text-slate-500">
                  {meta.description}
                </p>
                {/* Akademik dönem burada yazılıydı ve hiçbir yerden gelmiyordu:
                    ne `organizations` tablosunda ne kimlikte böyle bir alan var.
                    Her kuruma aynı dönemi söylüyordu. Kurum adı da artık
                    korumalı; çözülemediğinde başlık boş kalır, yarım kalmış bir
                    ayıraç bırakmaz. */}
                <p className="text-[10px] text-slate-400">
                  {[branchName, organizationName].filter(Boolean).join(" · ")}
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
              {canSwitchRole ? (
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
              ) : null}
              {canSwitchRole ? (
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
                  aria-label="Demo rolünü değiştir"
                  className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-[11px] font-extrabold text-white sm:hidden"
                >
                  {currentDisplayName
                    ? currentDisplayName
                        .split(" ")
                        .filter(Boolean)
                        .map(word => word[0])
                        .join("")
                    : "O"}
                </button>
              ) : (
                <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-[11px] font-extrabold text-white">
                  {currentDisplayName
                    ? currentDisplayName
                        .split(" ")
                        .filter(Boolean)
                        .map(word => word[0])
                        .join("")
                    : "O"}
                </span>
              )}
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
