import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge, PageHeader } from "../shared";
import type { Automation } from "../types";

export function AutomationsPage({
  automations,
  setAutomations,
}: {
  automations: Automation[];
  setAutomations: React.Dispatch<React.SetStateAction<Automation[]>>;
}) {
  const toggle = (id: string) =>
    setAutomations(current =>
      current.map(item =>
        item.id === id ? { ...item, active: !item.active } : item
      )
    );
  return (
    <>
      <PageHeader
        eyebrow="Eğitim otomasyonları"
        title="Tekrarlayan takipleri sisteme bırakın."
        description="ORBIT, eğitim ekibinin yerini almaz; doğru kişiye doğru zamanda takip ve iletişim önerisi sunar."
        action="Yeni otomasyon"
        onAction={() =>
          toast.info("Otomasyon kataloğu", {
            description:
              "Yeni otomasyon şablonu ekleme, gerçek n8n bağlantısı fazında etkinleşecek.",
          })
        }
      />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {automations.map(automation => (
          <article
            key={automation.id}
            className="flex min-h-[255px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.025)]"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
                <Sparkles className="h-5 w-5" />
              </span>
              <button
                onClick={() => {
                  toggle(automation.id);
                  toast.success(
                    automation.active
                      ? "Otomasyon duraklatıldı"
                      : "Otomasyon etkinleştirildi",
                    { description: automation.title }
                  );
                }}
                className={`relative h-6 w-11 rounded-full transition ${automation.active ? "bg-emerald-500" : "bg-slate-200"}`}
                aria-label={`${automation.title} durumunu değiştir`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${automation.active ? "left-6" : "left-1"}`}
                />
              </button>
            </div>
            <div className="mt-5">
              <Badge tone="violet">{automation.category}</Badge>
              <h2 className="mt-3 text-[15px] font-extrabold tracking-[-.025em] text-slate-900">
                {automation.title}
              </h2>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                {automation.description}
              </p>
            </div>
            <div className="mt-auto border-t border-slate-100 pt-3">
              <p className="text-[10px] font-semibold text-slate-500">
                Tetikleyici:{" "}
                <span className="font-medium text-slate-400">
                  {automation.trigger}
                </span>
              </p>
              <p className="mt-1 text-[10px] font-bold text-emerald-700">
                {automation.impact}
              </p>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
