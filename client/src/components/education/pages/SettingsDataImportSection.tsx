import { AlertTriangle, UploadCloud } from "lucide-react";

export function SettingsDataImportSection() {
  return (
    <>
      <h2 className="font-display text-[18px] font-extrabold text-slate-900">
        Veri İçe Aktarma
      </h2>
      <p className="mt-1 text-[11px] text-slate-500">
        Eski öğrenci, sınıf ve program kayıtlarınızı ORBIT'e aktarın.
      </p>
      <div className="mt-5 flex cursor-not-allowed flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center opacity-60">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-400">
          <UploadCloud className="h-6 w-6" />
        </span>
        <p className="text-[13px] font-extrabold text-slate-600">
          Dosya seç veya sürükle-bırak
        </p>
        <p className="text-[10px] text-slate-400">
          Desteklenen formatlar: CSV, Excel (.xlsx, .xls)
        </p>
        <input
          type="file"
          disabled
          accept=".csv,.xlsx,.xls"
          className="sr-only"
        />
      </div>
      <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] leading-5 text-slate-600">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <span>
          <strong>Toplu veri aktarımı henüz aktif değildir.</strong> Toplu
          aktarım ve alan eşleme altyapısı v1.7 sürümünde kullanıma açılacaktır;
          bu alana yüklenen veya bırakılan dosyalar işlenmez ve kaydedilmez.
        </span>
      </p>
    </>
  );
}
