import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ClipboardCheck,
} from "lucide-react";
import { ActionLine, PageHeader, StatCard } from "../shared";
import type { Section } from "../types";

export function StudentDashboard({
  onNavigate,
}: {
  onNavigate: (section: Section) => void;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Kişisel çalışma alanı"
        title="Merhaba Zeynep, bugün planın hazır."
        description="Derslerini, ödevlerini ve sınav hedeflerini tek bakışta takip et."
        action="Ders programım"
        onAction={() => onNavigate("Ders Programı")}
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Bugünkü ders"
          value="2"
          detail="İlk ders 09:00"
          icon={CalendarDays}
        />
        <StatCard
          label="Tamamlanan ödev"
          value="8/9"
          detail="Bu hafta"
          icon={Check}
          tone="green"
        />
        <StatCard
          label="Son deneme"
          value="84"
          detail="+6 puan gelişim"
          icon={BarChart3}
          tone="violet"
        />
        <StatCard
          label="Devam"
          value="%96"
          detail="Bu dönem"
          icon={ClipboardCheck}
          tone="blue"
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-display text-[17px] font-extrabold text-slate-900">
            Sıradaki adımlar
          </h2>
          <div className="mt-4 space-y-3">
            <ActionLine
              title="TYT Matematik"
              detail="09:00 · Derslik 204"
              icon={BookOpen}
              tone="blue"
            />
            <ActionLine
              title="Problem Seti 04"
              detail="Teslim için 1 gün kaldı"
              icon={ClipboardCheck}
              tone="amber"
            />
            <ActionLine
              title="Deneme sonucu"
              detail="Sözel mantıkta gelişim notunu incele"
              icon={BarChart3}
              tone="violet"
            />
          </div>
        </section>
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-emerald-700">
            Bu hafta
          </p>
          <h2 className="mt-2 text-[18px] font-extrabold tracking-[-.04em] text-emerald-950">
            Hedefine sakin ve düzenli ilerliyorsun.
          </h2>
          <p className="mt-2 text-[11px] leading-5 text-emerald-800">
            Son denemede problem çözme alanında 6 puan gelişim var. Bir sonraki
            odak alanın geometri.
          </p>
        </section>
      </div>
    </>
  );
}
