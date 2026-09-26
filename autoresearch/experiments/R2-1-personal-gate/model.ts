/**
 * R2-1 personal missed-log gate (day-0 track, harness v2).
 *
 * Once a person has >= 3 intervals inside the population gate (last
 * HISTORY_WINDOW of them), the upper gate becomes the AWHS artifact rule
 *   pmax = clamp(median + MACD + 15, 1.5 * median, gate.max)
 * (MACD = median absolute consecutive difference of those in-gate intervals).
 * The lower gate is unchanged. Period target delegates to v2-bayes.
 *
 * Declared before the first run:
 *   CONFIRMATORY  R21-gate         pmax replaces gate.max in usableMask (pattern rule counts gaps > pmax)
 *   CONFIRMATORY  R21-gate-2x      R21-gate + protocol option: |x / (2 median) - 1| <= 0.2 also flagged
 *                                   (flagged gaps count as "long" for the pattern rule)
 *   EXPLORATORY   R21-gate-reg     R21-gate only for base-gate profiles (gate.max <= 45): the
 *                                   short-cycle 2 x 22 = 44 d case the protocol is motivated by
 *   EXPLORATORY   R21-gate-poppat  pattern rule still judged on the population gate; pmax only
 *                                   adds exclusions when that rule does not fire
 *   EXPLORATORY   R21-gate-trunc   late track: R21-gate predictive truncated at t0 (as v2-trunc)
 */
import { CYCLE_SCALE, HISTORY_WINDOW, metricCdf, metricQuantile, predictMetric, resolveForecastPrior, usableMask } from "../../../src/lib/prediction/forecast.ts";
import type { MetricForecast } from "../../../src/lib/prediction/forecast.ts";
import { MODELS } from "../../../src/lib/prediction/backtest.ts";
import type { Ctx, Model, Pred } from "../../../src/lib/prediction/backtest.ts";
import type { LateModel } from "../../src/eval2.mts";

type Gate = { min: number; max: number };
type Mode = "literal" | "2x" | "poppat";

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Personal median and AWHS upper gate, or null with < 3 in-gate intervals. */
export function personalGate(past: number[], gate: Gate): { med: number; max: number } | null {
  const g = past.filter((x) => x >= gate.min && x <= gate.max).slice(-HISTORY_WINDOW);
  if (g.length < 3) return null;
  const med = median(g);
  const macd = median(g.slice(1).map((x, i) => Math.abs(x - g[i])));
  return { med, max: Math.min(gate.max, Math.max(1.5 * med, med + macd + 15)) };
}

/** Which past intervals inform the fit (mirrors forecast.ts usableMask). */
export function mask(xs: number[], gate: Gate, mode: Mode): boolean[] {
  const pg = personalGate(xs, gate);
  if (!pg) return usableMask(xs, gate); // < 3 in-gate intervals: production rule unchanged
  const long = (x: number) => x > pg.max || (mode === "2x" && Math.abs(x / (2 * pg.med) - 1) <= 0.2);
  const recent = xs.slice(-6);
  const isPattern = mode === "poppat"
    ? recent.filter((x) => x > gate.max).length >= 2
    : recent.filter(long).length >= 2;
  return xs.map((x) => x >= gate.min && (isPattern || !long(x)));
}

function predictive(past: number[], ctx: Ctx, mode: Mode): MetricForecast {
  const p = resolveForecastPrior(ctx.conditions, ctx.perimenoStage);
  const xs = past.filter((x) => Number.isFinite(x) && x > 0);
  const m = mask(xs, p.gate, mode);
  // Pre-filtered, so predictMetric's own gate is off; it still keeps the last HISTORY_WINDOW.
  return predictMetric(xs.filter((_, i) => m[i]), p.cycle, null, 0.8, CYCLE_SCALE);
}

const make = (mode: Mode, baseGateOnly = false): Model => (past, ctx, t) => {
  if (t !== "cycle") return MODELS["v2-bayes"](past, ctx, t);
  if (baseGateOnly && resolveForecastPrior(ctx.conditions, ctx.perimenoStage).gate.max > 45) return MODELS["v2-bayes"](past, ctx, t);
  const m = predictive(past, ctx, mode);
  return {
    point: m.mean, lo80: m.lower, hi80: m.upper,
    lo95: metricQuantile(m, 0.025), hi95: metricQuantile(m, 0.975),
    cdf: (y: number) => metricCdf(m, y),
  } as Pred;
};

/** Same truncation as eval2's v2Trunc, on the R21-gate predictive. */
const trunc: LateModel = (past, ctx, t0) => {
  const m = predictive(past, ctx, "literal");
  const f0 = metricCdf(m, t0 - 0.5);
  if (f0 >= 1 - 1e-9) return { point: t0, lo80: t0, hi80: t0 + 1 };
  const q = (p: number) => metricQuantile(m, f0 + p * (1 - f0));
  return { point: q(0.5), lo80: q(0.1), hi80: q(0.9) };
};

export const models: Record<string, Model> = {
  "R21-gate": make("literal"),
  "R21-gate-2x": make("2x"),
  "R21-gate-reg": make("literal", true),
  "R21-gate-poppat": make("poppat"),
};

export const lateModels: Record<string, LateModel> = { "R21-gate-trunc": trunc };

// Self-check (node model.ts): 2 x 22 = 44 d double is set aside for a short-cycle user.
// Note: with <= ~5 intervals the double's own consecutive differences inflate MACD and it is NOT caught.
if (process.argv[1]?.endsWith("model.ts")) {
  const { strict: assert } = await import("node:assert");
  const g = { min: 15, max: 45 };
  const xs = [22, 23, 21, 22, 23, 21, 44, 22];
  assert.ok(personalGate(xs, g)!.max < 44, "pmax below 44 for a 22 d user");
  assert.deepEqual(mask(xs, g, "literal"), [true, true, true, true, true, true, false, true]);
  assert.equal(personalGate([22, 23, 21, 44, 22], g)!.max, 45, "short history: MACD inflated, gate stays at 45");
  assert.ok(mask([...xs, 43], g, "literal").every(Boolean), "two long gaps in last 6 = pattern");
  assert.equal(personalGate([28, 29], g), null, "needs >= 3 in-gate intervals");
  assert.deepEqual(mask([50, 60, 28], g, "literal"), [true, true, true], "fallback keeps production pattern rule");
  console.log("self-check ok");
}
