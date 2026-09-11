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
  loadAttendanceSheet,
  type LatestAttendanceSessionResult,
  type AttendanceSheet,
} from "./attendanceService";
import {
  loadLatestExam,
  loadExams,
  loadExamSheet,
  type LatestExamResult,
  type ExamDetail,
  type ExamSheet,
} from "./examService";
import {
  DEFAULT_PAYMENT_LIMIT,
  loadPaymentOverviewCounts,
  loadPayments,
  type PaymentListResult,
  type PaymentOverviewCounts,
} from "./paymentService";

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
  payments: (organizationId: string) =>
    ["education", "payments", { organizationId }] as const,
  paymentOverview: (organizationId: string) =>
    ["education", "paymentOverview", { organizationId }] as const,
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

/**
 * Bir yoklama oturumunun çizelgesini (öğrenci listesi ve yoklama durumları) getiren React Query hook'u (v1.4-03 · #268).
 *
 * Aktif kurum kimliği `useAuth` üzerinden sağlanır; kurum kimliği veya oturum kimliği
 * henüz çözümlenmemişse sorgu çalıştırılmaz (`enabled: false`).
 */
export function useAttendanceSheet(
  sessionId: string | null | undefined,
  options?: UseAttendanceSheetOptions
) {
  const { identity } = useAuth();
  const organizationId =
    options?.organizationId ?? identity?.membership?.organizationId;
  const isEnabled =
    (options?.enabled ?? true) && Boolean(organizationId) && Boolean(sessionId);

  return useQuery<AttendanceSheet, Error>({
    queryKey:
      organizationId && sessionId
        ? educationKeys.attendanceSheet(organizationId, sessionId)
        : ([
            "education",
            "attendanceSheet",
            { organizationId: "", sessionId: "" },
          ] as const),
    queryFn: () => loadAttendanceSheet(organizationId!, sessionId!),
    enabled: isEnabled,
  });
}

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

/**
 * Aktif kurumun sınav listesini getiren React Query hook'u (#270).
 */
export function useExams(options?: UseExamsOptions) {
  const { identity } = useAuth();
  const organizationId =
    options?.organizationId ?? identity?.membership?.organizationId;
  const isEnabled = (options?.enabled ?? true) && Boolean(organizationId);

  return useQuery<ExamDetail[], Error>({
    queryKey: organizationId
      ? educationKeys.exams(organizationId)
      : (["education", "exams", { organizationId: "" }] as const),
    queryFn: () => loadExams(organizationId!),
    enabled: isEnabled,
  });
}

export type UseExamSheetOptions = {
  organizationId?: string;
  enabled?: boolean;
};

/**
 * Bir sınavın çizelgesini (öğrenci listesi ve puanları) getiren React Query hook'u (v1.4-04 · #270).
 *
 * Aktif kurum kimliği `useAuth` üzerinden sağlanır; kurum kimliği veya sınav kimliği
 * henüz çözümlenmemişse sorgu çalıştırılmaz (`enabled: false`).
 */
export function useExamSheet(
  examId: string | null | undefined,
  options?: UseExamSheetOptions
) {
  const { identity } = useAuth();
  const organizationId =
    options?.organizationId ?? identity?.membership?.organizationId;
  const isEnabled =
    (options?.enabled ?? true) && Boolean(organizationId) && Boolean(examId);

  return useQuery<ExamSheet, Error>({
    queryKey:
      organizationId && examId
        ? educationKeys.examSheet(organizationId, examId)
        : ([
            "education",
            "examSheet",
            { organizationId: "", examId: "" },
          ] as const),
    queryFn: () => loadExamSheet(organizationId!, examId!),
    enabled: isEnabled,
  });
}

export type UsePaymentsOptions = {
  organizationId?: string;
  limit?: number;
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
  const limit = options?.limit ?? DEFAULT_PAYMENT_LIMIT;
  const isEnabled = (options?.enabled ?? true) && Boolean(organizationId);

  return useQuery<PaymentListResult, Error>({
    queryKey: organizationId
      ? educationKeys.payments(organizationId)
      : (["education", "payments", { organizationId: "" }] as const),
    queryFn: () => loadPayments(limit),
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
