import { useState } from "react";
import { ChevronRight, School } from "lucide-react";
import { isDemoMode } from "@/auth/runtime";
import { filterClassesForRole } from "../scopeFilters";
import {
  Badge,
  EmptyState,
  ErrorState,
  PageHeader,
  TableSkeleton,
} from "../shared";
import type { ClassGroup, Role, Section } from "../types";

export function ClassesPage({
  role,
  classes: classList,
  isLoading = false,
  error = null,
  onRetry,
  truncated = false,
  limit,
  onNavigate,
  onAdd,
  onEdit,
  onArchive,
  onManageEnrollments,
}: {
  role: Role;
  classes: ClassGroup[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  truncated?: boolean;
  /** Üst sınırın tek kaynağı servistedir; bant onu tekrar etmez, gösterir (K-06). */
  limit?: number;
  onNavigate: (section: Section) => void;
  onAdd?: () => void;
  onEdit?: (cls: ClassGroup) => void;
  onArchive?: (cls: ClassGroup) => void | Promise<void>;
  onManageEnrollments?: (cls: ClassGroup) => void;
}) {
  const shown = filterClassesForRole(classList, role, isDemoMode);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const handleArchive = async (cls: ClassGroup) => {
    if (!onArchive || archivingId) return;
    setArchivingId(cls.id);
    try {
      await onArchive(cls);
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Akademik organizasyon"
        title="Sınıflar ve gruplar"
        description="Program, öğretmen, öğrenci sayısı ve devam görünümünü birlikte izleyin."
        action={role === "admin" ? "Yeni sınıf" : undefined}
        onAction={role === "admin" ? onAdd : undefined}
      />
      {truncated ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-[11px] font-semibold text-amber-800">
          Liste üst sınıra ({limit} kayıt) ulaştı.
        </div>
      ) : null}
      {isLoading ? (
        <TableSkeleton rows={4} columns={3} className="mt-6" />
      ) : error ? (
        <ErrorState
          className="mt-6"
          title="Sınıflar görüntülenemedi"
          message={error.message}
          onRetry={onRetry}
        />
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.length === 0 ? (
            <EmptyState title="Gösterilecek sınıf yok" />
          ) : null}
          {shown.map(group => {
            const hasCapacity =
              group.capacity !== null && group.capacity !== undefined;
            const isFull =
              hasCapacity && group.studentCount >= (group.capacity ?? 0);

            return (
              <article
                key={group.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.025)]"
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                    <School className="h-5 w-5" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isFull ? <Badge tone="amber">Kontenjan dolu</Badge> : null}
                    {group.attendance !== undefined ? (
                      <Badge tone={group.attendance < 90 ? "amber" : "green"}>
                        Devam %{group.attendance}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <h2 className="mt-5 font-display text-[18px] font-extrabold tracking-[-.035em] text-slate-900">
                  {group.name}
                </h2>
                {group.program ? (
                  <p className="mt-1 text-[11px] text-slate-500">
                    {group.program}
                  </p>
                ) : null}
                <div className="mt-5 space-y-2.5 text-[11px]">
                  {group.branch ? (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Şube</span>
                      <span className="font-bold text-slate-700">
                        {group.branch}
                      </span>
                    </div>
                  ) : null}
                  {group.mentor ? (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mentor</span>
                      <span className="font-bold text-slate-700">
                        {group.mentor}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Öğrenci</span>
                    <span className="font-bold text-slate-700">
                      {hasCapacity
                        ? `${group.studentCount}/${group.capacity} doluluk`
                        : `${group.studentCount} kayıt`}
                    </span>
                  </div>
                  {group.nextLesson ? (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sıradaki ders</span>
                      <span className="font-bold text-slate-700">
                        {group.nextLesson}
                      </span>
                    </div>
                  ) : null}
                </div>

                {role === "admin" ? (
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
                    <div className="flex items-center gap-3">
                      {onManageEnrollments ? (
                        <button
                          type="button"
                          onClick={() => onManageEnrollments(group)}
                          className="font-bold text-blue-600 hover:text-blue-700"
                        >
                          Öğrenciler
                        </button>
                      ) : null}
                      {onEdit ? (
                        <button
                          type="button"
                          onClick={() => onEdit(group)}
                          className="font-semibold text-slate-600 hover:text-slate-800"
                        >
                          Düzenle
                        </button>
                      ) : null}
                      {onArchive ? (
                        <button
                          type="button"
                          onClick={() => void handleArchive(group)}
                          disabled={archivingId === group.id}
                          className="font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50"
                        >
                          {archivingId === group.id
                            ? "Arşivleniyor…"
                            : "Arşivle"}
                        </button>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate("Öğrenciler")}
                      className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Detay <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onNavigate("Öğrenciler")}
                    className="mt-5 flex items-center gap-1.5 text-[11px] font-bold text-blue-600"
                  >
                    Öğrencileri görüntüle{" "}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
