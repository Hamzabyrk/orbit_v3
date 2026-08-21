import { NotebookPen } from "lucide-react";
import { Badge } from "../shared";
import type { Homework, HomeworkStatus } from "../types";

const statusTone: Record<HomeworkStatus, "blue" | "rose" | "green"> = {
  Aktif: "blue",
  "Süresi Doldu": "rose",
  Tamamlandı: "green",
};

export function HomeworkCard({ homework }: { homework: Homework }) {
  return (
    <article className="flex min-h-[220px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
          <NotebookPen className="h-5 w-5" />
        </span>
        <Badge tone={statusTone[homework.status]}>{homework.status}</Badge>
      </div>
      <div className="mt-5">
        <Badge tone="slate">{homework.subject}</Badge>
        <h2 className="mt-3 text-[15px] font-extrabold tracking-[-.025em] text-slate-900">
          {homework.title}
        </h2>
        <p className="mt-2 text-[11px] leading-5 text-slate-500">
          {homework.description}
        </p>
      </div>
      <div className="mt-auto border-t border-slate-100 pt-3">
        <p className="text-[10px] font-semibold text-slate-500">
          {homework.classGroup} ·{" "}
          <span className="font-medium text-slate-400">
            {homework.assignedBy}
          </span>
        </p>
        <p className="mt-1 text-[10px] font-bold text-slate-700">
          Son teslim: {homework.dueDate}
        </p>
      </div>
    </article>
  );
}
