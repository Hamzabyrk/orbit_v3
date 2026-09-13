import { NotebookPen } from "lucide-react";
import { Badge } from "../shared";
import type { Homework, HomeworkStatus } from "../types";

const statusTone: Record<HomeworkStatus, "blue" | "rose" | "green"> = {
  Aktif: "blue",
  "Süresi Doldu": "rose",
  Tamamlandı: "green",
};

export type HomeworkCardProps = {
  homework: Homework;
  onEdit?: (item: Homework) => void;
  onArchive?: (item: Homework) => void | Promise<void>;
  onManageSubmissions?: (item: Homework) => void;
  isArchiving?: boolean;
};

export function HomeworkCard({
  homework,
  onEdit,
  onArchive,
  onManageSubmissions,
  isArchiving = false,
}: HomeworkCardProps) {
  return (
    <article className="flex min-h-[220px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
          <NotebookPen className="h-5 w-5" />
        </span>
        <Badge tone={statusTone[homework.status]}>{homework.status}</Badge>
      </div>
      <div className="mt-5">
        {homework.subject ? (
          <Badge tone="slate">{homework.subject}</Badge>
        ) : null}
        <h2 className="mt-3 text-[15px] font-extrabold tracking-[-.025em] text-slate-900">
          {homework.title}
        </h2>
        <p className="mt-2 text-[11px] leading-5 text-slate-500">
          {homework.description}
        </p>
      </div>
      <div className="mt-auto border-t border-slate-100 pt-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold text-slate-500">
              {homework.classGroup}
              {homework.assignedBy ? (
                <>
                  {" · "}
                  <span className="font-medium text-slate-400">
                    {homework.assignedBy}
                  </span>
                </>
              ) : null}
            </p>
            <p className="mt-1 text-[10px] font-bold text-slate-700">
              Son teslim: {homework.dueDate}
            </p>
            {homework.submissionsRecordedAt &&
            homework.submissionCount !== undefined ? (
              <p className="mt-0.5 text-[10px] font-semibold text-emerald-600">
                {homework.submissionCount}
                {homework.totalStudents !== undefined
                  ? ` / ${homework.totalStudents}`
                  : ""}{" "}
                teslim
              </p>
            ) : null}
          </div>
          {onEdit || onArchive || onManageSubmissions ? (
            <div className="flex items-center gap-2 text-[11px]">
              {onManageSubmissions ? (
                <button
                  type="button"
                  onClick={() => onManageSubmissions(homework)}
                  className="font-semibold text-blue-600 hover:text-blue-800"
                >
                  Teslimler
                </button>
              ) : null}
              {onEdit ? (
                <button
                  type="button"
                  onClick={() => onEdit(homework)}
                  className="font-semibold text-slate-600 hover:text-slate-800"
                >
                  Düzenle
                </button>
              ) : null}
              {onArchive ? (
                <button
                  type="button"
                  onClick={() => void onArchive(homework)}
                  disabled={isArchiving}
                  className="font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50"
                >
                  {isArchiving ? "Arşivleniyor…" : "Arşivle"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
