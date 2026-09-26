/**
 * R2-6 clean-cycle width: forecast-v2 predictMetric, except that users on the
 * BASE cycle profile (no condition widened the within-person SD prior) whose
 * history has no set-aside interval get a narrower within-person SD prior.
 * Users with any set-aside interval, or any condition profile, keep v2 exactly.
 * cleanSd = 4 reproduces v2-bayes (asserted in diag.mts).
 */
import { normInv, normCdf, resolveForecastPrior, usableMask, CYCLE_SCALE, HISTORY_WINDOW, NU0 } from "../../../src/lib/prediction/forecast.ts";
import { MODELS, type Model, type Pred } from "../../../src/lib/prediction/backtest.ts";

const BASE_WITHIN = 4; // BASE.cycle.withinSd in forecast.ts

export interface Opts {
  /** Within-person SD prior (days) for clean base-profile users. */
  cleanSd: number;
  /** Minimum usable intervals before a history counts as clean (0 = empty history counts). */
  minClean?: number;
  /** Narrow only the predictive spread; the location keeps v2's posterior mean. */
  widthOnly?: boolean;
}

/** Is this forecast on the narrowed (clean) branch? Uses only past + ctx. */
export function isClean(past: number[], conditions: string[], perimenoStage: Parameters<typeof resolveForecastPrior>[1], minClean = 0) {
  const p = resolveForecastPrior(conditions, perimenoStage);
  if (p.cycle.withinSd !== BASE_WITHIN) return false;
  const finite = past.filter((x) => Number.isFinite(x) && x > 0);
  const mask = usableMask(finite, p.gate);
  return mask.every(Boolean) && finite.length >= minClean;
}

export function makeModel(o: Opts): Model {
  return (past, ctx, t) => {
    if (t === "period") return MODELS["v2-bayes"](past, ctx, t);
    const p = resolveForecastPrior(ctx.conditions, ctx.perimenoStage);
    const clean = isClean(past, ctx.conditions, ctx.perimenoStage, o.minClean ?? 0);
    const prior = p.cycle;
    const log = CYCLE_SCALE === "log";
    const finite = past.filter((x) => Number.isFinite(x) && x > 0);
    const mask = usableMask(finite, p.gate);
    const xs = finite.filter((_, i) => mask[i]).slice(-HISTORY_WINDOW).map((x) => (log ? Math.log(x) : x));
    const toLogSd = (sd: number) => Math.sqrt(Math.log(1 + (sd / prior.mean) ** 2));
    const m0 = log ? Math.log(prior.mean) : prior.mean;
    const t0 = (log ? toLogSd(prior.betweenSd) : prior.betweenSd) ** 2;
    const n = xs.length;
    const xbar = n > 0 ? xs.reduce((a, b) => a + b, 0) / n : 0;
    const ss = xs.reduce((a, x) => a + (x - xbar) ** 2, 0);
    const post = (withinSd: number) => {
      const s0 = (log ? toLogSd(withinSd) : withinSd) ** 2;
      const sigma2 = (NU0 * s0 + ss) / (NU0 + Math.max(n - 1, 0));
      const precision = 1 / t0 + n / sigma2;
      return { mu: (m0 / t0 + (n * xbar) / sigma2) / precision, s: Math.sqrt(sigma2 + 1 / precision) };
    };
    const wide = post(prior.withinSd);
    const narrow = clean ? post(o.cleanSd) : wide;
    const mu = o.widthOnly ? wide.mu : narrow.mu;
    const s = narrow.s;
    const back = (v: number) => (log ? Math.exp(v) : v);
    const q = (pr: number) => back(mu + s * normInv(pr));
    const cdf = (y: number) => normCdf(((log ? Math.log(Math.max(y, 1e-9)) : y) - mu) / s);
    return { point: back(mu), lo80: q(0.1), hi80: q(0.9), lo95: q(0.025), hi95: q(0.975), cdf } as Pred;
  };
}

export const models: Record<string, Model> = {
  // CONFIRMATORY (protocol): clean base-profile histories 4 -> 3 d, everyone else unchanged.
  "R26-clean3": makeModel({ cleanSd: 3 }),
  // EXPLORATORY: dose (4 -> 3.5 d).
  "R26-clean3.5": makeModel({ cleanSd: 3.5 }),
  // EXPLORATORY: only narrow once >= 3 clean intervals exist (cold start keeps 4 d).
  "R26-clean3-n3": makeModel({ cleanSd: 3, minClean: 3 }),
  // EXPLORATORY: narrow the spread only; the point forecast stays v2's.
  "R26-clean3-wonly": makeModel({ cleanSd: 3, widthOnly: true }),
};
