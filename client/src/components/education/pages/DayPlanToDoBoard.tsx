import { useState } from "react";
import { Plus, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_DAY_PLAN_LIMIT,
  type TaskItem,
} from "@/education/dayPlanService";
import { getOrbitToday } from "@/education/trDate";
import { Badge, EmptyState, StatCard } from "../shared";
import type {
  DayPlanTask,
  DayPlanTaskCategory,
  DayPlanTaskStatus,
} from "../types";
import { DayPlanTaskCard } from "./DayPlanTaskCard";

const columns: { status: DayPlanTaskStatus; hint: string }[] = [
  { status: "Planla", hint: "İleri tarihe veya tarihsiz işler" },
  { status: "Bugün", hint: "Günün planına alınanlar" },
  { status: "Odaklan", hint: "Geciken veya öncelikli işler" },
  { status: "Tamamlandı", hint: "Sonuçlanan işler" },
];

const categories: DayPlanTaskCategory[] = [
  "Yoklama",
  "Veli İletişimi",
  "Sınav",
  "Rapor",
  "Kayıt",
  "Ders Programı",
];

function isRealTask(task: DayPlanTask | TaskItem): task is TaskItem {
  return "ownerMembershipId" in task;
}

export type DayPlanToDoBoardProps = {
  tasks: (DayPlanTask | TaskItem)[];
  setTasks?: React.Dispatch<React.SetStateAction<DayPlanTask[]>>;
  organizationId?: string;
  membershipId?: string;
  onAddTask?: (initialDueOn?: string) => void;
  onEditTask?: (task: TaskItem) => void;
  truncated?: boolean;
};

export function DayPlanToDoBoard({
  tasks,
  setTasks,
  organizationId = "",
  membershipId = "",
  onAddTask,
  onEditTask,
  truncated = false,
}: DayPlanToDoBoardProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"Tümü" | DayPlanTaskCategory>(
    "Tümü"
  );

  const isProduction =
    tasks.length > 0 ? isRealTask(tasks[0]) : Boolean(organizationId);
  const today = getOrbitToday();

  // Görevi ilgili sütuna yerleştir
  const getTaskColumn = (task: DayPlanTask | TaskItem): DayPlanTaskStatus => {
    if (!isRealTask(task)) {
      return task.status;
    }
    if (task.completedAt) {
      return "Tamamlandı";
    }
    if (task.dueOn && task.dueOn < today) {
      return "Odaklan"; // 🔴 Vadesi geçmiş işler odak sütununa
    }
    if (task.dueOn === today) {
      return "Bugün";
    }
    return "Planla";
  };

  const filtered = tasks.filter(task => {
    const title = task.title || "";
    const detail = task.detail || "";
    const cat = !isRealTask(task) ? task.category : "";
    const matchesQuery = `${title} ${detail} ${cat}`
      .toLocaleLowerCase("tr")
      .includes(query.toLocaleLowerCase("tr"));

    if (!isRealTask(task)) {
      const matchesCategory = category === "Tümü" || task.category === category;
      return matchesQuery && matchesCategory;
    }
    return matchesQuery;
  });

  const totalCount = tasks.length;
  const doneCount = tasks.filter(t =>
    isRealTask(t) ? Boolean(t.completedAt) : t.status === "Tamamlandı"
  ).length;

  const todayCount = tasks.filter(t => {
    const col = getTaskColumn(t);
    return col === "Bugün" || col === "Odaklan";
  }).length;

  const completionPercent =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const handleColumnAdd = (status: DayPlanTaskStatus) => {
    if (onAddTask) {
      if (status === "Bugün") {
        onAddTask(today);
      } else {
        onAddTask();
      }
    } else {
      toast.info("Yeni görev", {
        description: `"${status}" sütununa görev ekleme bir sonraki fazda aktifleşecek.`,
      });
    }
  };

  return (
    <>
      {/* Tavan Uyarısı (K-06) */}
      {truncated ? (
        <div
          role="status"
          className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-[11px] font-semibold text-amber-800"
        >
          Liste üst sınıra ({DEFAULT_DAY_PLAN_LIMIT} kayıt) ulaştı. Kalan
          kayıtları görmek için arama yapın.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="rounded-2xl bg-slate-900 p-6 text-white">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-extrabold">
            <Sparkles className="h-3 w-3" />
            Günün odağı
          </span>
          <p className="mt-3 font-display text-[19px] font-extrabold tracking-[-.03em]">
            Önemli olanı ilerletin.
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="max-w-sm text-[11px] leading-5 text-white/70">
              Şu an {todayCount} odak görevi var. Önce yüksek öncelikli işleri
              netleştirin, sonra sıradaki zaman kutusuna geçin.
            </p>
            <span className="whitespace-nowrap rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-[11px] font-bold">
              Bugünkü plan: {todayCount} görev
            </span>
          </div>
        </div>
        <StatCard
          label="Günlük ilerleme"
          value={`%${completionPercent}`}
          detail={`${doneCount}/${totalCount} görev tamamlandı`}
          icon={Sparkles}
          tone="green"
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Görev veya not ara..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[12px] outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
        </div>
        {!isProduction ? (
          <select
            value={category}
            onChange={event =>
              setCategory(event.target.value as "Tümü" | DayPlanTaskCategory)
            }
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          >
            <option value="Tümü">Tümü</option>
            {categories.map(item => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {isProduction && tasks.length === 0 ? (
        // 🔴 K-22: Boş liste dürüst bir ifadedir, "yüklenemedi" ile karıştırılmamalıdır
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
          <EmptyState
            title="Henüz görev bulunmuyor"
            description="Kişisel çalışma alanınız için yeni bir görev ekleyerek başlayın."
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map(column => {
            const columnTasks = filtered.filter(
              task => getTaskColumn(task) === column.status
            );
            return (
              <section
                key={column.status}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,.025)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[12px] font-extrabold text-slate-800">
                      {column.status}
                    </p>
                    <Badge tone="slate">{columnTasks.length}</Badge>
                  </div>
                  <button
                    onClick={() => handleColumnAdd(column.status)}
                    aria-label={`${column.status} sütununa görev ekle`}
                    className="grid h-6 w-6 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {column.hint}
                </p>
                <div className="mt-3 space-y-2.5">
                  {columnTasks.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-[10px] text-slate-400">
                      Bu sütunda görev yok.
                    </p>
                  ) : (
                    columnTasks.map(task => (
                      <DayPlanTaskCard
                        key={task.id}
                        task={task}
                        organizationId={organizationId}
                        membershipId={membershipId}
                        onEdit={onEditTask}
                        setTasks={setTasks}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
