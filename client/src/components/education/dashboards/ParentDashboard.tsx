import { useAuth } from "@/auth/useAuth";
import {
  parentCommunicationItems,
  parentOverviewStats,
  parentProgressSummary,
} from "../educationData";
import { ActionLine, Badge, EmptyState, PageHeader, StatCard } from "../shared";
import type { Section } from "../types";

export function ParentDashboard({
  onNavigate,
}: {
  onNavigate: (section: Section) => void;
}) {
  const { identity } = useAuth();
  const parentName = identity?.displayName?.trim()
    ? identity.displayName.trim().split(" ")[0]
    : null;
  const title = parentName
    ? `Merhaba ${parentName}, haftalık takip özeti hazır.`
    : "Haftalık takip özeti hazır.";

  return (
    <>
      <PageHeader
        eyebrow="Veli takip alanı"
        title={title}
        description="Devam, ders programı, akademik gelişim ve ödeme bilgilerini sade biçimde takip edin."
        action="Öğrenci programı"
        actionKind="navigate"
        onAction={() => onNavigate("Ders Programı")}
      />
      {parentOverviewStats.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {parentOverviewStats.map(stat => (
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
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-display text-[17px] font-extrabold text-slate-900">
            Son gelişim özeti
          </h2>
          {parentProgressSummary ? (
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-extrabold text-slate-800">
                    {parentProgressSummary.examTitle}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {parentProgressSummary.examDate} ·{" "}
                    {parentProgressSummary.examComparison}
                  </p>
                </div>
                <Badge tone="green">{parentProgressSummary.scoreBadge}</Badge>
              </div>
              <p className="mt-4 text-[11px] leading-5 text-slate-600">
                {parentProgressSummary.note}
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState title="Gelişim özeti bulunmuyor" />
            </div>
          )}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-display text-[17px] font-extrabold text-slate-900">
            İletişim ve duyurular
          </h2>
          <div className="mt-4 space-y-3">
            {parentCommunicationItems.length === 0 ? (
              <EmptyState title="Gösterilecek mesaj yok" />
            ) : null}
            {parentCommunicationItems.map(item => (
              <ActionLine
                key={item.title}
                title={item.title}
                detail={item.detail}
                icon={item.icon}
                tone={item.tone}
              />
            ))}
          </div>
          <button
            onClick={() => onNavigate("İletişim")}
            className="mt-4 text-[11px] font-bold text-blue-600"
          >
            Tüm mesajları aç
          </button>
        </section>
      </div>
    </>
  );
}
