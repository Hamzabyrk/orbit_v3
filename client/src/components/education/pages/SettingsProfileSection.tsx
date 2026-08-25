import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/auth/useAuth";
import {
  loadProfileContact,
  saveProfilePhone,
} from "@/auth/profileContactService";
import { roleMeta } from "../roleMeta";
import { roleEmail } from "../demoData";
import type { Role } from "../types";
import { SettingsFormField } from "./SettingsFormField";

export function SettingsProfileSection({ role }: { role: Role }) {
  const { identity, demoMode } = useAuth();
  const [phone, setPhone] = useState(demoMode ? "+90 555 123 45 67" : "");
  const [recoveryEmail, setRecoveryEmail] = useState(
    demoMode ? roleEmail[role] : ""
  );
  const [loading, setLoading] = useState(!demoMode);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const displayName = demoMode
    ? roleMeta[role].name
    : (identity?.displayName ?? "");

  useEffect(() => {
    if (demoMode) return;

    let active = true;
    setLoading(true);
    setLoadError(null);

    void loadProfileContact()
      .then(contact => {
        if (!active) return;
        setPhone(contact?.phone ?? "");
        setRecoveryEmail(contact?.recoveryEmail ?? "");
      })
      .catch(error => {
        if (!active) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Profil iletişim bilgileri yüklenemedi."
        );
        setPhone("");
        setRecoveryEmail("");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [demoMode]);

  const save = async () => {
    if (demoMode) {
      toast.success("Değişiklikler kaydedildi", {
        description: "Profil bilgileriniz bu oturumda güncellendi.",
      });
      return;
    }

    setSaving(true);
    try {
      await saveProfilePhone(phone.trim() || null);
      toast.success("Değişiklikler kaydedildi", {
        description: "Telefon bilginiz güncellendi.",
      });
    } catch (error) {
      toast.error("Değişiklikler kaydedilemedi", {
        description:
          error instanceof Error ? error.message : "Lütfen tekrar deneyin.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[18px] font-extrabold text-slate-900">
          Profil Tercihleri
        </h2>
        <button
          onClick={() => void save()}
          disabled={loading || saving || Boolean(loadError)}
          className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 px-4 text-[11px] font-bold text-white shadow-[0_8px_16px_rgba(15,23,42,.12)] transition hover:bg-slate-800 active:scale-[.98]"
        >
          {saving ? "Kaydediliyor" : "Değişiklikleri Kaydet"}
        </button>
      </div>
      {loadError ? (
        <p className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-[11px] leading-5 text-rose-800">
          {loadError}
        </p>
      ) : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <SettingsFormField label="Ad Soyad" value={displayName} disabled />
        <SettingsFormField label="Telefon" value={phone} onChange={setPhone} />
        <div>
          <SettingsFormField
            label="Kurtarma e-postası"
            value={recoveryEmail}
            disabled
            type="email"
          />
          <p className="mt-1.5 text-[10px] leading-4 text-slate-400">
            Kurtarma adresi doğrulama ile eklenir; bu özellik yakında gelecek.
          </p>
        </div>
        <SettingsFormField label="Rol" value={roleMeta[role].label} disabled />
      </div>
      {/* `loading` koşulu, veri gelmeden uyarı gösterilmesini engelliyor:
          aksi halde kurtarma adresi OLAN biri de bir an "yöntemin yok"
          okurdu. Yükleme başarısız olursa `loading` düşer ve `recoveryEmail`
          boş kalır — yani uyarı görünür, ki bilinmeyende doğru taraf odur. */}
      {!demoMode && !loading && !recoveryEmail.trim() ? (
        <p className="mt-5 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-[11px] leading-5 text-amber-900">
          Kurtarma yöntemin yok — şifreni unutursan kurum yöneticine başvurman
          gerekir.
        </p>
      ) : null}
    </>
  );
}
