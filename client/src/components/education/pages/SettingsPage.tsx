import { RotateCcw, School, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../shared";

export function SettingsPage({
  onResetDemoData,
}: {
  onResetDemoData: () => void;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Kurum ayarları"
        title="Kurum ve erişim ayarları"
        description="Kurum profili, şube yapısı ve kullanıcı yetkileri ilerleyen fazlarda kalıcı olarak burada yönetilecek."
      />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <School className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-[14px] font-extrabold text-slate-900">
                Kurum profili
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                ORBIT Eğitim Kurumları · Çorlu Şube
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              toast.info("Kurum ayarları", {
                description:
                  "Kalıcı kurum ayarları veri tabanı fazında etkinleştirilecek.",
              })
            }
            className="mt-5 text-[11px] font-bold text-blue-600"
          >
            Düzenlemeyi planla
          </button>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-[14px] font-extrabold text-slate-900">
                Roller ve erişim
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Yönetici, öğretmen, öğrenci ve veli görünümü demo olarak etkin.
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              toast.info("Rol yönetimi", {
                description:
                  "Kurum, şube ve sınıf bazlı erişim kuralı MVP veri modelinde tanımlanmıştır.",
              })
            }
            className="mt-5 text-[11px] font-bold text-blue-600"
          >
            Yetkileri incele
          </button>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <RotateCcw className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-[14px] font-extrabold text-slate-900">
                Demo verileri
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Yoklama ve otomasyon durumları bu oturumda kalıcı tutulur.
              </p>
            </div>
          </div>
          <button
            onClick={onResetDemoData}
            className="mt-5 text-[11px] font-bold text-blue-600"
          >
            Demo Verilerini Sıfırla
          </button>
        </section>
      </div>
    </>
  );
}
