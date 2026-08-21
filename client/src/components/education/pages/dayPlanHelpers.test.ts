import { describe, expect, it } from "vitest";
import type { DayPlanEvent, DayPlanTask } from "../types";
import {
  getEventsForDay,
  getMonthGridDays,
  getTaskCompletionPercent,
  getTodayTaskCount,
} from "./dayPlanHelpers";

const task = (status: DayPlanTask["status"], id: string): DayPlanTask => ({
  id,
  title: "Test görevi",
  detail: "Test detayı",
  status,
  priority: "Orta",
  category: "Rapor",
  duration: "10 dk",
  dueLabel: "Bugün",
  isMock: true,
});

const event = (date: string, id: string): DayPlanEvent => ({
  id,
  date,
  startTime: "10:00",
  endTime: "10:30",
  mode: "Google Meet",
  type: "Veli Görüşmesi",
  title: "Test görüşmesi",
  subtitle: "Test",
  isMock: true,
});

describe("getMonthGridDays", () => {
  it("starts the grid on a Monday and covers the full month", () => {
    const days = getMonthGridDays(new Date("2026-08-15"));
    expect(days[0].getDay()).toBe(1);
    expect(days.some(day => day.getDate() === 1 && day.getMonth() === 7)).toBe(
      true
    );
    expect(days.some(day => day.getDate() === 31 && day.getMonth() === 7)).toBe(
      true
    );
  });
});

describe("getEventsForDay", () => {
  it("filters events matching the given day", () => {
    const events = [
      event("2026-08-21", "e1"),
      event("2026-08-22", "e2"),
      event("2026-08-21", "e3"),
    ];
    expect(getEventsForDay(events, new Date("2026-08-21"))).toHaveLength(2);
    expect(getEventsForDay(events, new Date("2026-08-23"))).toHaveLength(0);
  });
});

describe("getTodayTaskCount", () => {
  it("counts only Bugün and Odaklan tasks", () => {
    const tasks = [
      task("Planla", "t1"),
      task("Bugün", "t2"),
      task("Odaklan", "t3"),
      task("Tamamlandı", "t4"),
    ];
    expect(getTodayTaskCount(tasks)).toBe(2);
  });

  it("returns 0 for an empty list", () => {
    expect(getTodayTaskCount([])).toBe(0);
  });
});

describe("getTaskCompletionPercent", () => {
  it("returns 0 for an empty list", () => {
    expect(getTaskCompletionPercent([])).toBe(0);
  });

  it("rounds the completed ratio to a whole percent", () => {
    const tasks = [
      task("Tamamlandı", "t1"),
      task("Bugün", "t2"),
      task("Planla", "t3"),
    ];
    expect(getTaskCompletionPercent(tasks)).toBe(33);
  });
});
