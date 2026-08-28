import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import { isDemoMode } from "@/auth/runtime";
import {
  adminAutomationActivities as demoAdminAutomationActivities,
  adminFollowUpNote as demoAdminFollowUpNote,
  adminOverviewHeader as demoAdminOverviewHeader,
  attendanceLessonInfo as demoAttendanceLessonInfo,
  classes as demoClasses,
  dayPlanEventsByRole as demoDayPlanEventsByRole,
  dayPlanTasksByRole as demoDayPlanTasksByRole,
  demoActiveConversation,
  demoAdminOverviewStatValues,
  demoAssessmentFollowUp,
  demoAssessmentHeaderInfo,
  demoAssessmentOverviewStatValues,
  demoAssessmentSubjects,
  demoCommunicationsList,
  demoParentOverviewStatValues,
  demoPaymentOverviewStatValues,
  demoReportActions,
  demoReportAttendanceValues,
  demoReportExamLabels,
  demoReportExamValues,
  demoReportHomeworkLabels,
  demoReportHomeworkValues,
  demoStudentOverviewStatValues,
  demoTeacherOverviewStatValues,
  initialAttendances as demoInitialAttendances,
  initialAutomations as demoInitialAutomations,
  initialHomework as demoInitialHomework,
  organizationMembers as demoOrganizationMembers,
  parentCommunicationItems as demoParentCommunicationItems,
  parentProgressSummary as demoParentProgressSummary,
  paymentRows as demoPaymentRows,
  schedule as demoSchedule,
  studentActionSteps as demoStudentActionSteps,
  students as demoStudents,
  studentWeeklyNote as demoStudentWeeklyNote,
  teacherFollowUpItems as demoTeacherFollowUpItems,
} from "./demoData";
import type {
  OverviewStat,
  OverviewStatTemplate,
  OverviewStatValue,
} from "./demoData";
export type {
  ActiveConversation,
  AdminFollowUpNote,
  AdminOverviewHeader,
  AssessmentFollowUp,
  AssessmentHeaderInfo,
  AssessmentSubject,
  AttendanceLessonInfo,
  AutomationActivity,
  CommunicationItem,
  ConversationMessage,
  OverviewStat,
  OverviewStatTemplate,
  OverviewStatValue,
  ParentCommunicationItem,
  ParentProgressSummary,
  ReportActionItem,
  StudentActionStep,
  StudentWeeklyNote,
  TeacherFollowUpItem,
} from "./demoData";

/**
 * Eğitim ekranlarının veri kaynağı.
 *
 * Production'da gerçek veri katmanı henüz bağlanmadığı için güvenli varsayılan
 * boştur. Demo ve preview ortamları ise ekranların çalıştırılabilmesi için
 * yalnızca demo verisini kullanır.
 */
export const classes = isDemoMode ? demoClasses : [];
export const dayPlanEventsByRole = isDemoMode
  ? demoDayPlanEventsByRole
  : { admin: [], teacher: [] };
export const paymentRows = isDemoMode ? demoPaymentRows : [];
export const schedule = isDemoMode ? demoSchedule : [];
export const students = isDemoMode ? demoStudents : [];
export const organizationMembers = isDemoMode ? demoOrganizationMembers : [];

export const initialAttendances = isDemoMode ? demoInitialAttendances : {};
export const initialAutomations = isDemoMode ? demoInitialAutomations : [];
export const initialHomework = isDemoMode ? demoInitialHomework : [];
export const dayPlanTasksByRole = isDemoMode
  ? demoDayPlanTasksByRole
  : { admin: [], teacher: [] };

export const adminOverviewHeader = isDemoMode
  ? demoAdminOverviewHeader
  : {
      subtitle:
        "Aday kayıtları, dersler, yoklamalar ve veli takipleri tek çalışma alanında toplanır.",
    };

export const adminOverviewStatTemplates: OverviewStatTemplate[] = [
  {
    key: "active-students",
    label: "Aktif öğrenci",
    icon: Users,
    emptyValue: "0",
    emptyDetail: "0 sınıfta kayıtlı",
  },
  {
    key: "today-attendance",
    label: "Bugünkü devam",
    icon: ClipboardCheck,
    tone: "green",
    emptyValue: "—",
    emptyDetail: "0 yoklama tamamlandı",
  },
  {
    key: "follow-up",
    label: "Takip gerekli",
    icon: CircleAlert,
    tone: "amber",
    emptyValue: "0",
    emptyDetail: "Akademik veya devam sinyali",
  },
  {
    key: "upcoming-payment",
    label: "Yaklaşan tahsilat",
    icon: WalletCards,
    tone: "violet",
    emptyValue: "₺0",
    emptyDetail: "Bu hafta vadesi gelen taksit yok",
  },
  {
    key: "active-automations",
    label: "Çalışan otomasyon",
    icon: Sparkles,
    tone: "blue",
    emptyValue: "0",
    emptyDetail: "Son 24 saatte 0 işlem",
  },
];

export const teacherOverviewStatTemplates: OverviewStatTemplate[] = [
  {
    key: "today-lessons",
    label: "Bugünkü ders",
    icon: CalendarDays,
    emptyValue: "0",
    emptyDetail: "İlk ders —",
  },
  {
    key: "class-average",
    label: "Sınıf ortalaması",
    icon: BarChart3,
    tone: "violet",
    emptyValue: "—",
    emptyDetail: "Değerlendirilmiş deneme yok",
  },
  {
    key: "pending-homework",
    label: "Teslim bekleyen",
    icon: BookOpen,
    tone: "amber",
    emptyValue: "0",
    emptyDetail: "Teslim bekleyen ödev yok",
  },
  {
    key: "follow-up-recommendation",
    label: "Takip önerisi",
    icon: CircleAlert,
    tone: "rose",
    emptyValue: "0",
    emptyDetail: "Rehberlik görüşmesi",
  },
];

export const studentOverviewStatTemplates: OverviewStatTemplate[] = [
  {
    key: "today-lessons",
    label: "Bugünkü ders",
    icon: CalendarDays,
    emptyValue: "0",
    emptyDetail: "İlk ders —",
  },
  {
    key: "completed-homework",
    label: "Tamamlanan ödev",
    icon: Check,
    tone: "green",
    emptyValue: "0/0",
    emptyDetail: "Bu hafta",
  },
  {
    key: "last-exam",
    label: "Son deneme",
    icon: BarChart3,
    tone: "violet",
    emptyValue: "—",
    emptyDetail: "Gelişim sinyali yok",
  },
  {
    key: "attendance",
    label: "Devam",
    icon: ClipboardCheck,
    tone: "blue",
    emptyValue: "—",
    emptyDetail: "Bu dönem",
  },
];

export const parentOverviewStatTemplates: OverviewStatTemplate[] = [
  {
    key: "attendance",
    label: "Devam",
    icon: ClipboardCheck,
    tone: "green",
    emptyValue: "—",
    emptyDetail: "Bu dönem",
  },
  {
    key: "last-exam",
    label: "Son deneme",
    icon: BarChart3,
    tone: "violet",
    emptyValue: "—",
    emptyDetail: "Gelişim sinyali yok",
  },
  {
    key: "upcoming-lesson",
    label: "Yaklaşan ders",
    icon: CalendarDays,
    emptyValue: "—",
    emptyDetail: "Planlanan ders yok",
  },
  {
    key: "payment-plan",
    label: "Ödeme planı",
    icon: WalletCards,
    tone: "green",
    emptyValue: "—",
    emptyDetail: "Vadesi gelen taksit yok",
  },
];

export const paymentOverviewStatTemplates: OverviewStatTemplate[] = [
  {
    key: "monthly-collection",
    label: "Bu ay tahsilat",
    icon: WalletCards,
    tone: "green",
    emptyValue: "₺0",
    emptyDetail: "Vadesi gelen taksit yok",
  },
  {
    key: "upcoming-installments",
    label: "Yaklaşan taksit",
    icon: Clock3,
    tone: "amber",
    emptyValue: "0",
    emptyDetail: "Önümüzdeki 7 gün",
  },
  {
    key: "follow-up-payments",
    label: "Takip gereken",
    icon: CircleAlert,
    tone: "rose",
    emptyValue: "0",
    emptyDetail: "Takip gereken ödeme yok",
  },
];

export const assessmentOverviewStatTemplates = {
  personal: [
    {
      key: "score",
      label: "Puan",
      icon: BarChart3,
      tone: "violet" as const,
      emptyValue: "—",
      emptyDetail: "100 üzerinden",
    },
    {
      key: "progress",
      label: "Gelişim",
      icon: Activity,
      tone: "green" as const,
      emptyValue: "—",
      emptyDetail: "Karşılaştırılacak önceki deneme yok",
    },
    {
      key: "focus-area",
      label: "Odak alanı",
      icon: BookOpen,
      tone: "amber" as const,
      emptyValue: "—",
      emptyDetail: "Henüz öneri oluşmadı",
    },
  ],
  institution: [
    {
      key: "score",
      label: "Kurum ortalaması",
      icon: BarChart3,
      tone: "violet" as const,
      emptyValue: "—",
      emptyDetail: "100 üzerinden",
    },
    {
      key: "progress",
      label: "Gelişim",
      icon: Activity,
      tone: "green" as const,
      emptyValue: "—",
      emptyDetail: "Karşılaştırılacak önceki deneme yok",
    },
    {
      key: "focus-area",
      label: "Odak alanı",
      icon: BookOpen,
      tone: "amber" as const,
      emptyValue: "—",
      emptyDetail: "Henüz öneri oluşmadı",
    },
  ],
};

/**
 * Son dört ayın kısa adları.
 *
 * demoData.ts'te değil burada duruyor: yalnızca üretim dalında kullanılıyor ve
 * üretimin demo modülünden canlı bir değer alması kapının ters yönü olurdu.
 */
function getLastFourMonths(referenceDate: Date = new Date()): string[] {
  const months = [
    "Oca",
    "Şub",
    "Mar",
    "Nis",
    "May",
    "Haz",
    "Tem",
    "Ağu",
    "Eyl",
    "Eki",
    "Kas",
    "Ara",
  ];
  const currentMonth = referenceDate.getMonth();
  return [
    months[(currentMonth - 3 + 12) % 12],
    months[(currentMonth - 2 + 12) % 12],
    months[(currentMonth - 1 + 12) % 12],
    months[currentMonth],
  ];
}

function buildStatCards(
  templates: OverviewStatTemplate[],
  demoValues: Record<string, OverviewStatValue> | null
): OverviewStat[] {
  return templates.map(tmpl => {
    const demo = demoValues?.[tmpl.key];
    return {
      label: tmpl.label,
      value: demo ? demo.value : tmpl.emptyValue,
      detail:
        demo && demo.detail !== undefined ? demo.detail : tmpl.emptyDetail,
      icon: tmpl.icon,
      tone: tmpl.tone,
    };
  });
}

export const adminOverviewStats = buildStatCards(
  adminOverviewStatTemplates,
  isDemoMode ? demoAdminOverviewStatValues : null
);
export const adminFollowUpNote = isDemoMode ? demoAdminFollowUpNote : null;
export const adminAutomationActivities = isDemoMode
  ? demoAdminAutomationActivities
  : [];

export const teacherOverviewStats = buildStatCards(
  teacherOverviewStatTemplates,
  isDemoMode ? demoTeacherOverviewStatValues : null
);
export const teacherFollowUpItems = isDemoMode ? demoTeacherFollowUpItems : [];

export const studentOverviewStats = buildStatCards(
  studentOverviewStatTemplates,
  isDemoMode ? demoStudentOverviewStatValues : null
);
export const studentActionSteps = isDemoMode ? demoStudentActionSteps : [];
export const studentWeeklyNote = isDemoMode ? demoStudentWeeklyNote : null;

export const parentOverviewStats = buildStatCards(
  parentOverviewStatTemplates,
  isDemoMode ? demoParentOverviewStatValues : null
);
export const parentProgressSummary = isDemoMode
  ? demoParentProgressSummary
  : null;
export const parentCommunicationItems = isDemoMode
  ? demoParentCommunicationItems
  : [];

export const attendanceLessonInfo = isDemoMode
  ? demoAttendanceLessonInfo
  : null;

export const paymentOverviewStats = buildStatCards(
  paymentOverviewStatTemplates,
  isDemoMode ? demoPaymentOverviewStatValues : null
);

export const assessmentStatsByRole = {
  personal: buildStatCards(
    assessmentOverviewStatTemplates.personal,
    isDemoMode ? demoAssessmentOverviewStatValues.personal : null
  ),
  institution: buildStatCards(
    assessmentOverviewStatTemplates.institution,
    isDemoMode ? demoAssessmentOverviewStatValues.institution : null
  ),
};

export const assessmentHeaderInfo = isDemoMode
  ? demoAssessmentHeaderInfo
  : null;
export const assessmentSubjects = isDemoMode ? demoAssessmentSubjects : [];
export const assessmentFollowUp = isDemoMode ? demoAssessmentFollowUp : null;

export const reportAttendanceValues = isDemoMode
  ? demoReportAttendanceValues
  : [0, 0, 0, 0];
export const reportAttendanceLabels = ["1. hf", "2. hf", "3. hf", "Bu hf"];

export const reportExamValues = isDemoMode
  ? demoReportExamValues
  : [0, 0, 0, 0];
export const reportExamLabels = isDemoMode
  ? demoReportExamLabels
  : ["1. deneme", "2. deneme", "3. deneme", "Son deneme"];

export const reportHomeworkValues = isDemoMode
  ? demoReportHomeworkValues
  : [0, 0, 0, 0];
export const reportHomeworkLabels = isDemoMode
  ? demoReportHomeworkLabels
  : getLastFourMonths();

export const reportActions = isDemoMode ? demoReportActions : [];

export const communicationsList = isDemoMode ? demoCommunicationsList : [];
export const activeConversation = isDemoMode ? demoActiveConversation : null;
