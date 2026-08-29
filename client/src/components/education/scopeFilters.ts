/**
 * Rol bazlı kapsam filtreleri.
 *
 * Kurum yöneticisi (admin) kurumun tamamından sorumludur ve tüm veriyi görür.
 * Öğretmen, öğrenci ve velinin kapsamını (öğretmen-sınıf ataması, veli-öğrenci bağı)
 * belirleyen ilişkisel tablolar (`classes`, `student_guardians`, `course_teachers`)
 * v1.2'de veritabanına eklenecektir.
 *
 * Bu tablolar henüz mevcut olmadığından:
 * - Demo modunda satış sunumu için örnek filtreleme çalışır.
 * - Üretimde çözülemeyen kapsam için dar tarafta kalınarak boş küme dönülür (K-04).
 *
 * Referans: Issue #136, K-03, K-04, K-06.
 */

import {
  DEMO_CLASS_MENTOR,
  DEMO_STUDENT_CLASS_GROUP,
  DEMO_STUDENT_ID,
  DEMO_STUDENT_NAME,
  DEMO_TEACHER_CLASS_GROUPS,
  DEMO_TEACHER_NAMES,
} from "./demoData";
import type {
  ClassGroup,
  Homework,
  PaymentRow,
  Role,
  ScheduleItem,
  Student,
} from "./types";

/**
 * Öğretmen paneli (TeacherDashboard) için ders programı filtresi.
 */
export function filterScheduleForTeacher(
  schedule: ScheduleItem[],
  isDemo: boolean
): ScheduleItem[] {
  if (isDemo) {
    return schedule.filter(item =>
      DEMO_TEACHER_NAMES.includes(
        item.teacher as (typeof DEMO_TEACHER_NAMES)[number]
      )
    );
  }
  return [];
}

/**
 * Öğrenci listesi (EducationPlatform / StudentsPage) için rol bazlı filtre.
 */
export function filterStudentsForRole(
  students: Student[],
  role: Role,
  isDemo: boolean
): Student[] {
  if (role === "admin") {
    return students;
  }
  if (isDemo) {
    if (role === "teacher") {
      return students.filter(student =>
        DEMO_TEACHER_CLASS_GROUPS.includes(
          student.group as (typeof DEMO_TEACHER_CLASS_GROUPS)[number]
        )
      );
    }
    if (role === "student" || role === "parent") {
      return students.filter(student => student.id === DEMO_STUDENT_ID);
    }
  }
  return [];
}

/**
 * Yoklama ekranı (AttendancePage) için öğrenci filtresi.
 */
export function filterAttendanceStudents(
  students: Student[],
  role: Role,
  isDemo: boolean
): Student[] {
  if (role === "admin") {
    return students;
  }
  if (isDemo && role === "teacher") {
    return students.filter(student =>
      DEMO_TEACHER_CLASS_GROUPS.includes(
        student.group as (typeof DEMO_TEACHER_CLASS_GROUPS)[number]
      )
    );
  }
  return [];
}

/**
 * Sınıflar ekranı (ClassesPage) için sınıf filtresi.
 */
export function filterClassesForRole(
  classes: ClassGroup[],
  role: Role,
  isDemo: boolean
): ClassGroup[] {
  if (role === "admin") {
    return classes;
  }
  if (isDemo && role === "teacher") {
    return classes.filter(group => group.mentor === DEMO_CLASS_MENTOR);
  }
  return [];
}

/**
 * Ödevler ekranı (HomeworkPage) için ödev listesi filtresi.
 */
export function filterHomeworkForRole(
  homework: Homework[],
  role: Role,
  isDemo: boolean
): Homework[] {
  if (role === "admin") {
    return homework;
  }
  if (isDemo) {
    if (role === "teacher") {
      return homework.filter(item =>
        DEMO_TEACHER_CLASS_GROUPS.includes(
          item.classGroup as (typeof DEMO_TEACHER_CLASS_GROUPS)[number]
        )
      );
    }
    if (role === "student" || role === "parent") {
      return homework.filter(
        item => item.classGroup === DEMO_STUDENT_CLASS_GROUP
      );
    }
  }
  return [];
}

/**
 * Kayıt ve ödemeler ekranı (PaymentsPage) için satır filtresi.
 */
export function filterPaymentsForRole(
  paymentRows: PaymentRow[],
  role: Role,
  isDemo: boolean
): PaymentRow[] {
  if (role === "admin") {
    return paymentRows;
  }
  if (isDemo && role === "parent") {
    return paymentRows.filter(item => item.student === DEMO_STUDENT_NAME);
  }
  return [];
}

/**
 * Ders programı ekranı (SchedulePage) için program filtresi.
 */
export function filterScheduleForRole(
  schedule: ScheduleItem[],
  role: Role,
  isDemo: boolean
): ScheduleItem[] {
  if (role === "admin") {
    return schedule;
  }
  if (isDemo) {
    if (role === "student" || role === "parent") {
      return schedule.filter(
        item =>
          item.group === DEMO_STUDENT_CLASS_GROUP ||
          item.group === DEMO_STUDENT_NAME
      );
    }
    if (role === "teacher") {
      return schedule.filter(item =>
        DEMO_TEACHER_NAMES.includes(
          item.teacher as (typeof DEMO_TEACHER_NAMES)[number]
        )
      );
    }
  }
  return [];
}
