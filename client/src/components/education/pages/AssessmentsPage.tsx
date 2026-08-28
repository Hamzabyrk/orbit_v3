import { toast } from "sonner";
import { useAuth } from "@/auth/useAuth";
import {
  assessmentFollowUp,
  assessmentHeaderInfo,
  assessmentStatsByRole,
  assessmentSubjects,
} from "../educationData";
import { Badge, EmptyState, PageHeader, StatCard } from "../shared";
import type { Role, Section } from "../types";

export function AssessmentsPage({
  role,
  onNavigate,
}: {
  role: Role;
  onNavigate: (section: Section) => void;
}) {
  const { identity } = useAuth();
  const isPersonal = role === "student" || role === "parent";
  const stats = isPersonal
    ? assessmentStatsByRole.personal
    : assessmentStatsByRole.institution;

  const studentName = identity?.displayName?.trim()
    ? identity.displayName.trim().split(" ")[0]
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Ölçme ve değerlendirme"
        title={isPersonal ? "Akademik gelişim" : "Sınavlar ve başarı"}
        description={
          isPersonal
            ? "Son denemeler ve konu bazlı gelişim sinyalleri."
            : "Deneme sonuçları, sınıf görünümü ve takip önerileri."
        }
        action={
          role === "admin" || role === "teacher" ? "Sonuç gir" : undefined
        }
        onAction={
          role === "admin" || role === "teacher"
            ? () =>
                toast.info("Sonuç girişi", {
                  description:
                    "Demo MVP’de sonuç girişi ekranı değerlendirme veri modelinin sonraki adımıdır.",
                })
            : undefined
        }
      />
      <div
        className={`mt-6 grid gap-6 ${
          assessmentFollowUp ? "xl:grid-cols-[1.25fr_.75fr]" : ""
        }`}
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-[17px] font-extrabold text-slate-900">
                {assessmentHeaderInfo?.title ?? "Değerlendirme özeti"}
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                {assessmentHeaderInfo
                  ? `${assessmentHeaderInfo.date} · ${
                      isPersonal
                        ? (studentName ?? assessmentHeaderInfo.studentName)
                        : assessmentHeaderInfo.participantSummary
                    }`
                  : "Henüz yayınlanmış bir değerlendirme kaydı bulunmuyor."}
              </p>
            </div>
            {assessmentHeaderInfo?.statusBadge ? (
              <Badge tone="green">{assessmentHeaderInfo.statusBadge}</Badge>
            ) : null}
          </div>
          {stats.length > 0 ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {stats.map(stat => (
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
          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <p className="text-[11px] font-extrabold text-slate-700">
              Konu bazlı görünüm
            </p>
            {assessmentSubjects.length === 0 ? (
              <div className="mt-3">
                <EmptyState title="Konu bazlı değerlendirme verisi yok" />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {assessmentSubjects.map(item => (
                  <div key={item.label}>
                    <div className="mb-1 flex justify-between text-[10px] font-bold">
                      <span className="text-slate-600">{item.label}</span>
                      <span className="text-slate-400">{item.value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white">
                      <span
                        style={{ width: `${item.value}%` }}
                        className={`block h-full rounded-full ${item.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        {assessmentFollowUp ? (
          <section className="rounded-2xl border border-amber-100 bg-amber-50/55 p-5">
            <h2 className="text-[15px] font-extrabold text-amber-900">
              Takip önerisi
            </h2>
            <p className="mt-2 text-[11px] leading-5 text-amber-800">
              {isPersonal
                ? assessmentFollowUp.personalNote
                : assessmentFollowUp.institutionNote}
            </p>
            {!isPersonal && (
              <button
                onClick={() => onNavigate("İletişim")}
                className="mt-4 text-[11px] font-bold text-amber-800 underline underline-offset-4"
              >
                Veli bilgilendirmesi oluştur
              </button>
            )}
          </section>
        ) : null}
      </div>
    </>
  );
}
