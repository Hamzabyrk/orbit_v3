import { useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SettingsFormField } from "./SettingsFormField";

const DATE_FORMATS = ["DD.MM.YYYY", "YYYY-MM-DD", "DD MMM YYYY"];

export function SettingsSystemSection() {
  const [term, setTerm] = useState("2026–2027");
  const [branch, setBranch] = useState("Çorlu Şube");
  const [dateFormat, setDateFormat] = useState(DATE_FORMATS[0]);

  const save = () =>
    toast.success("Değişiklikler kaydedildi", {
      description: "Sistem varsayımlarınız bu oturumda güncellendi.",
    });

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[18px] font-extrabold text-slate-900">
          Sistem Tercihleri
        </h2>
        <button
          onClick={save}
          className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 px-4 text-[11px] font-bold text-white shadow-[0_8px_16px_rgba(15,23,42,.12)] transition hover:bg-slate-800 active:scale-[.98]"
        >
          Değişiklikleri Kaydet
        </button>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <SettingsFormField
          label="Akademik dönem"
          value={term}
          onChange={setTerm}
        />
        <SettingsFormField
          label="Varsayılan şube"
          value={branch}
          onChange={setBranch}
        />
        <div>
          <Label className="text-[10px] font-extrabold uppercase tracking-[.06em] text-slate-400">
            Tarih biçimi
          </Label>
          <Select value={dateFormat} onValueChange={setDateFormat}>
            <SelectTrigger className="mt-1.5 h-9 w-full text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map(format => (
                <SelectItem key={format} value={format}>
                  {format}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}
