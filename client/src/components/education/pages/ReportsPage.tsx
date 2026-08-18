import { BookOpen, ClipboardCheck, UserRoundCheck } from "lucide-react";
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
          values={[92, 94, 90, 93]}
          labels={["1. hf", "2. hf", "3. hf", "Bu hf"]}
          color="bg-emerald-500"
        />
        <ReportCard
          title="Deneme gelişimi"
          subtitle="TYT kurum ortalaması"
          values={[68, 71, 69, 72]}
          labels={["D-03", "D-04", "D-05", "D-06"]}
          color="bg-violet-500"
        />
        <ReportCard
          title="Ödev tamamlama"
          subtitle="Aktif gruplar"
          values={[78, 82, 86, 84]}
          labels={["May", "Haz", "Tem", "Ağu"]}
          color="bg-blue-500"
        />
      </div>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
        <h2 className="font-display text-[17px] font-extrabold text-slate-900">
          Raporu aksiyona dönüştür
        </h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Raporlar yalnızca izleme için değil, eğitim ekibinin bir sonraki
          adımını netleştirmek için kullanılmalıdır.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <ActionLine
            title="YKS 12-B"
            detail="Geometri etüdü önerildi"
            icon={BookOpen}
            tone="amber"
          />
          <ActionLine
            title="Devam sinyali"
            detail="2 öğrenci için veli bildirimi"
            icon={ClipboardCheck}
            tone="rose"
          />
          <ActionLine
            title="Kayıt dönüşümü"
            detail="4 aday için takip görevi"
            icon={UserRoundCheck}
            tone="blue"
          />
        </div>
      </section>
    </>
  );
}
