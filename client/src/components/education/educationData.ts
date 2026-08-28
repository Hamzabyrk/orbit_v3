import { isDemoMode } from "@/auth/runtime";
import {
  adminAutomationActivities as demoAdminAutomationActivities,
  adminFollowUpNote as demoAdminFollowUpNote,
  adminOverviewHeader as demoAdminOverviewHeader,
  adminOverviewStats as demoAdminOverviewStats,
  attendanceLessonInfo as demoAttendanceLessonInfo,
  classes as demoClasses,
  dayPlanEventsByRole as demoDayPlanEventsByRole,
  dayPlanTasksByRole as demoDayPlanTasksByRole,
  initialAttendances as demoInitialAttendances,
  initialAutomations as demoInitialAutomations,
  initialHomework as demoInitialHomework,
  organizationMembers as demoOrganizationMembers,
  parentCommunicationItems as demoParentCommunicationItems,
  parentOverviewStats as demoParentOverviewStats,
  parentProgressSummary as demoParentProgressSummary,
  paymentRows as demoPaymentRows,
  schedule as demoSchedule,
  studentActionSteps as demoStudentActionSteps,
  studentOverviewStats as demoStudentOverviewStats,
  students as demoStudents,
  studentWeeklyNote as demoStudentWeeklyNote,
  teacherFollowUpItems as demoTeacherFollowUpItems,
  teacherOverviewStats as demoTeacherOverviewStats,
} from "./demoData";
export type {
  AdminFollowUpNote,
  AdminOverviewHeader,
  AttendanceLessonInfo,
  AutomationActivity,
  OverviewStat,
  ParentCommunicationItem,
  ParentProgressSummary,
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
export const adminOverviewStats = isDemoMode ? demoAdminOverviewStats : [];
export const adminFollowUpNote = isDemoMode ? demoAdminFollowUpNote : null;
export const adminAutomationActivities = isDemoMode
  ? demoAdminAutomationActivities
  : [];

export const teacherOverviewStats = isDemoMode ? demoTeacherOverviewStats : [];
export const teacherFollowUpItems = isDemoMode ? demoTeacherFollowUpItems : [];

export const studentOverviewStats = isDemoMode ? demoStudentOverviewStats : [];
export const studentActionSteps = isDemoMode ? demoStudentActionSteps : [];
export const studentWeeklyNote = isDemoMode ? demoStudentWeeklyNote : null;

export const parentOverviewStats = isDemoMode ? demoParentOverviewStats : [];
export const parentProgressSummary = isDemoMode
  ? demoParentProgressSummary
  : null;
export const parentCommunicationItems = isDemoMode
  ? demoParentCommunicationItems
  : [];

export const attendanceLessonInfo = isDemoMode
  ? demoAttendanceLessonInfo
  : null;
