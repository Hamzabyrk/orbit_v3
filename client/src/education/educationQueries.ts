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
  type ClassListResult,
} from "./classService";
import {
  DEFAULT_SCHEDULE_LIMIT,
  loadSchedule,
  type ScheduleListResult,
} from "./scheduleService";
import {
  loadLatestAttendanceSession,
  type LatestAttendanceSessionResult,
} from "./attendanceService";

/**
 * Eğitim alanı sorgu anahtarları (v1.3-01 · A, B ve C parçaları, **K-19** / mimari kararlar).
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
  students: (organizationId: string) =>
    ["education", "students", { organizationId }] as const,
  classes: (organizationId: string) =>
    ["education", "classes", { organizationId }] as const,
  schedule: (organizationId: string) =>
    ["education", "schedule", { organizationId }] as const,
  attendance: (organizationId: string) =>
    ["education", "attendance", { organizationId }] as const,
};

export type UseStudentsOptions = {
  organizationId?: string;
  limit?: number;
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
  const isEnabled = (options?.enabled ?? true) && Boolean(organizationId);

  return useQuery<StudentListResult, Error>({
    queryKey: organizationId
      ? educationKeys.students(organizationId)
      : (["education", "students", { organizationId: "" }] as const),
    queryFn: () => loadStudents(limit),
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
    queryFn: () => loadClasses(limit),
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
    queryFn: () => loadLatestAttendanceSession(),
    enabled: isEnabled,
  });
}
