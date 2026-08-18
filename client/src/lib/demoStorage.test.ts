import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __writeRawForTest,
  clearDemoData,
  readDemoData,
  writeDemoData,
} from "./demoStorage";

describe("demoStorage", () => {
  const key = `test-${Math.random().toString(36).slice(2)}`;

  afterEach(() => {
    clearDemoData(key);
  });

  it("returns the fallback when nothing is stored yet", () => {
    expect(readDemoData(key, { seeded: true })).toEqual({ seeded: true });
  });

  it("round-trips a written value", () => {
    writeDemoData(key, { count: 3 });
    expect(readDemoData(key, { count: 0 })).toEqual({ count: 3 });
  });

  it("falls back and warns on malformed JSON", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    __writeRawForTest(key, "{not valid json");

    expect(readDemoData(key, "fallback")).toBe("fallback");
    expect(warnSpy).toHaveBeenCalledOnce();

    warnSpy.mockRestore();
  });

  it("clearDemoData removes a previously written key", () => {
    writeDemoData(key, "value");
    clearDemoData(key);
    expect(readDemoData(key, "fallback")).toBe("fallback");
  });
});
