import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const TIMEOUTS = ["15 dakika", "30 dakika", "1 saat", "4 saat"];

export function SettingsSecuritySection() {
  const [timeout_, setTimeout_] = useState(TIMEOUTS[1]);
  const [twoFactor, setTwoFactor] = useState(false);
  const [newDeviceAlerts, setNewDeviceAlerts] = useState(true);

  const save = () =>
    toast.success("Değişiklikler kaydedildi", {
      description: "Güvenlik tercihleriniz bu oturumda güncellendi.",
    });

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[18px] font-extrabold text-slate-900">
          Güvenlik Tercihleri
        </h2>
        <button
          onClick={save}
          className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 px-4 text-[11px] font-bold text-white shadow-[0_8px_16px_rgba(15,23,42,.12)] transition hover:bg-slate-800 active:scale-[.98]"
        >
          Değişiklikleri Kaydet
        </button>
      </div>
      <div className="mt-5 max-w-xs">
        <Label className="text-[10px] font-extrabold uppercase tracking-[.06em] text-slate-400">
          Oturum zaman aşımı
        </Label>
        <Select value={timeout_} onValueChange={setTimeout_}>
          <SelectTrigger className="mt-1.5 h-9 w-full text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEOUTS.map(option => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mt-4 space-y-2.5">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-3">
          <div>
            <p className="text-[12px] font-extrabold text-slate-800">
              İki aşamalı doğrulama
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Girişte ikinci doğrulama adımı iste.
            </p>
          </div>
          <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-3">
          <div>
            <p className="text-[12px] font-extrabold text-slate-800">
              Yeni cihaz bildirimleri
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Farklı bir cihazdan giriş yapıldığında bildirim gönder.
            </p>
          </div>
          <Switch
            checked={newDeviceAlerts}
            onCheckedChange={setNewDeviceAlerts}
          />
        </div>
      </div>
      <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-[10px] leading-5 text-amber-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Bu tercihler yerel demo davranışını temsil eder; gerçek Supabase
          Auth ve oturum güvenliği <strong>.ai/ROADMAP.md</strong> Aşama 3
          kapsamında kalıcı veri tabanı fazında aktifleşecek.
        </span>
      </p>
    </>
  );
}
