import { useState } from "react";
import { BookOpen } from "lucide-react";
import { schedule } from "../educationData";
import { Badge, EmptyState, PageHeader } from "../shared";
import type { Role, WeekDay } from "../types";
import {
  getDefaultScheduleDay,
  getTodayWeekDay,
  WEEK_DAYS,
} from "./scheduleHelpers";

export function SchedulePage({ role }: { role: Role }) {
  const todayWeekDay = getTodayWeekDay();
  const [selectedDay, setSelectedDay] = useState<WeekDay>(() =>
    getDefaultScheduleDay()
  );

  const roleFiltered =
    role === "student" || role === "parent"
      ? schedule.filter(
          item => item.group === "YKS 12-A" || item.group === "Zeynep Kaya"
        )
      : role === "teacher"
        ? schedule.filter(
            item =>
              item.teacher === "Merve Karaca" || item.teacher === "Seda Kılıç"
          )
        : schedule;

  const dayFiltered = roleFiltered.filter(item => item.day === selectedDay);

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
      />
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
          {dayFiltered.length === 0 ? (
            <EmptyState
              title={`${selectedDay} günü için ders bulunmuyor`}
              description="Planlanmış bir ders programı kaydı yok."
            />
          ) : null}
          {dayFiltered.map(item => (
            <div
              key={`${item.day}-${item.time}-${item.title}`}
              className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center"
            >
              <span className="w-12 text-[12px] font-extrabold tabular-nums text-slate-500">
                {item.time}
              </span>
              <span
                className={`grid h-9 w-9 place-items-center rounded-lg ring-1 ${item.tone}`}
              >
                <BookOpen className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-extrabold text-slate-800">
                  {item.title}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {item.group} · {item.teacher} · {item.room}
                </p>
              </div>
              <Badge tone="slate">50 dk</Badge>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
