import {
  schedule,
  teacherFollowUpItems,
  teacherOverviewStats,
} from "../educationData";
import { EmptyState, PageHeader, StatCard } from "../shared";
import type { Section } from "../types";

export function TeacherDashboard({
  onNavigate,
}: {
  onNavigate: (section: Section) => void;
}) {
  const visibleSchedule = schedule.filter(
    item => item.teacher === "Merve Karaca" || item.teacher === "Seda Kılıç"
  );

  return (
    <>
      <PageHeader
        eyebrow="Öğretmen çalışma alanı"
        title="Bugün sınıflarınızla ilerleyin."
        description="Ders programı, yoklama ve takip gerektiren öğrenciler burada."
        action="Yoklama al"
        onAction={() => onNavigate("Yoklama")}
      />
      {teacherOverviewStats.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {teacherOverviewStats.map(stat => (
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
          teacherFollowUpItems.length > 0 ? "xl:grid-cols-[1.3fr_.9fr]" : ""
        }`}
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-display text-[17px] font-extrabold text-slate-900">
            Bugünün dersleri
          </h2>
          <div className="mt-4 space-y-3">
            {visibleSchedule.length === 0 ? (
              <EmptyState title="Bugün ders programınız görünmüyor" />
            ) : null}
            {visibleSchedule.map(item => (
              <div
                key={item.time}
                className="flex gap-3 rounded-xl border border-slate-100 p-3.5"
              >
                <span className="text-[12px] font-extrabold text-slate-600">
                  {item.time}
                </span>
                <div>
                  <p className="text-[12px] font-bold text-slate-800">
                    {item.title} · {item.group}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {item.room} · Yoklama ders başlangıcında açılacak
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
        {teacherFollowUpItems.length > 0 ? (
          <section className="rounded-2xl border border-amber-100 bg-amber-50/55 p-5">
            <h2 className="text-[15px] font-extrabold text-amber-900">
              Takip önerileri
            </h2>
            <div className="mt-3 space-y-3 text-[11px] text-amber-900">
              {teacherFollowUpItems.map(item => (
                <p key={item.id}>
                  <strong>{item.student}:</strong> {item.note}
                </p>
              ))}
            </div>
            <button
              onClick={() => onNavigate("Öğrenciler")}
              className="mt-4 text-[11px] font-bold text-amber-800 underline underline-offset-4"
            >
              Öğrenci profillerini aç
            </button>
          </section>
        ) : null}
      </div>
    </>
  );
}
