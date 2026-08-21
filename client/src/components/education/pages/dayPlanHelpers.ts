import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { DayPlanEvent, DayPlanTask } from "../types";

export function getMonthGridDays(month: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
}

export function getEventsForDay(
  events: DayPlanEvent[],
  day: Date
): DayPlanEvent[] {
  return events.filter(event => isSameDay(parseISO(event.date), day));
}

export function getTodayTaskCount(tasks: DayPlanTask[]): number {
  return tasks.filter(
    task => task.status === "Bugün" || task.status === "Odaklan"
  ).length;
}

export function getTaskCompletionPercent(tasks: DayPlanTask[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter(task => task.status === "Tamamlandı").length;
  return Math.round((done / tasks.length) * 100);
}
