import { CalendarDays, Clock } from "lucide-react";
import { Badge } from "../shared";
import type { DayPlanTask, DayPlanTaskStatus } from "../types";

const statusOptions: DayPlanTaskStatus[] = [
  "Planla",
  "Bugün",
  "Odaklan",
  "Tamamlandı",
];

const priorityTone: Record<
  DayPlanTask["priority"],
  "rose" | "amber" | "slate"
> = {
  Yüksek: "rose",
  Orta: "amber",
  Düşük: "slate",
};

const categoryTone: Record<
  DayPlanTask["category"],
  "blue" | "violet" | "amber" | "slate" | "green"
> = {
  Yoklama: "blue",
  "Veli İletişimi": "violet",
  Sınav: "amber",
  Rapor: "slate",
  Kayıt: "green",
  "Ders Programı": "blue",
};

export function DayPlanTaskCard({
  task,
  setTasks,
}: {
  task: DayPlanTask;
  setTasks: React.Dispatch<React.SetStateAction<DayPlanTask[]>>;
}) {
  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={priorityTone[task.priority]}>{task.priority}</Badge>
        <Badge tone={categoryTone[task.category]}>{task.category}</Badge>
      </div>
      <p className="mt-2.5 text-[12px] font-extrabold text-slate-800">
        {task.title}
      </p>
      <p className="mt-1 text-[10px] leading-4 text-slate-500">
        {task.detail}
      </p>
      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {task.duration}
        </span>
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3" />
          {task.dueLabel}
        </span>
      </div>
      <select
        value={task.status}
        onChange={event => {
          const nextStatus = event.target.value as DayPlanTaskStatus;
          setTasks(current =>
            current.map(item =>
              item.id === task.id ? { ...item, status: nextStatus } : item
            )
          );
        }}
        className="mt-3 h-8 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-2 text-[11px] font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
      >
        {statusOptions.map(status => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </div>
  );
}
