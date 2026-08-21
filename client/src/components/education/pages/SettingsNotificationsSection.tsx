import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

type NotificationKey =
  | "attendance"
  | "homeworkDue"
  | "parentContact"
  | "weeklyDigest";

const ROWS: { key: NotificationKey; title: string; description: string }[] = [
  {
    key: "attendance",
    title: "Devamsızlık bildirimleri",
    description: "Yoklamada işaretlenmeyen öğrenciler için anlık bildirim.",
  },
  {
    key: "homeworkDue",
    title: "Ödev teslim hatırlatmaları",
    description: "Teslim tarihi yaklaşan ödevler için hatırlatma.",
  },
  {
    key: "parentContact",
    title: "Veli iletişim bildirimleri",
    description: "Veliyle yeni bir görüşme/notu paylaşıldığında bildirim.",
  },
  {
    key: "weeklyDigest",
    title: "Haftalık özet e-postası",
    description: "Her Pazartesi devam ve akademik özet e-postası.",
  },
];

export function SettingsNotificationsSection() {
  const [values, setValues] = useState<Record<NotificationKey, boolean>>({
    attendance: true,
    homeworkDue: true,
    parentContact: true,
    weeklyDigest: false,
  });

  const save = () =>
    toast.success("Değişiklikler kaydedildi", {
      description: "Bildirim tercihleriniz bu oturumda güncellendi.",
    });

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[18px] font-extrabold text-slate-900">
          Bildirim Tercihleri
        </h2>
        <button
          onClick={save}
          className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 px-4 text-[11px] font-bold text-white shadow-[0_8px_16px_rgba(15,23,42,.12)] transition hover:bg-slate-800 active:scale-[.98]"
        >
          Değişiklikleri Kaydet
        </button>
      </div>
      <div className="mt-5 space-y-2.5">
        {ROWS.map(row => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-3"
          >
            <div className="min-w-0">
              <p className="text-[12px] font-extrabold text-slate-800">
                {row.title}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {row.description}
              </p>
            </div>
            <Switch
              checked={values[row.key]}
              onCheckedChange={checked =>
                setValues(current => ({ ...current, [row.key]: checked }))
              }
            />
          </div>
        ))}
      </div>
    </>
  );
}
