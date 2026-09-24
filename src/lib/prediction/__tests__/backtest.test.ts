import { describe, expect, it } from "vitest";
import {
  MODELS,
  runBacktest,
  summarize,
  syntheticCohort,
  type History,
} from "../backtest";

describe("rolling-origin evaluation", () => {
  it("does not let a changed future observation alter earlier forecasts", () => {
    const base: History = {
      userKey: "u1",
      conditions: [],
      cycles: [
        { mStart: "2026-01-01", mEnd: "2026-01-05" },
        { mStart: "2026-01-29", mEnd: "2026-02-02" },
        { mStart: "2026-02-26", mEnd: "2026-03-02" },
        { mStart: "2026-03-26", mEnd: "2026-03-30" },
      ],
    };
    const changed: History = {
      ...base,
      cycles: [...base.cycles.slice(0, 3), { mStart: "2026-05-20", mEnd: null }],
    };
    const a = runBacktest([base], "cycle", { candidate: MODELS["v2-bayes"] });
    const b = runBacktest([changed], "cycle", { candidate: MODELS["v2-bayes"] });
    expect(a.slice(0, 2).map((row) => row.preds.candidate)).toEqual(
      b.slice(0, 2).map((row) => row.preds.candidate),
    );
  });

  it("meets the predeclared synthetic calibration and non-inferiority gates", () => {
    const rows = runBacktest(
      syntheticCohort({
        users: 400,
        seed: 42,
        missedLog: 0.05,
        doubleLog: 0.02,
        irregularShare: 0.15,
      }),
      "cycle",
    );
    const current = summarize(rows, "v1-current");
    const candidate = summarize(rows, "v2-bayes");
    const cold = rows.filter((row) => row.nPast <= 2);
    expect(candidate.coverage80).toBeGreaterThanOrEqual(0.75);
    expect(candidate.coverage80).toBeLessThanOrEqual(0.88);
    expect(candidate.macroMae).toBeLessThanOrEqual(current.macroMae + 0.25);
    expect(summarize(cold, "v2-bayes").mae).toBeLessThanOrEqual(
      summarize(cold, "v1-current").mae,
    );
  });
});
