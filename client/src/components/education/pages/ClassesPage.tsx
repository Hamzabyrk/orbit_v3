import { ChevronRight, School } from "lucide-react";
import { toast } from "sonner";
import { classes } from "../educationData";
import { Badge, EmptyState, PageHeader } from "../shared";
import type { Role, Section } from "../types";

export function ClassesPage({
  role,
  onNavigate,
}: {
  role: Role;
  onNavigate: (section: Section) => void;
}) {
  const shown =
    role === "teacher"
      ? classes.filter(group => group.mentor === "Merve Karaca")
      : classes;
  return (
    <>
      <PageHeader
        eyebrow="Akademik organizasyon"
        title="Sınıflar ve gruplar"
        description="Program, öğretmen, öğrenci sayısı ve devam görünümünü birlikte izleyin."
        action={role === "admin" ? "Yeni sınıf" : undefined}
        onAction={
          role === "admin"
            ? () =>
                toast.info("Yeni sınıf", {
                  description:
                    "Demo MVP’de sınıf oluşturma formu bir sonraki kalıcı veri fazına hazırlandı.",
                })
            : undefined
        }
      />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.length === 0 ? (
          <EmptyState title="Henüz sınıf kaydı yok" />
        ) : null}
        {shown.map(group => (
          <article
            key={group.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.025)]"
          >
            <div className="flex items-start justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <School className="h-5 w-5" />
              </span>
              <Badge tone={group.attendance < 90 ? "amber" : "green"}>
                Devam %{group.attendance}
              </Badge>
            </div>
            <h2 className="mt-5 font-display text-[18px] font-extrabold tracking-[-.035em] text-slate-900">
              {group.name}
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">{group.program}</p>
            <div className="mt-5 space-y-2.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Mentor</span>
                <span className="font-bold text-slate-700">{group.mentor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Öğrenci</span>
                <span className="font-bold text-slate-700">
                  {group.studentCount} kayıt
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sıradaki ders</span>
                <span className="font-bold text-slate-700">
                  {group.nextLesson}
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigate("Öğrenciler")}
              className="mt-5 flex items-center gap-1.5 text-[11px] font-bold text-blue-600"
            >
              Öğrencileri görüntüle <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
