import { toast } from "sonner";
import { useAuth } from "@/auth/useAuth";
import { SettingsFormField } from "./SettingsFormField";

export function SettingsInstitutionSection() {
  const { identity } = useAuth();
  const name = identity?.membership?.organizationName ?? "";
  const branch = identity?.membership?.branchName ?? "Kurum geneli";

  const save = () =>
    toast.info("Kurum tercihleri salt okunur", {
      description:
        "Kurum ve şube bilgileri organizasyon üyeliğinizden okunmaktadır; panelden düzenleme sonraki sürümdedir.",
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
      {/* Alanlar salt okunur: değerler üyelikten geliyor ve panelden yazılmıyor.
          Yazılabilir bırakılıp "salt okunur" denseydi ekran kendi kendisiyle
          çelişirdi — kullanıcı düzeltir, kaydeder, hiçbir şey olmazdı. */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <SettingsFormField label="Kurum adı" value={name} disabled />
        <SettingsFormField label="Şube" value={branch} disabled />
      </div>
    </>
  );
}
