/**
 * H6 prior sensitivity: forecast-v2 predictMetric with NU0, the cycle
 * within-person SD prior and HISTORY_WINDOW exposed as knobs. Defaults
 * (nu0 4, withinScale 1, window 12) reproduce production v2-bayes exactly.
 * The one-at-a-time sweep lives in sweep.mts; `models` holds the variants
 * carried to the locked harness.
 */
import { normInv, resolveForecastPrior, usableMask, CYCLE_SCALE, type MetricPrior } from "../../../src/lib/prediction/forecast.ts";
import type { Model, Pred } from "../../../src/lib/prediction/backtest.ts";

export interface Knobs {
  nu0?: number;
  /** Multiplier on the CYCLE within-person SD prior (base 4 d, irregular 9 d, ...). Period prior untouched. */
  withinScale?: number;
  window?: number;
}

function predict(obs: number[], prior: MetricPrior, gate: { min: number; max: number } | null, log: boolean, k: Required<Knobs>): Pred {
  const finite = obs.filter((x) => Number.isFinite(x) && x > 0);
  const mask = gate ? usableMask(finite, gate) : finite.map(() => true);
  const used = finite.filter((_, i) => mask[i]);
  const toLogSd = (sd: number) => Math.sqrt(Math.log(1 + (sd / prior.mean) ** 2));
  const m0 = log ? Math.log(prior.mean) : prior.mean;
  const t0 = (log ? toLogSd(prior.betweenSd) : prior.betweenSd) ** 2;
  const s0 = (log ? toLogSd(prior.withinSd) : prior.withinSd) ** 2;
  const xs = used.slice(-k.window).map((x) => (log ? Math.log(x) : x));
  const n = xs.length;
  const xbar = n > 0 ? xs.reduce((a, b) => a + b, 0) / n : 0;
  const ss = xs.reduce((a, x) => a + (x - xbar) ** 2, 0);
  const sigma2 = (k.nu0 * s0 + ss) / (k.nu0 + Math.max(n - 1, 0));
  const precision = 1 / t0 + n / sigma2;
  const mu = (m0 / t0 + (n * xbar) / sigma2) / precision;
  const s = Math.sqrt(sigma2 + 1 / precision);
  const q = (p: number) => (log ? Math.exp(mu + s * normInv(p)) : mu + s * normInv(p));
  return { point: q(0.5), lo80: q(0.1), hi80: q(0.9), lo95: q(0.025), hi95: q(0.975) };
}

export function makeModel(knobs: Knobs = {}): Model {
  const k = { nu0: 4, withinScale: 1, window: 12, ...knobs };
  return (past, ctx, t) => {
    const p = resolveForecastPrior(ctx.conditions, ctx.perimenoStage);
    if (t === "period") return predict(past, p.period, null, false, k);
    const cycle = { ...p.cycle, withinSd: p.cycle.withinSd * k.withinScale };
    return predict(past, cycle, p.gate, CYCLE_SCALE === "log", k);
  };
}

// CONFIRMATORY: one representative per protocol axis, picked from sweep.mts
// (best-calibrated NU0; both directions of the within-SD prior; shorter window).
export const models: Record<string, Model> = {
  "H6-nu1": makeModel({ nu0: 1 }),
  "H6-sd0.75": makeModel({ withinScale: 0.75 }),
  "H6-sd1.25": makeModel({ withinScale: 1.25 }),
  "H6-win6": makeModel({ window: 6 }),
};
