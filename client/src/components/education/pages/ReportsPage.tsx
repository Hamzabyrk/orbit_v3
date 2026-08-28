import {
  reportActions,
  reportAttendanceLabels,
  reportAttendanceValues,
  reportExamLabels,
  reportExamValues,
  reportHomeworkLabels,
  reportHomeworkValues,
} from "../educationData";
import { ActionLine, PageHeader, ReportCard } from "../shared";
import type { Role } from "../types";

export function ReportsPage({ role }: { role: Role }) {
  return (
    <>
      <PageHeader
        eyebrow="Kurum içgörüleri"
        title={role === "teacher" ? "Sınıf raporları" : "Kurum raporları"}
        description="Akademik, devam ve operasyon görünümünü karar vermeyi kolaylaştıracak şekilde izleyin."
      />
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <ReportCard
          title="Devam görünümü"
          subtitle="Son 4 hafta"
          values={reportAttendanceValues}
          labels={reportAttendanceLabels}
          color="bg-emerald-500"
        />
        <ReportCard
          title="Deneme gelişimi"
          subtitle="TYT kurum ortalaması"
          values={reportExamValues}
          labels={reportExamLabels}
          color="bg-violet-500"
        />
        <ReportCard
          title="Ödev tamamlama"
          subtitle="Aktif gruplar"
          values={reportHomeworkValues}
          labels={reportHomeworkLabels}
          color="bg-blue-500"
        />
      </div>
      {reportActions.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
          <h2 className="font-display text-[17px] font-extrabold text-slate-900">
            Raporu aksiyona dönüştür
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Raporlar yalnızca izleme için değil, eğitim ekibinin bir sonraki
            adımını netleştirmek için kullanılmalıdır.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {reportActions.map(action => (
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
