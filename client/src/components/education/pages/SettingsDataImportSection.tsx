import { useState, type DragEvent } from "react";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";

export function SettingsDataImportSection() {
  const [isDragging, setIsDragging] = useState(false);

  const notifyFilePicked = (fileName: string) =>
    toast.info("Veri içe aktarma", {
      description: `"${fileName}" seçildi. Önizleme ve alan eşleme bir sonraki kalıcı veri fazında aktifleşecek.`,
    });

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) notifyFilePicked(file.name);
  };

  return (
    <>
      <h2 className="font-display text-[18px] font-extrabold text-slate-900">
        Veri İçe Aktarma
      </h2>
      <p className="mt-1 text-[11px] text-slate-500">
        Eski öğrenci, sınıf ve program kayıtlarınızı ORBIT'e aktarın.
      </p>
      <label
        onDragEnter={event => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={event => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-10 text-center transition ${
          isDragging
            ? "border-blue-400 bg-blue-50"
            : "border-slate-200 bg-slate-50/50 hover:border-blue-300 hover:bg-blue-50/40"
        }`}
      >
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-600">
          <UploadCloud className="h-6 w-6" />
        </span>
        <p className="text-[13px] font-extrabold text-slate-800">
          Dosya seç veya sürükle-bırak
        </p>
        <p className="text-[10px] text-slate-400">
          Desteklenen formatlar: CSV, Excel (.xlsx, .xls)
        </p>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          className="sr-only"
          onChange={event => {
            const file = event.target.files?.[0];
            if (file) notifyFilePicked(file.name);
            event.target.value = "";
          }}
        />
      </label>
    </>
  );
}
