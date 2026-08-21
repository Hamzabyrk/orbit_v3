import { useState } from "react";
import { addMonths, format, startOfMonth, subMonths } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DayPlanEvent } from "../types";
import { DayPlanAgenda } from "./DayPlanAgenda";
import { DayPlanMonthGrid } from "./DayPlanMonthGrid";
import { getEventsForDay } from "./dayPlanHelpers";

export function DayPlanCalendar({ events }: { events: DayPlanEvent[] }) {
  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(new Date())
  );
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const goToday = () => {
    const today = new Date();
    setCurrentMonth(startOfMonth(today));
    setSelectedDate(today);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-extrabold capitalize text-slate-900">
            {format(currentMonth, "LLLL yyyy", { locale: tr })}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentMonth(current => subMonths(current, 1))}
              aria-label="Önceki ay"
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToday}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
            >
              Bugün
            </button>
            <button
              onClick={() => setCurrentMonth(current => addMonths(current, 1))}
              aria-label="Sonraki ay"
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-4">
          <DayPlanMonthGrid
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            events={events}
            onSelectDate={setSelectedDate}
          />
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
        <DayPlanAgenda
          selectedDate={selectedDate}
          events={getEventsForDay(events, selectedDate)}
        />
      </section>
    </div>
  );
}
