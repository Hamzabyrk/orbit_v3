import type {
  EducationRole,
  EducationSection,
} from "@/components/educationAccess";

export type Role = EducationRole;
export type Section = EducationSection;
export type AttendanceState = "Katıldı" | "Geç kaldı" | "Gelmedi" | "İzinli";

export type Student = {
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
  isMock: true;
};

export type ClassGroup = {
  id: string;
  name: string;
  program: string;
  mentor: string;
  studentCount: number;
  attendance: number;
  nextLesson: string;
  isMock: true;
};

export type ScheduleItem = {
  time: string;
  title: string;
  group: string;
  teacher: string;
  room: string;
  tone: string;
  isMock: true;
};

export type Automation = {
  id: string;
  title: string;
  description: string;
  trigger: string;
  impact: string;
  active: boolean;
  category: string;
  isMock: true;
};

export type PaymentRow = {
  student: string;
  plan: string;
  due: string;
  amount: string;
  status: "Güncel" | "Hatırlatma gerekli" | "Gecikme riski";
  isMock: true;
};

export type DayPlanRole = Extract<Role, "admin" | "teacher">;

export type DayPlanTaskStatus = "Planla" | "Bugün" | "Odaklan" | "Tamamlandı";

export type DayPlanTaskPriority = "Düşük" | "Orta" | "Yüksek";

export type DayPlanTaskCategory =
  | "Yoklama"
  | "Veli İletişimi"
  | "Sınav"
  | "Rapor"
  | "Kayıt"
  | "Ders Programı";

export type DayPlanTask = {
  id: string;
  title: string;
  detail: string;
  status: DayPlanTaskStatus;
  priority: DayPlanTaskPriority;
  category: DayPlanTaskCategory;
  duration: string;
  dueLabel: string;
  isMock: true;
};

export type DayPlanAppointmentMode = "Google Meet" | "Yüz yüze" | "Telefon";

export type DayPlanAppointmentType =
  | "Veli Görüşmesi"
  | "Öğretmen Değerlendirmesi"
  | "Şube Toplantısı"
  | "Rehberlik Görüşmesi"
  | "Aday Kayıt Görüşmesi";

export type DayPlanEvent = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  mode: DayPlanAppointmentMode;
  type: DayPlanAppointmentType;
  title: string;
  subtitle: string;
  isMock: true;
};
