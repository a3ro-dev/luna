import { describe, expect, it } from "vitest";
import { todayLine } from "./line";

const ring = (day: number, start: number, end: number) => ({
  day,
  length: Math.max(end, day) + 1,
  periodDays: 5,
  window: { start, end },
  ovulation: null,
});
const phase = (key: "period" | "follicular" | "luteal" | "late") => ({ key, label: "", estimated: key !== "period" });

describe("todayLine", () => {
  it("counts days to the likely window from props", () => {
    // Day 16 is offset 15; window offsets 25..30 are 10..15 days away.
    expect(todayLine({ ring: ring(16, 25, 30), dayOfCycle: 16, periodDay: null, phase: phase("luteal") })).toBe(
      "Your next period will likely come in 10 to 15 days.",
    );
    expect(todayLine({ ring: ring(28, 28, 28), dayOfCycle: 28, periodDay: null, phase: phase("luteal") })).toContain("tomorrow");
  });

  it("says in-window, late and on-period plainly", () => {
    expect(todayLine({ ring: ring(29, 27, 31), dayOfCycle: 29, periodDay: null, phase: phase("luteal") })).toContain("likely window");
    const late = "No new period logged yet. That's later than usual for you.";
    expect(todayLine({ ring: ring(39, 26, 31), dayOfCycle: 39, periodDay: null, phase: phase("late") })).toBe(late);
    // Long gap (past gate.max): may be an unlogged period, so never assert one long cycle.
    expect(todayLine({ ring: ring(52, 26, 31), dayOfCycle: 52, periodDay: null, phase: phase("late") })).toBe(late);
    expect(todayLine({ ring: ring(2, 25, 30), dayOfCycle: 2, periodDay: 2, phase: phase("period") })).toBe("You're on your period. Go gently.");
    expect(todayLine({ ring: null, dayOfCycle: 3, periodDay: 3, phase: phase("period") })).toBe("Day 3 of your period. Go gently.");
  });

  it("lets the forecast, not a forgotten end, decide the period wording", () => {
    // Open period on day 13 with no logged end, but the forecast says upcoming.
    expect(todayLine({ ring: ring(13, 25, 30), dayOfCycle: 13, periodDay: 13, phase: phase("follicular") })).toBe(
      "Your next period will likely come in 13 to 18 days.",
    );
  });

  it("falls back without a forecast", () => {
    expect(todayLine({ ring: null, dayOfCycle: null, periodDay: null, phase: null })).toMatch(/^Log when your last period started/);
    expect(todayLine({ ring: null, dayOfCycle: 9, periodDay: null, phase: null })).toBe("Day 9 of your cycle.");
  });
});
