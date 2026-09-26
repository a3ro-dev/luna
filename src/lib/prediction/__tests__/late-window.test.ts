import { describe, expect, it } from "vitest";
import {
  CYCLE_SCALE,
  describeForecast,
  diffDays,
  forecast,
  lateSkipMixture,
  MODEL_VERSION,
  predictMetric,
  resolveForecastPrior,
} from "../forecast";
// Frozen experiment code the production port must match (autoresearch R2-3 / R3).
import { lateModels } from "../../../../autoresearch/experiments/R2-3-late-skip-mixture/model-a";

const starts = (...s: string[]) => s.map((mStart) => ({ mStart, mEnd: null }));
const history = starts("2026-01-05", "2026-02-02", "2026-03-02", "2026-03-31", "2026-04-28");

describe("late window (forecast-v2.1.0)", () => {
  it("bumps the model version", () => {
    expect(MODEL_VERSION).toBe("forecast-v2.1.0");
  });

  it("gives a window once late, starting no earlier than today", () => {
    const today = "2026-06-08"; // day 41 after the last start: past the window, within the gate
    const f = forecast(history, { conditions: [], today });
    expect(f.status).toBe("late");
    expect(f.ifNotStartedYet).not.toBeNull();
    expect(f.ifNotStartedYet!.earliest >= today).toBe(true);
    expect(diffDays(f.ifNotStartedYet!.earliest, f.ifNotStartedYet!.latest)).toBeGreaterThan(3);
    expect(describeForecast(f).status).toContain("If it hasn't started yet");
    expect(describeForecast(f).status).toContain("may not have been logged");
  });

  it("leaves the in-window and upcoming behaviour unchanged", () => {
    const upcoming = forecast(history, { conditions: [], today: "2026-05-10" });
    expect(upcoming.status).toBe("upcoming");
    expect(upcoming.ifNotStartedYet).toBeNull();
  });

  it("matches the frozen A-c23 experiment code exactly", () => {
    const cases: Array<[number[], string[], number]> = [
      [[28, 29, 27, 28], [], 36],
      [[28, 57, 29], [], 40],
      [[33, 41, 29, 38], ["irregular"], 60],
      [[], [], 38],
    ];
    for (const [past, conditions, t0] of cases) {
      const prior = resolveForecastPrior(conditions);
      const m = predictMetric(past, prior.cycle, prior.gate, 0.8, CYCLE_SCALE);
      const prod = lateSkipMixture(past, m, prior.gate, t0);
      const frozen = lateModels["A-c23"](past, { conditions }, t0)!;
      expect(prod.median).toBeCloseTo(frozen.point, 9);
      expect(prod.lower).toBeCloseTo(frozen.lo80!, 9);
      expect(prod.upper).toBeCloseTo(frozen.hi80!, 9);
    }
  });

  it("leans toward a missed log for people with set-aside long gaps", () => {
    const prior = resolveForecastPrior([]);
    const clean = predictMetric([28, 28, 29, 27], prior.cycle, prior.gate, 0.8, CYCLE_SCALE);
    // One long gap is set aside as a possible missed log (two would count as a pattern).
    const skippy = predictMetric([28, 56, 28, 29], prior.cycle, prior.gate, 0.8, CYCLE_SCALE);
    const a = lateSkipMixture([28, 28, 29, 27], clean, prior.gate, 38);
    const b = lateSkipMixture([28, 56, 28, 29], skippy, prior.gate, 38);
    expect(b.skipWeight).toBeGreaterThan(a.skipWeight);
  });
});
