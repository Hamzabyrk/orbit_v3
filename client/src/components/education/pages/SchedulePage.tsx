import { useState } from "react";
import { BookOpen } from "lucide-react";
import { isDemoMode } from "@/auth/runtime";
import { schedule as defaultSchedule } from "../educationData";
import { filterScheduleForRole } from "../scopeFilters";
import { Badge, EmptyState, PageHeader } from "../shared";
import type { Role, ScheduleItem, WeekDay } from "../types";
import {
  getDefaultScheduleDay,
  getTodayWeekDay,
  WEEK_DAYS,
} from "./scheduleHelpers";

export function SchedulePage({
  role,
  schedule: scheduleList = defaultSchedule,
  isLoading = false,
  error = null,
  truncated = false,
  limit,
}: {
  role: Role;
  schedule?: ScheduleItem[];
  isLoading?: boolean;
  error?: Error | null;
  truncated?: boolean;
  /** Üst sınırın tek kaynağı servistedir; bant onu tekrar etmez, gösterir (K-06). */
  limit?: number;
}) {
  const todayWeekDay = getTodayWeekDay();
  const [selectedDay, setSelectedDay] = useState<WeekDay>(() =>
    getDefaultScheduleDay()
  );

  const roleFiltered = filterScheduleForRole(scheduleList, role, isDemoMode);

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
            <div className="py-10 text-center">
              <p className="text-[12px] font-extrabold text-slate-700">
                Ders programı yükleniyor…
              </p>
            </div>
          ) : error ? (
            <EmptyState
              title="Ders programı görüntülenemedi"
              description={`${error.message} Sayfayı yenilemeyi deneyin.`}
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
                  className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center"
                >
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
              );
            })
          )}
        </div>
      </section>
    </>
  );
}
