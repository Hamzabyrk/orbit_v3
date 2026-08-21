import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { MapPin, Phone, Video } from "lucide-react";
import type { DayPlanEvent } from "../types";

const modeIcon: Record<DayPlanEvent["mode"], typeof Video> = {
  "Google Meet": Video,
  Telefon: Phone,
  "Yüz yüze": MapPin,
};

export function DayPlanAgenda({
  selectedDate,
  events,
}: {
  selectedDate: Date;
  events: DayPlanEvent[];
}) {
  return (
    <div>
      <p className="text-[11px] font-extrabold uppercase tracking-[.1em] text-slate-400">
        Günlük Ajanda
      </p>
      <p className="mt-1 text-[14px] font-extrabold text-slate-900">
        {format(selectedDate, "d MMMM yyyy, EEEE", { locale: tr })}
      </p>
      <div className="mt-4 space-y-2.5">
        {events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-[11px] text-slate-400">
            Bu gün için planlanmış görüşme yok.
          </p>
        ) : (
          events.map(event => {
            const Icon = modeIcon[event.mode];
            return (
              <div
                key={event.id}
                className="rounded-xl border border-slate-100 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold tabular-nums text-slate-700">
                    {event.startTime}–{event.endTime}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <Icon className="h-3 w-3" />
                    {event.mode}
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-extrabold text-slate-800">
                  {event.title}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {event.subtitle}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
