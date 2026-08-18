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
