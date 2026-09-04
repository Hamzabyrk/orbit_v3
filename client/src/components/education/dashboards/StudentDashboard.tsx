import { useAuth } from "@/auth/useAuth";
import {
  studentActionSteps,
  studentOverviewStats,
  studentWeeklyNote,
} from "../educationData";
import { ActionLine, EmptyState, PageHeader, StatCard } from "../shared";
import type { Section } from "../types";

export function StudentDashboard({
  onNavigate,
}: {
  onNavigate: (section: Section) => void;
}) {
  const { identity } = useAuth();
  const studentName = identity?.displayName?.trim()
    ? identity.displayName.trim().split(" ")[0]
    : null;
  const title = studentName
    ? `Merhaba ${studentName}, bugün planınız hazır.`
    : "Merhaba, bugün planınız hazır.";

  return (
    <>
      <PageHeader
        eyebrow="Kişisel çalışma alanı"
        title={title}
        description="Derslerinizi, ödevlerinizi ve sınav hedeflerinizi tek bakışta takip edin."
        action="Ders programım"
        actionKind="navigate"
        onAction={() => onNavigate("Ders Programı")}
      />
      {studentOverviewStats.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {studentOverviewStats.map(stat => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              detail={stat.detail}
              icon={stat.icon}
              tone={stat.tone}
            />
          ))}
        </div>
      ) : null}
      <div
        className={`mt-6 grid gap-6 ${
          studentWeeklyNote ? "xl:grid-cols-[1.3fr_.9fr]" : ""
        }`}
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-display text-[17px] font-extrabold text-slate-900">
            Sıradaki adımlar
          </h2>
          <div className="mt-4 space-y-3">
            {studentActionSteps.length === 0 ? (
              <EmptyState title="Sırada bekleyen adım yok" />
            ) : null}
            {studentActionSteps.map(step => (
              <ActionLine
                key={step.title}
                title={step.title}
                detail={step.detail}
                icon={step.icon}
                tone={step.tone}
              />
            ))}
          </div>
        </section>
        {studentWeeklyNote ? (
          <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-emerald-700">
              {studentWeeklyNote.tag}
            </p>
            <h2 className="mt-2 text-[18px] font-extrabold tracking-[-.04em] text-emerald-950">
              {studentWeeklyNote.title}
            </h2>
            <p className="mt-2 text-[11px] leading-5 text-emerald-800">
              {studentWeeklyNote.description}
            </p>
          </section>
        ) : null}
      </div>
    </>
  );
}
