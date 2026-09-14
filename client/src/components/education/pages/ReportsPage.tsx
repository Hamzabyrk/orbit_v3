import { isDemoMode } from "@/auth/runtime";
import { formatTrWeekLabel } from "@/education/trDate";
import type {
  AttendanceWeek,
  ExamAverage,
  HomeworkWeek,
} from "@/education/reportService";
import {
  demoReportActions,
  demoReportAttendanceValues,
  demoReportExamLabels,
  demoReportExamValues,
  demoReportHomeworkLabels,
  demoReportHomeworkValues,
} from "../demoData";
import {
  ActionLine,
  CardSkeleton,
  ErrorState,
  PageHeader,
  ReportCard,
} from "../shared";
import type { Role } from "../types";

export type ReportsPageProps = {
  role: Role;
  isDemo?: boolean;
  attendanceWeeks?: AttendanceWeek[] | null;
  examAverages?: ExamAverage[] | null;
  homeworkWeeks?: HomeworkWeek[] | null;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
};

export function ReportsPage({
  role,
  isDemo = isDemoMode,
  attendanceWeeks,
  examAverages,
  homeworkWeeks,
  isLoading = false,
  error = null,
  onRetry,
}: ReportsPageProps) {
  const isTeacher = role === "teacher";
  const activeDemo = isDemoMode && isDemo;

  // Hafta aralığı alt başlığı: her iki haftalık fonksiyon (devam ve ödev)
  // aynı 4 takvim haftasını ölçer (v1.4-16 · #278 / K-06).
  const referenceWeeks = attendanceWeeks ?? homeworkWeeks;
  const weekSubtitle =
    !activeDemo && referenceWeeks && referenceWeeks.length > 0
      ? `${formatTrWeekLabel(referenceWeeks[0].weekStart)} – ${formatTrWeekLabel(
          referenceWeeks[referenceWeeks.length - 1].weekStart
        )} haftaları`
      : "Son 4 takvim haftası";

  // 1. Devam görünümü
  const attendanceValues: (number | undefined)[] = activeDemo
    ? demoReportAttendanceValues
    : attendanceWeeks
      ? attendanceWeeks.map(w => w.attendancePercent)
      : [];
  const attendanceLabels: string[] = activeDemo
    ? ["1. hf", "2. hf", "3. hf", "Bu hf"]
    : attendanceWeeks
      ? attendanceWeeks.map(w => formatTrWeekLabel(w.weekStart))
      : [];

  // 2. Deneme gelişimi: servis eksik alanlı satırları eler (R1-C / K-06)
  const examValues: (number | undefined)[] = activeDemo
    ? demoReportExamValues
    : examAverages && examAverages.length > 0
      ? examAverages.map(e => e.averagePercent)
      : [];
  const examLabels: string[] = activeDemo
    ? demoReportExamLabels
    : examAverages && examAverages.length > 0
      ? examAverages.map(e =>
          e.examName.length > 8 ? `${e.examName.slice(0, 7)}…` : e.examName
        )
      : [];
  const examSubtitle = isTeacher
    ? "Sınıflarınızın ortalaması"
    : "Kurum ortalaması";

  // 3. Ödev tamamlama
  const homeworkValues: (number | undefined)[] = activeDemo
    ? demoReportHomeworkValues
    : homeworkWeeks
      ? homeworkWeeks.map(w => w.completionPercent)
      : [];
  const homeworkLabels: string[] = activeDemo
    ? demoReportHomeworkLabels
    : homeworkWeeks
      ? homeworkWeeks.map(w => formatTrWeekLabel(w.weekStart))
      : [];

  const actions = activeDemo ? demoReportActions : [];

  return (
    <>
      <PageHeader
        eyebrow={isTeacher ? "Akademik içgörüler" : "Kurum içgörüleri"}
        title={isTeacher ? "Sınıf raporları" : "Kurum raporları"}
        description={
          isTeacher
            ? "Sınıflarınızın devam, deneme ve ödev tamamlama görünümünü izleyin."
            : "Akademik, devam ve operasyon görünümünü karar vermeyi kolaylaştıracak şekilde izleyin."
        }
      />
      {error ? (
        <ErrorState
          className="mt-6"
          title="Raporlar görüntülenemedi"
          message={
            error.message || "Rapor verileri yüklenirken bir hata oluştu."
          }
          onRetry={onRetry}
        />
      ) : isLoading ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <ReportCard
            title="Devam görünümü"
            subtitle={weekSubtitle}
            values={attendanceValues}
            labels={attendanceLabels}
            color="bg-emerald-500"
          />
          <ReportCard
            title="Deneme gelişimi"
            subtitle={examSubtitle}
            values={examValues}
            labels={examLabels}
            color="bg-violet-500"
          />
          <ReportCard
            title="Ödev tamamlama"
            subtitle={weekSubtitle}
            values={homeworkValues}
            labels={homeworkLabels}
            color="bg-blue-500"
          />
        </div>
      )}
      {actions.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
          <h2 className="font-display text-[17px] font-extrabold text-slate-900">
            Raporu aksiyona dönüştür
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Raporlar yalnızca izleme için değil, eğitim ekibinin bir sonraki
            adımını netleştirmek için kullanılmalıdır.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {actions.map(action => (
              <ActionLine
                key={action.title}
                title={action.title}
                detail={action.detail}
                icon={action.icon}
                tone={action.tone}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
