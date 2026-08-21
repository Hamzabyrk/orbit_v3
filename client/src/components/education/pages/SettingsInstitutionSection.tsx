import { useState } from "react";
import { toast } from "sonner";
import { SettingsFormField } from "./SettingsFormField";

export function SettingsInstitutionSection() {
  const [name, setName] = useState("ORBIT Eğitim Kurumları");
  const [branch, setBranch] = useState("Çorlu Şube");
  const [region, setRegion] = useState("Trakya pilotu");
  const [term, setTerm] = useState("2026–2027");

  const save = () =>
    toast.success("Değişiklikler kaydedildi", {
      description: "Kurum bilgileriniz bu oturumda güncellendi.",
    });

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[18px] font-extrabold text-slate-900">
          Kurum Tercihleri
        </h2>
        <button
          onClick={save}
          className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 px-4 text-[11px] font-bold text-white shadow-[0_8px_16px_rgba(15,23,42,.12)] transition hover:bg-slate-800 active:scale-[.98]"
        >
          Değişiklikleri Kaydet
        </button>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <SettingsFormField label="Kurum adı" value={name} onChange={setName} />
        <SettingsFormField label="Şube" value={branch} onChange={setBranch} />
        <SettingsFormField label="Bölge" value={region} onChange={setRegion} />
        <SettingsFormField label="Dönem" value={term} onChange={setTerm} />
      </div>
    </>
  );
}
