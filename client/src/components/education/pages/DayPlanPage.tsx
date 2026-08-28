import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { dayPlanEventsByRole } from "../educationData";
import { PageHeader } from "../shared";
import type { DayPlanRole, DayPlanTask } from "../types";
import { DayPlanCalendar } from "./DayPlanCalendar";
import { DayPlanToDoBoard } from "./DayPlanToDoBoard";

const tabs = [
  { id: "todo", label: "To-Do List" },
  { id: "calendar", label: "Takvim" },
] as const;

type DayPlanTab = (typeof tabs)[number]["id"];

export function DayPlanPage({
  role,
  tasks,
  setTasks,
}: {
  role: DayPlanRole;
  tasks: DayPlanTask[];
  setTasks: React.Dispatch<React.SetStateAction<DayPlanTask[]>>;
}) {
  const [tab, setTab] = useState<DayPlanTab>("todo");
  const events = dayPlanEventsByRole[role];

  const addAction =
    tab === "todo"
      ? {
          label: "Yeni görev",
          onClick: () =>
            toast.info("Yeni görev", {
              description:
                "Demo MVP'de görev oluşturma formu bir sonraki kalıcı veri fazında etkinleşecek.",
            }),
        }
      : {
          label: "Yeni Görüşme Ekle",
          onClick: () =>
            toast.info("Yeni görüşme", {
              description:
                "Demo MVP'de görüşme planlama bir sonraki kalıcı veri fazında etkinleşecek.",
            }),
        };

  return (
    <>
      <PageHeader
        eyebrow="Kişisel çalışma alanı"
        title="Gün Planı"
        description="Günlük görevlerinizi ve görüşmelerinizi tek ekrandan yönetin."
      />
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {tabs.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-3.5 py-1.5 text-[11px] font-bold transition ${
                tab === item.id
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          onClick={addAction.onClick}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-[12px] font-bold text-white shadow-[0_8px_16px_rgba(15,23,42,.12)] transition hover:bg-slate-800 active:scale-[.98]"
        >
          <Plus className="h-4 w-4" />
          {addAction.label}
        </button>
      </div>
      <div className="mt-5">
        {tab === "todo" ? (
          <DayPlanToDoBoard tasks={tasks} setTasks={setTasks} />
        ) : (
          // Takvim, kayıt listesi değil; boş bir ay da geçerli bir takvimdir.
          // Kayıt yokken tümünü gizlemek, kullanıcıya ekranın bozulduğunu
          // düşündürüyordu; ayrıca ay geçişi ve gün seçimi de erişilemez oluyordu.
          <DayPlanCalendar events={events} />
        )}
      </div>
    </>
  );
}
