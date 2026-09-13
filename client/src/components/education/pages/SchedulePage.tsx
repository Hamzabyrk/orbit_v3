import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { isDemoMode } from "@/auth/runtime";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { educationKeys } from "@/education/educationQueries";
import { archiveScheduleEntry } from "@/education/scheduleService";
import { schedule as defaultSchedule } from "../educationData";
import { filterScheduleForRole } from "../scopeFilters";
import {
  Badge,
  EmptyState,
  ErrorState,
  PageHeader,
  TableSkeleton,
} from "../shared";
import type { Role, ScheduleItem, WeekDay } from "../types";
import {
  getDefaultScheduleDay,
  getTodayWeekDay,
  WEEK_DAYS,
} from "./scheduleHelpers";
import { ScheduleEntryFormDialog } from "./ScheduleEntryFormDialog";

export function SchedulePage({
  role,
  schedule: scheduleList = defaultSchedule,
  isLoading = false,
  error = null,
  onRetry,
  truncated = false,
  limit,
  organizationId = "",
  classes = [],
}: {
  role: Role;
  schedule?: ScheduleItem[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  truncated?: boolean;
  /** Üst sınırın tek kaynağı servistedir; bant onu tekrar etmez, gösterir (K-06). */
  limit?: number;
  organizationId?: string;
  classes?: { id: string; name: string }[];
}) {
  const todayWeekDay = getTodayWeekDay();
  const [selectedDay, setSelectedDay] = useState<WeekDay>(() =>
    getDefaultScheduleDay()
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScheduleItem | null>(null);

  const [entryToArchive, setEntryToArchive] = useState<ScheduleItem | null>(
    null
  );

  const roleFiltered = filterScheduleForRole(scheduleList, role, isDemoMode);
  const dayFiltered = roleFiltered.filter(item => item.day === selectedDay);

  const handleOpenAdd = () => {
    setEditingEntry(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (item: ScheduleItem) => {
    setEditingEntry(item);
    setFormOpen(true);
  };

  const handleOpenArchive = (item: ScheduleItem) => {
    setEntryToArchive(item);
  };

  return (
    <>
      <PageHeader
        eyebrow="Haftalık plan"
        title={
          role === "student"
            ? "Ders programım"
            : role === "parent"
              ? "Öğrenci ders programı"
              : "Ders programı"
        }
        description="Ders, etüt, rehberlik ve sınav planını gün bazında takip edin."
        action={
          role === "admin" && !isDemoMode ? "Ders programı ekle" : undefined
        }
        onAction={role === "admin" && !isDemoMode ? handleOpenAdd : undefined}
      />
      {truncated ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-[11px] font-semibold text-amber-800">
          Liste üst sınıra ({limit} kayıt) ulaştı. Kalan kayıtları görmek için
          filtreleri kullanın.
        </div>
      ) : null}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
          {WEEK_DAYS.map(day => {
            const isSelected = day === selectedDay;
            const isToday = day === todayWeekDay;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${
                  isSelected
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {day}
                {isToday ? " · Bugün" : ""}
              </button>
            );
          })}
        </div>
        <div className="mt-5 space-y-3">
          {isLoading ? (
            <TableSkeleton
              rows={4}
              columns={3}
              className="border-0 p-0 shadow-none"
            />
          ) : error ? (
            <ErrorState
              title="Ders programı görüntülenemedi"
              message={error.message}
              onRetry={onRetry}
            />
          ) : dayFiltered.length === 0 ? (
            <EmptyState
              title={`${selectedDay} günü için ders bulunmuyor`}
              description="Planlanmış bir ders programı kaydı yok."
            />
          ) : (
            dayFiltered.map(item => {
              const metaInfo = [item.group, item.teacher, item.room]
                .filter(Boolean)
                .join(" · ");
              // v1.3-01b · 2.C: Servis tone üretmez; arayüzde nötr slate stili kullanılır.
              const toneClass =
                item.tone || "bg-slate-50 text-slate-700 ring-slate-100";
              // v1.3-01b · 2.B.4 & K-22: ends_at yoksa süre rozeti hiç çizilmez; demo modunda 50 dk korunur.
              const durationLabel =
                item.duration ?? (isDemoMode ? "50 dk" : null);

              return (
                <div
                  key={item.id ?? `${item.day}-${item.time}-${item.title}`}
                  className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center min-w-0 flex-1">
                    <span className="w-12 text-[12px] font-extrabold tabular-nums text-slate-500">
                      {item.time}
                    </span>
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-lg ring-1 ${toneClass}`}
                    >
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-extrabold text-slate-800">
                        {item.title}
                      </p>
                      {metaInfo ? (
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {metaInfo}
                        </p>
                      ) : null}
                    </div>
                    {durationLabel ? (
                      <Badge tone="slate">{durationLabel}</Badge>
                    ) : null}
                  </div>

                  {/* Yönetici eylemleri (Yalnızca admin rolünde ve canlı modda çizilir) */}
                  {role === "admin" && !isDemoMode && item.id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Düzenle</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenArchive(item)}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-rose-200 px-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Kaldır</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Program Satırı Ekle/Düzenle Diyalogu */}
      {formOpen && organizationId ? (
        <ScheduleEntryFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          organizationId={organizationId}
          classes={classes}
          entry={editingEntry}
          defaultDay={selectedDay}
          onDone={() => setEditingEntry(null)}
        />
      ) : null}

      {/* Program Satırı Kaldırma (Arşivleme) Diyalogu — window.confirm KULLANILMAZ */}
      {entryToArchive && organizationId ? (
        <ScheduleArchiveDialog
          organizationId={organizationId}
          entry={entryToArchive}
          onClose={() => setEntryToArchive(null)}
        />
      ) : null}
    </>
  );
}

function ScheduleArchiveDialog({
  organizationId,
  entry,
  onClose,
}: {
  organizationId: string;
  entry: ScheduleItem;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const handleArchiveConfirm = async () => {
    if (!organizationId || !entry.id) return;

    setArchiveLoading(true);
    setArchiveError(null);

    try {
      await archiveScheduleEntry(organizationId, entry.id);
      await queryClient.invalidateQueries({
        queryKey: educationKeys.schedule(organizationId),
      });
      onClose();
      toast.success("Ders programı satırı kaldırıldı", {
        description: "Program satırı başarıyla arşive alındı.",
      });
    } catch (err) {
      setArchiveError(
        err instanceof Error ? err.message : "Program satırı kaldırılamadı."
      );
    } finally {
      setArchiveLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Program Satırını Kaldır</DialogTitle>
          <DialogDescription>
            &quot;{entry.title}&quot; ders programı satırını kaldırmak
            istediğinize emin misiniz?
          </DialogDescription>
        </DialogHeader>

        {archiveError ? (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-[12px] text-rose-700 font-medium"
          >
            {archiveError}
          </div>
        ) : null}

        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            disabled={archiveLoading}
            className="h-9 rounded-lg border border-slate-200 px-4 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleArchiveConfirm}
            disabled={archiveLoading}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-rose-600 px-4 text-[12px] font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
          >
            {archiveLoading ? "Kaldırılıyor…" : "Satırı Kaldır"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
