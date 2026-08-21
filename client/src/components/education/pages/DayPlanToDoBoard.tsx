import { useState } from "react";
import { Plus, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge, StatCard } from "../shared";
import type {
  DayPlanTask,
  DayPlanTaskCategory,
  DayPlanTaskStatus,
} from "../types";
import { DayPlanTaskCard } from "./DayPlanTaskCard";
import { getTaskCompletionPercent, getTodayTaskCount } from "./dayPlanHelpers";

const columns: { status: DayPlanTaskStatus; hint: string }[] = [
  { status: "Planla", hint: "İleri tarihe alınacak işler" },
  { status: "Bugün", hint: "Günün planına alınanlar" },
  { status: "Odaklan", hint: "Şu an üzerinde çalışılanlar" },
  { status: "Tamamlandı", hint: "Bugün sonuçlanan işler" },
];

const categories: DayPlanTaskCategory[] = [
  "Yoklama",
  "Veli İletişimi",
  "Sınav",
  "Rapor",
  "Kayıt",
  "Ders Programı",
];

export function DayPlanToDoBoard({
  tasks,
  setTasks,
}: {
  tasks: DayPlanTask[];
  setTasks: React.Dispatch<React.SetStateAction<DayPlanTask[]>>;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"Tümü" | DayPlanTaskCategory>(
    "Tümü"
  );

  const filtered = tasks.filter(task => {
    const matchesQuery = `${task.title} ${task.detail} ${task.category}`
      .toLocaleLowerCase("tr")
      .includes(query.toLocaleLowerCase("tr"));
    const matchesCategory = category === "Tümü" || task.category === category;
    return matchesQuery && matchesCategory;
  });

  const done = tasks.filter(task => task.status === "Tamamlandı").length;

  return (
    <>
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
              Şu an {getTodayTaskCount(tasks)} odak görevi var. Önce yüksek
              öncelikli işleri netleştirin, sonra sıradaki zaman kutusuna geçin.
            </p>
            <span className="whitespace-nowrap rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-[11px] font-bold">
              Bugünkü plan: {getTodayTaskCount(tasks)} görev
            </span>
          </div>
        </div>
        <StatCard
          label="Günlük ilerleme"
          value={`%${getTaskCompletionPercent(tasks)}`}
          detail={`${done}/${tasks.length} görev tamamlandı`}
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
            placeholder="Görev, etiket veya not ara..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[12px] outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
        </div>
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
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map(column => {
          const columnTasks = filtered.filter(
            task => task.status === column.status
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
                  onClick={() =>
                    toast.info("Yeni görev", {
                      description: `"${column.status}" sütununa görev ekleme bir sonraki fazda aktifleşecek.`,
                    })
                  }
                  aria-label={`${column.status} sütununa görev ekle`}
                  className="grid h-6 w-6 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-400">{column.hint}</p>
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
                      setTasks={setTasks}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
