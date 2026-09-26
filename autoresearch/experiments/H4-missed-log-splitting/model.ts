/**
 * H4 missed-log splitting. An interval close to k x the person's typical
 * length (k = 2, 3) is read as k merged cycles and replaced by x/k.
 *
 * Declared before the first run:
 *   CONFIRMATORY  H4-copies  x/k entered as k separate observations (protocol option A, literal)
 *   CONFIRMATORY  H4-one     x/k entered as one observation         (protocol option B)
 *   EXPLORATORY   H4-wdof    x/k with weight k on the mean but one degree of freedom on the
 *                            variance (the statistically exact reading of a sum of k cycles)
 *   EXPLORATORY   H4-one-t15 H4-one with a tighter match tolerance (0.15 instead of 0.20)
 * Round 1 (all four above) is archived in results/eval-round1.json. Round 2, added after
 * diag.mts showed every loss came from irregular-profile users (wide gate, genuinely long
 * right-skewed cycles halved against the 29 d prior at cold start), swaps the two
 * round-1 exploratory variants for:
 *   EXPLORATORY   H4-one-reg   H4-one, but only for profiles on the base gate (gate.max <= 45)
 *   EXPLORATORY   H4-wdof-reg  H4-wdof, same restriction
 *
 * Typical length r = median of the recent non-short intervals when there are
 * at least 3, else the population prior mean. Match rule: |x / (k r) - 1| <= tol.
 * The period target is untouched (delegates to v2-bayes).
 */
import { CYCLE_SCALE, HISTORY_WINDOW, INTERVAL_LEVEL, NU0, metricQuantile, normInv, resolveForecastPrior, usableMask } from "../../../src/lib/prediction/forecast.ts";
import type { MetricForecast, MetricPrior } from "../../../src/lib/prediction/forecast.ts";
import { MODELS } from "../../../src/lib/prediction/backtest.ts";
import type { Model } from "../../../src/lib/prediction/backtest.ts";

type Mode = "copies" | "one" | "wdof";
type Obs = { v: number; w: number; dof: number };

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** predictMetric (forecast.ts) with split handling; weights/dof only differ from 1 in "copies"/"wdof". */
function predictSplit(observations: number[], prior: MetricPrior, gate: { min: number; max: number }, mode: Mode, tol: number): MetricForecast {
  const finite = observations.filter((x) => Number.isFinite(x) && x > 0);
  const ok = finite.filter((x) => x >= gate.min).slice(-HISTORY_WINDOW);
  const r = ok.length >= 3 ? median(ok) : prior.mean;
  const kOf = (x: number) => [2, 3].find((k) => Math.abs(x / (k * r) - 1) <= tol) ?? 1;
  const ks = finite.map(kOf);
  const vals = finite.map((x, i) => x / ks[i]);
  // Split values now sit near r, so the existing gate only sees what was not split.
  const mask = usableMask(vals, gate);
  const obs: Obs[] = [];
  // Same window as production: the last HISTORY_WINDOW usable intervals, then expand.
  const idx = vals.map((_, i) => i).filter((i) => mask[i]).slice(-HISTORY_WINDOW);
  idx.forEach((i) => {
    const v = vals[i];
    const k = ks[i];
    if (mode === "copies") for (let j = 0; j < k; j++) obs.push({ v, w: 1, dof: 1 });
    else obs.push({ v, w: mode === "wdof" ? k : 1, dof: 1 });
  });

  const log = CYCLE_SCALE === "log";
  const toLogSd = (sd: number) => Math.sqrt(Math.log(1 + (sd / prior.mean) ** 2));
  const m0 = log ? Math.log(prior.mean) : prior.mean;
  const t0 = (log ? toLogSd(prior.betweenSd) : prior.betweenSd) ** 2;
  const s0 = (log ? toLogSd(prior.withinSd) : prior.withinSd) ** 2;
  const xs = obs.map((o) => ({ ...o, v: log ? Math.log(o.v) : o.v }));
  const n = xs.reduce((a, o) => a + o.w, 0);
  const dof = xs.reduce((a, o) => a + o.dof, 0);
  const xbar = n > 0 ? xs.reduce((a, o) => a + o.w * o.v, 0) / n : 0;
  const ss = xs.reduce((a, o) => a + o.w * (o.v - xbar) ** 2, 0);
  const sigma2 = (NU0 * s0 + ss) / (NU0 + Math.max(dof - 1, 0));
  const precision = 1 / t0 + n / sigma2;
  const mu = (m0 / t0 + (n * xbar) / sigma2) / precision;
  const s = Math.sqrt(sigma2 + 1 / precision);
  const z = normInv(0.5 + INTERVAL_LEVEL / 2);
  const back = (v: number) => (log ? Math.exp(v) : v);
  const lower = back(mu - z * s);
  const upper = back(mu + z * s);
  return {
    mean: back(mu), sd: (upper - lower) / (2 * z), lower, upper,
    nUsed: obs.length, nExcluded: finite.length - mask.filter(Boolean).length,
    withinSd: Math.sqrt(sigma2), scale: log ? "log" : "linear", mu, s,
  };
}

export const make = (mode: Mode, tol = 0.2, baseGateOnly = false): Model => (past, ctx, t) => {
  if (t !== "cycle") return MODELS["v2-bayes"](past, ctx, t);
  const p = resolveForecastPrior(ctx.conditions, ctx.perimenoStage);
  // Wide-gate profiles (irregular, PCOS, thyroid, perimenopause, BC) keep production behaviour.
  if (baseGateOnly && p.gate.max > 45) return MODELS["v2-bayes"](past, ctx, t);
  const m = predictSplit(past, p.cycle, p.gate, mode, tol);
  return { point: m.mean, lo80: m.lower, hi80: m.upper, lo95: metricQuantile(m, 0.025), hi95: metricQuantile(m, 0.975) };
};

export const models: Record<string, Model> = {
  "H4-copies": make("copies"),
  "H4-one": make("one"),
  "H4-one-reg": make("one", 0.2, true),
  "H4-wdof-reg": make("wdof", 0.2, true),
};
