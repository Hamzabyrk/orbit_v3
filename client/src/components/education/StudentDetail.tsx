import { BarChart3, ClipboardCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Badge, StatCard } from "./shared";
import type { Student } from "./types";

export function StudentDetail({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${student.name} öğrenci profili`}
    >
      <button
        onClick={onClose}
        aria-label="Profili kapat"
        className="absolute inset-0"
      />
      <aside className="relative h-full w-full max-w-[480px] overflow-y-auto bg-white p-6 shadow-2xl sm:rounded-2xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3 pr-10">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-[14px] font-extrabold text-blue-700">
            {student.name
              .split(" ")
              .map(word => word[0])
              .join("")}
          </span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-blue-600">
              Öğrenci profili
            </p>
            <h2 className="mt-1 font-display text-[22px] font-extrabold tracking-[-.04em] text-slate-900">
              {student.name}
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              {student.group} · {student.code}
            </p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <StatCard
            label="Devam"
            value={`%${student.attendance}`}
            detail="Bu dönem"
            icon={ClipboardCheck}
            tone={student.attendance < 90 ? "amber" : "green"}
          />
          <StatCard
            label="Son sınav"
            value={String(student.score)}
            detail="TYT Deneme 06"
            icon={BarChart3}
            tone="violet"
          />
        </div>
        <section className="mt-6 rounded-xl border border-slate-200 p-4">
          <h3 className="text-[12px] font-extrabold text-slate-800">
            Takip özeti
          </h3>
          <div className="mt-3 space-y-3 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Veli</span>
              <span className="font-bold text-slate-700">{student.parent}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Ödev tamamlama</span>
              <span className="font-bold text-slate-700">
                {student.homework}/9
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Ödeme durumu</span>
              <Badge tone={student.payment === "Güncel" ? "green" : "amber"}>
                {student.payment}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Akademik sinyal</span>
              <Badge tone={student.risk === "Dengeli" ? "green" : "amber"}>
                {student.risk}
              </Badge>
            </div>
          </div>
        </section>
        <section className="mt-4 rounded-xl border border-blue-100 bg-blue-50/55 p-4">
          <p className="text-[11px] font-extrabold text-blue-900">Son not</p>
          <p className="mt-1 text-[11px] leading-5 text-blue-800">
            Geometri konusunda düzenli tekrar önerildi. Veli görüşmesi için 20
            Ağustos tarihinde uygun slot bulundu.
          </p>
          <button
            onClick={() =>
              toast.info("Veli görüşmesi taslağı henüz kaydedilmiyor", {
                description:
                  "İletişim kuyruğu altyapısı bir sonraki aşamada kurulacaktır; şu an bir taslak oluşturulmadı.",
              })
            }
            className="mt-3 text-[11px] font-bold text-blue-700 underline underline-offset-4"
          >
            Veli görüşmesi öner
          </button>
        </section>
      </aside>
    </div>
  );
}
