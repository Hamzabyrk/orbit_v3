import { Activity, BarChart3, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Badge, PageHeader, StatCard } from "../shared";
import type { Role, Section } from "../types";

export function AssessmentsPage({
  role,
  onNavigate,
}: {
  role: Role;
  onNavigate: (section: Section) => void;
}) {
  const isPersonal = role === "student" || role === "parent";
  return (
    <>
      <PageHeader
        eyebrow="Ölçme ve değerlendirme"
        title={isPersonal ? "Akademik gelişim" : "Sınavlar ve başarı"}
        description={
          isPersonal
            ? "Son denemeler ve konu bazlı gelişim sinyalleri."
            : "Deneme sonuçları, sınıf görünümü ve takip önerileri."
        }
        action={
          role === "admin" || role === "teacher" ? "Sonuç gir" : undefined
        }
        onAction={
          role === "admin" || role === "teacher"
            ? () =>
                toast.info("Sonuç girişi", {
                  description:
                    "Demo MVP’de sonuç girişi ekranı değerlendirme veri modelinin sonraki adımıdır.",
                })
            : undefined
        }
      />
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-[17px] font-extrabold text-slate-900">
                TYT Deneme 06
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                14 Ağustos 2026 · {isPersonal ? "Zeynep Kaya" : "54 öğrenci"}
              </p>
            </div>
            <Badge tone="green">Yayınlandı</Badge>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatCard
              label={isPersonal ? "Puan" : "Kurum ortalaması"}
              value={isPersonal ? "84" : "72"}
              detail="100 üzerinden"
              icon={BarChart3}
              tone="violet"
            />
            <StatCard
              label="Gelişim"
              value="+6"
              detail="Önceki denemeye göre"
              icon={Activity}
              tone="green"
            />
            <StatCard
              label="Odak alanı"
              value="Geometri"
              detail="Ek çalışma önerildi"
              icon={BookOpen}
              tone="amber"
            />
          </div>
          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <p className="text-[11px] font-extrabold text-slate-700">
              Konu bazlı görünüm
            </p>
            <div className="mt-4 space-y-3">
              {[
                { label: "Matematik", value: 82, color: "bg-blue-500" },
                { label: "Türkçe", value: 88, color: "bg-emerald-500" },
                { label: "Fen", value: 71, color: "bg-violet-500" },
                { label: "Geometri", value: 62, color: "bg-amber-400" },
              ].map(item => (
                <div key={item.label}>
                  <div className="mb-1 flex justify-between text-[10px] font-bold">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="text-slate-400">{item.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white">
                    <span
                      style={{ width: `${item.value}%` }}
                      className={`block h-full rounded-full ${item.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="rounded-2xl border border-amber-100 bg-amber-50/55 p-5">
          <h2 className="text-[15px] font-extrabold text-amber-900">
            Takip önerisi
          </h2>
          <p className="mt-2 text-[11px] leading-5 text-amber-800">
            {isPersonal
              ? "Geometri konularında kısa tekrar ve soru çözüm etüdü öneriliyor."
              : "YKS 12-B sınıfında geometri ortalaması kurum eşiğinin altında. Rehberlik ve etüt planı oluşturabilirsiniz."}
          </p>
          {!isPersonal && (
            <button
              onClick={() => onNavigate("İletişim")}
              className="mt-4 text-[11px] font-bold text-amber-800 underline underline-offset-4"
            >
              Veli bilgilendirmesi oluştur
            </button>
          )}
        </section>
      </div>
    </>
  );
}
