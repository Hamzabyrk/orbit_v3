import { isDemoMode } from "@/auth/runtime";
import {
  classes as demoClasses,
  dayPlanEventsByRole as demoDayPlanEventsByRole,
  dayPlanTasksByRole as demoDayPlanTasksByRole,
  initialAttendances as demoInitialAttendances,
  initialAutomations as demoInitialAutomations,
  initialHomework as demoInitialHomework,
  organizationMembers as demoOrganizationMembers,
  paymentRows as demoPaymentRows,
  schedule as demoSchedule,
  students as demoStudents,
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
