import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/useAuth";
import {
  DEFAULT_STUDENT_LIMIT,
  loadStudents,
  type StudentListResult,
} from "./studentService";
import {
  DEFAULT_CLASS_LIMIT,
  loadClasses,
  loadClassEnrollments,
  type ClassListResult,
} from "./classService";
import type { ClassEnrollmentItem } from "@/components/education/types";
import {
  DEFAULT_SCHEDULE_LIMIT,
  loadSchedule,
  type ScheduleListResult,
} from "./scheduleService";
import {
  loadLatestAttendanceSession,
  type LatestAttendanceSessionResult,
} from "./attendanceService";
import { loadLatestExam, type LatestExamResult } from "./examService";
import {
  loadPaymentOverviewCounts,
  loadPayments,
  loadPlanInstallments,
  type PaymentListResult,
  type PaymentOverviewCounts,
  type Installment,
} from "./paymentService";
import {
  DEFAULT_HOMEWORK_LIMIT,
  loadHomework,
  loadSubjects,
  type HomeworkListResult,
  type SubjectDetail,
} from "./homeworkService";
import {
  DEFAULT_GUARDIAN_LIMIT,
  loadGuardians,
  loadStudentGuardianLinks,
  type GuardianListResult,
  type StudentGuardianLink,
} from "./guardianService";

import { useDebouncedValue } from "@/lib/useDebouncedValue";

/**
 * Eğitim alanı sorgu anahtarları (v1.3-01 · A, B, C, D ve E parçaları, **K-19** / mimari kararlar).
 *
 * **Anahtar sözleşmesi:** `[alan, kaynak, kapsam]`
 *
 * Kapsam HER ZAMAN aktif kurumu taşır. Bu bir kod düzeni tercihi değil,
 * **izolasyon kuralıdır**: kurum kimliği anahtarda yoksa, iki kuruma da erişimi
 * olan bir kullanıcı kurum değiştirdiğinde React Query önceki kurumun satırlarını
 * önbellekten (cache) servis eder ve RLS bunu engelleyemez — çünkü istek
 * sunucuya hiç gitmez.
 *
 * Anahtar üreticisi `organizationId: string` parametresini zorunlu kılarak
 * kurumsuz anahtar oluşturulmasını derleme zamanında (TypeScript) engeller.
 */
export const educationKeys = {
  all: ["education"] as const,
  students: (organizationId: string, search?: string) => {
    const trimmed = search?.trim();
    return trimmed
      ? ([
          "education",
          "students",
          { organizationId, search: trimmed },
        ] as const)
      : (["education", "students", { organizationId }] as const);
  },
  classes: (organizationId: string) =>
    ["education", "classes", { organizationId }] as const,
  classEnrollments: (organizationId: string, classId: string) =>
    ["education", "classEnrollments", { organizationId, classId }] as const,
  schedule: (organizationId: string) =>
    ["education", "schedule", { organizationId }] as const,
  attendance: (organizationId: string) =>
    ["education", "attendance", { organizationId }] as const,
  attendanceSheet: (organizationId: string, sessionId: string) =>
    ["education", "attendanceSheet", { organizationId, sessionId }] as const,
  exam: (organizationId: string) =>
    ["education", "exam", { organizationId }] as const,
  exams: (organizationId: string) =>
    ["education", "exams", { organizationId }] as const,
  examSheet: (organizationId: string, examId: string) =>
    ["education", "examSheet", { organizationId, examId }] as const,
  payments: (
    organizationId: string,
    options?: { studentId?: string; search?: string }
  ) => {
    return options
      ? (["education", "payments", { organizationId, ...options }] as const)
      : (["education", "payments", { organizationId }] as const);
  },
  planInstallments: (organizationId: string, planId?: string) => {
    return planId
      ? (["education", "planInstallments", { organizationId, planId }] as const)
      : (["education", "planInstallments", { organizationId }] as const);
  },
  paymentOverview: (organizationId: string) =>
    ["education", "paymentOverview", { organizationId }] as const,
  homework: (organizationId: string) =>
    ["education", "homework", { organizationId }] as const,
  subjects: (organizationId: string) =>
    ["education", "subjects", { organizationId }] as const,
  guardians: (organizationId: string, search?: string) => {
    const trimmed = search?.trim();
    return trimmed
      ? ([
          "education",
          "guardians",
          { organizationId, search: trimmed },
        ] as const)
      : (["education", "guardians", { organizationId }] as const);
  },
  studentGuardians: (organizationId: string, studentId?: string) => {
    return studentId
      ? ([
          "education",
          "studentGuardians",
          { organizationId, studentId },
        ] as const)
      : (["education", "studentGuardians", { organizationId }] as const);
  },
};

export type UseStudentsOptions = {
  organizationId?: string;
  limit?: number;
  search?: string;
  debounceMs?: number;
  enabled?: boolean;
};

/**
 * Aktif kurumun öğrencilerini getiren React Query hook'u.
 *
 * Aktif kurum kimliği `useAuth` üzerinden sağlanır; kurum kimliği henüz
 * çözümlenmemişse veya kullanıcı bir kuruma ait değilse sorgu çalıştırılmaz (`enabled: false`).
 */
export function useStudents(options?: UseStudentsOptions) {
  const { identity } = useAuth();
  const organizationId =
    options?.organizationId ?? identity?.membership?.organizationId;
  const limit = options?.limit ?? DEFAULT_STUDENT_LIMIT;
  const debouncedSearch = useDebouncedValue(
    options?.search,
    options?.debounceMs ?? 300
  );
  const isEnabled = (options?.enabled ?? true) && Boolean(organizationId);

  return useQuery<StudentListResult, Error>({
    queryKey: organizationId
      ? educationKeys.students(organizationId, debouncedSearch)
      : (["education", "students", { organizationId: "" }] as const),
    queryFn: () =>
      loadStudents(organizationId ?? "", {
        limit,
        search: debouncedSearch,
      }),
    enabled: isEnabled,
  });
}

export type UseClassesOptions = {
  organizationId?: string;
  limit?: number;
  enabled?: boolean;
};

/**
 * Aktif kurumun sınıflarını getiren React Query hook'u.
 *
 * Aktif kurum kimliği `useAuth` üzerinden sağlanır; kurum kimliği henüz
 * çözümlenmemişse veya kullanıcı bir kuruma ait değilse sorgu çalıştırılmaz (`enabled: false`).
 */
export function useClasses(options?: UseClassesOptions) {
  const { identity } = useAuth();
  const organizationId =
    options?.organizationId ?? identity?.membership?.organizationId;
  const limit = options?.limit ?? DEFAULT_CLASS_LIMIT;
  const isEnabled = (options?.enabled ?? true) && Boolean(organizationId);

  return useQuery<ClassListResult, Error>({
    queryKey: organizationId
      ? educationKeys.classes(organizationId)
      : (["education", "classes", { organizationId: "" }] as const),
    queryFn: () => loadClasses(organizationId ?? "", { limit }),
    enabled: isEnabled,
  });
}

export type UseClassEnrollmentsOptions = {
  organizationId?: string;
  enabled?: boolean;
};

/**
 * Belirli bir sınıfın aktif öğrenci kayıtlarını getiren React Query hook'u (v1.4-02).
 */
export function useClassEnrollments(
  classId: string,
  options?: UseClassEnrollmentsOptions
) {
  const { identity } = useAuth();
  const organizationId =
    options?.organizationId ?? identity?.membership?.organizationId;
  const isEnabled =
    (options?.enabled ?? true) && Boolean(organizationId) && Boolean(classId);

  return useQuery<ClassEnrollmentItem[], Error>({
    queryKey:
      organizationId && classId
        ? educationKeys.classEnrollments(organizationId, classId)
        : ([
            "education",
            "classEnrollments",
            { organizationId: "", classId: "" },
          ] as const),
    queryFn: () => loadClassEnrollments(organizationId ?? "", classId),
    enabled: isEnabled,
  });
}

export type UseScheduleOptions = {
  organizationId?: string;
  limit?: number;
  enabled?: boolean;
};

/**
 * Aktif kurumun ders programını getiren React Query hook'u (v1.3-01 · B parçası).
 *
 * Aktif kurum kimliği `useAuth` üzerinden sağlanır; kurum kimliği henüz
 * çözümlenmemişse veya kullanıcı bir kuruma ait değilse sorgu çalıştırılmaz (`enabled: false`).
 */
export function useSchedule(options?: UseScheduleOptions) {
  const { identity } = useAuth();
  const organizationId =
    options?.organizationId ?? identity?.membership?.organizationId;
  const limit = options?.limit ?? DEFAULT_SCHEDULE_LIMIT;
  const isEnabled = (options?.enabled ?? true) && Boolean(organizationId);

  return useQuery<ScheduleListResult, Error>({
    queryKey: organizationId
      ? educationKeys.schedule(organizationId)
      : (["education", "schedule", { organizationId: "" }] as const),
    queryFn: () => loadSchedule(limit),
    enabled: isEnabled,
  });
}

export type UseLatestAttendanceSessionOptions = {
  organizationId?: string;
  enabled?: boolean;
};

/**
 * Aktif kurumun en son yoklama oturumunu getiren React Query hook'u (v1.3-01 · C parçası).
 *
 * Aktif kurum kimliği `useAuth` üzerinden sağlanır; kurum kimliği henüz
 * çözümlenmemişse veya kullanıcı bir kuruma ait değilse sorgu çalıştırılmaz (`enabled: false`).
 */
export function useLatestAttendanceSession(
  options?: UseLatestAttendanceSessionOptions
) {
  const { identity } = useAuth();
  const organizationId =
    options?.organizationId ?? identity?.membership?.organizationId;
  const isEnabled = (options?.enabled ?? true) && Boolean(organizationId);

  return useQuery<LatestAttendanceSessionResult, Error>({
    queryKey: organizationId
      ? educationKeys.attendance(organizationId)
      : (["education", "attendance", { organizationId: "" }] as const),
    queryFn: () => loadLatestAttendanceSession(organizationId!),
    enabled: isEnabled,
  });
}

export type UseAttendanceSheetOptions = {
  organizationId?: string;
  enabled?: boolean;
};

export type UseLatestExamOptions = {
  organizationId?: string;
  enabled?: boolean;
};

/**
 * Aktif kurumun en son aktif sınavını getiren React Query hook'u (v1.3-01 · D parçası, #249, #270).
 *
 * Aktif kurum kimliği `useAuth` üzerinden sağlanır; kurum kimliği henüz
 * çözümlenmemişse veya kullanıcı bir kuruma ait değilse sorgu çalıştırılmaz (`enabled: false`).
 */
export function useLatestExam(options?: UseLatestExamOptions) {
  const { identity } = useAuth();
  const organizationId =
    options?.organizationId ?? identity?.membership?.organizationId;
  const isEnabled = (options?.enabled ?? true) && Boolean(organizationId);

  return useQuery<LatestExamResult, Error>({
    queryKey: organizationId
      ? educationKeys.exam(organizationId)
      : (["education", "exam", { organizationId: "" }] as const),
    queryFn: () => loadLatestExam(organizationId!),
    enabled: isEnabled,
  });
}

export type UseExamsOptions = {
  organizationId?: string;
  enabled?: boolean;
};

export type UseExamSheetOptions = {
  organizationId?: string;
  enabled?: boolean;
};

export type UsePaymentsOptions = {
  organizationId?: string;
  limit?: number;
  studentId?: string;
  search?: string;
  enabled?: boolean;
};

/**
 * Aktif kurumun ödeme planlarını getiren React Query hook'u (v1.3-01 · E parçası).
 *
 * Aktif kurum kimliği `useAuth` üzerinden sağlanır; kurum kimliği henüz
 * çözümlenmemişse veya kullanıcı bir kuruma ait değilse sorgu çalıştırılmaz (`enabled: false`).
 */
export function usePayments(options?: UsePaymentsOptions) {
  const { identity } = useAuth();
  const organizationId =
    options?.organizationId ?? identity?.membership?.organizationId;
  const isEnabled = (options?.enabled ?? true) && Boolean(organizationId);

  return useQuery<PaymentListResult, Error>({
    queryKey: organizationId
      ? educationKeys.payments(organizationId, {
          studentId: options?.studentId,
          search: options?.search,
        })
      : (["education", "payments", { organizationId: "" }] as const),
    queryFn: () =>
      loadPayments(organizationId!, {
        limit: options?.limit,
        studentId: options?.studentId,
        search: options?.search,
      }),
    enabled: isEnabled,
  });
}

export type UsePaymentOverviewOptions = {
  organizationId?: string;
  enabled?: boolean;
};

/**
 * Aktif kurumun ödeme genel bakış sayılarını getiren React Query hook'u (v1.3-01 · E parçası).
 *
 * Aktif kurum kimliği `useAuth` üzerinden sağlanır; kurum kimliği henüz
 * çözümlenmemişse veya kullanıcı bir kuruma ait değilse sorgu çalıştırılmaz (`enabled: false`).
 */
export function usePaymentOverview(options?: UsePaymentOverviewOptions) {
  const { identity } = useAuth();
  const organizationId =
    options?.organizationId ?? identity?.membership?.organizationId;
  const isEnabled = (options?.enabled ?? true) && Boolean(organizationId);

  return useQuery<PaymentOverviewCounts | null, Error>({
    queryKey: organizationId
      ? educationKeys.paymentOverview(organizationId)
      : (["education", "paymentOverview", { organizationId: "" }] as const),
    queryFn: () => loadPaymentOverviewCounts(),
    enabled: isEnabled,
  });
}

export type UsePlanInstallmentsOptions = {
  organizationId?: string;
  planId?: string;
  enabled?: boolean;
};

/**
 * Bir ödeme planına ait aktif taksitleri getiren React Query hook'u (v1.4-06 · #277).
 */
export function usePlanInstallments(options?: UsePlanInstallmentsOptions) {
  const { identity } = useAuth();
  const organizationId =
    options?.organizationId ?? identity?.membership?.organizationId;
  const planId = options?.planId;
  const isEnabled =
    (options?.enabled ?? true) && Boolean(organizationId) && Boolean(planId);

  return useQuery<Installment[], Error>({
    queryKey:
      organizationId && planId
        ? educationKeys.planInstallments(organizationId, planId)
        : (["education", "planInstallments", { organizationId: "" }] as const),
    queryFn: () => loadPlanInstallments(organizationId!, planId!),
    enabled: isEnabled,
  });
}

export type UseHomeworkOptions = {
  organizationId?: string;
  limit?: number;
  enabled?: boolean;
};

/**
 * Aktif kurumun ödevlerini getiren React Query hook'u (v1.4-05 · #273).
 */
export function useHomework(options?: UseHomeworkOptions) {
  const { identity } = useAuth();
  const organizationId =
    options?.organizationId ?? identity?.membership?.organizationId;
  const limit = options?.limit ?? DEFAULT_HOMEWORK_LIMIT;
  const isEnabled = (options?.enabled ?? true) && Boolean(organizationId);

  return useQuery<HomeworkListResult, Error>({
    queryKey: organizationId
      ? educationKeys.homework(organizationId)
      : (["education", "homework", { organizationId: "" }] as const),
    queryFn: () => loadHomework(organizationId!, { limit }),
    enabled: isEnabled,
  });
}

export type UseSubjectsOptions = {
  organizationId?: string;
  enabled?: boolean;
};

/**
 * Aktif kurumun derslerini getiren React Query hook'u.
 */
export function useSubjects(options?: UseSubjectsOptions) {
  const { identity } = useAuth();
  const organizationId =
    options?.organizationId ?? identity?.membership?.organizationId;
  const isEnabled = (options?.enabled ?? true) && Boolean(organizationId);

  return useQuery<SubjectDetail[], Error>({
    queryKey: organizationId
      ? educationKeys.subjects(organizationId)
      : (["education", "subjects", { organizationId: "" }] as const),
    queryFn: () => loadSubjects(organizationId!),
    enabled: isEnabled,
  });
}

export type UseGuardiansOptions = {
  organizationId?: string;
  limit?: number;
  search?: string;
  debounceMs?: number;
  enabled?: boolean;
};

/**
 * Aktif kurumun velilerini getiren React Query hook'u (v1.4-10 · #275).
 */
export function useGuardians(options?: UseGuardiansOptions) {
  const { identity } = useAuth();
  const organizationId =
    options?.organizationId ?? identity?.membership?.organizationId;
  const limit = options?.limit ?? DEFAULT_GUARDIAN_LIMIT;
  const debouncedSearch = useDebouncedValue(
    options?.search,
    options?.debounceMs ?? 300
  );
  const isEnabled = (options?.enabled ?? true) && Boolean(organizationId);

  return useQuery<GuardianListResult, Error>({
    queryKey: organizationId
      ? educationKeys.guardians(organizationId, debouncedSearch)
      : (["education", "guardians", { organizationId: "" }] as const),
    queryFn: () =>
      loadGuardians(organizationId ?? "", {
        limit,
        search: debouncedSearch,
      }),
    enabled: isEnabled,
  });
}

export type UseStudentGuardiansOptions = {
  organizationId?: string;
  enabled?: boolean;
};

/**
 * Bir öğrencinin aktif veli bağlarını getiren React Query hook'u (v1.4-10 · #275).
 */
export function useStudentGuardians(
  studentId: string,
  options?: UseStudentGuardiansOptions
) {
  const { identity } = useAuth();
  const organizationId =
    options?.organizationId ?? identity?.membership?.organizationId;
  const isEnabled =
    (options?.enabled ?? true) && Boolean(organizationId) && Boolean(studentId);

  return useQuery<StudentGuardianLink[], Error>({
    queryKey: organizationId
      ? educationKeys.studentGuardians(organizationId, studentId)
      : ([
          "education",
          "studentGuardians",
          { organizationId: "", studentId },
        ] as const),
    queryFn: () => loadStudentGuardianLinks(organizationId!, studentId),
    enabled: isEnabled,
  });
}
