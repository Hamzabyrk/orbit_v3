import { useState } from "react";
import { toast } from "sonner";
import { roleEmail, roleMeta } from "../mockData";
import type { Role } from "../types";
import { SettingsFormField } from "./SettingsFormField";

export function SettingsProfileSection({ role }: { role: Role }) {
  const [name, setName] = useState(roleMeta[role].name);
  const [email, setEmail] = useState(roleEmail[role]);
  const [phone, setPhone] = useState("+90 555 123 45 67");

  const save = () =>
    toast.success("Değişiklikler kaydedildi", {
      description: "Profil bilgileriniz bu oturumda güncellendi.",
    });

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[18px] font-extrabold text-slate-900">
          Profil Tercihleri
        </h2>
        <button
          onClick={save}
          className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 px-4 text-[11px] font-bold text-white shadow-[0_8px_16px_rgba(15,23,42,.12)] transition hover:bg-slate-800 active:scale-[.98]"
        >
          Değişiklikleri Kaydet
        </button>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <SettingsFormField label="Ad Soyad" value={name} onChange={setName} />
        <SettingsFormField
          label="E-posta"
          value={email}
          onChange={setEmail}
          type="email"
        />
        <SettingsFormField label="Telefon" value={phone} onChange={setPhone} />
        <SettingsFormField label="Rol" value={roleMeta[role].label} disabled />
      </div>
    </>
  );
}
