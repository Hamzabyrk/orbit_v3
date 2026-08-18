import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  FileText,
  MessageSquare,
  WalletCards,
} from "lucide-react";
import { ActionLine, Badge, PageHeader, StatCard } from "../shared";
import type { Section } from "../types";

export function ParentDashboard({
  onNavigate,
}: {
  onNavigate: (section: Section) => void;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Veli takip alanı"
        title="Zeynep’in haftası dengede ilerliyor."
        description="Devam, ders programı, akademik gelişim ve ödeme bilgilerini sade biçimde takip edin."
        action="Öğrenci programı"
        onAction={() => onNavigate("Ders Programı")}
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Devam"
          value="%96"
          detail="Bu dönem"
          icon={ClipboardCheck}
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
          label="Yaklaşan ders"
          value="09:00"
          detail="TYT Matematik"
          icon={CalendarDays}
        />
        <StatCard
          label="Ödeme planı"
          value="Güncel"
          detail="Sonraki taksit 5 Eylül"
          icon={WalletCards}
          tone="green"
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-display text-[17px] font-extrabold text-slate-900">
            Son gelişim özeti
          </h2>
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-extrabold text-slate-800">
                  TYT Deneme 06
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  14 Ağustos 2026 · Sınıf ortalamasının üzerinde
                </p>
              </div>
              <Badge tone="green">84 puan</Badge>
            </div>
            <p className="mt-4 text-[11px] leading-5 text-slate-600">
              Zeynep’in problem çözme performansında düzenli gelişim görülüyor.
              Geometri alanında öğretmen tarafından ek çalışma önerildi.
            </p>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-display text-[17px] font-extrabold text-slate-900">
            İletişim ve duyurular
          </h2>
          <div className="mt-4 space-y-3">
            <ActionLine
              title="Veli görüşmesi"
              detail="20 Ağustos · 15:30 önerildi"
              icon={MessageSquare}
              tone="violet"
            />
            <ActionLine
              title="Deneme analiz dosyası"
              detail="İncelemeye hazır"
              icon={FileText}
              tone="blue"
            />
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
