/**
 * H2 recency weighting. Same conjugate log-normal predictive as forecast-v2
 * (src/lib/prediction/forecast.ts predictMetric), but past intervals get
 * exponential-decay weights w = 0.5^(age / halfLife) in the mean and the
 * within-person variance, and the Kish effective sample size
 * nEff = (sum w)^2 / sum w^2 replaces n in the conjugate update.
 *
 * Age counts cycles back in time over ALL finite intervals (a set-aside gap
 * still ages the data before it). Weighting applies to the cycle target only;
 * the period target is left identical to v2 so period metrics stay a control.
 */
import {
  CYCLE_SCALE, HISTORY_WINDOW, INTERVAL_LEVEL, NU0, metricQuantile, normInv, predictMetric, resolveForecastPrior, usableMask,
  type MetricForecast, type MetricPrior,
} from "../../../src/lib/prediction/forecast.ts";
import { MODELS, type Model } from "../../../src/lib/prediction/backtest.ts";

interface Opts {
  halfLife: number;
  /** Weight the variance too (protocol) or only the mean (exploratory). */
  weightVar: boolean;
  /** Most recent usable intervals considered (production 12). */
  window: number;
}

export function predictWeighted(observations: number[], prior: MetricPrior, gate: { min: number; max: number }, o: Opts): MetricForecast {
  const finite = observations.filter((x) => Number.isFinite(x) && x > 0);
  const mask = usableMask(finite, gate);
  const last = finite.length - 1;
  const usedAll = finite.map((x, i) => ({ x: Math.log(x), w: 0.5 ** ((last - i) / o.halfLife) })).filter((_, i) => mask[i]);
  const used = usedAll.slice(-o.window);
  const toLogSd = (sd: number) => Math.sqrt(Math.log(1 + (sd / prior.mean) ** 2));
  const m0 = Math.log(prior.mean);
  const t0 = toLogSd(prior.betweenSd) ** 2;
  const s0 = toLogSd(prior.withinSd) ** 2;
  const n = used.length;
  const W = used.reduce((a, u) => a + u.w, 0);
  const W2 = used.reduce((a, u) => a + u.w * u.w, 0);
  const nEff = n > 0 ? (W * W) / W2 : 0;
  const xbar = n > 0 ? used.reduce((a, u) => a + u.w * u.x, 0) / W : 0;
  let ss: number;
  let df: number;
  if (o.weightVar) {
    // Reliability-weighted SS rescaled to nEff - 1 degrees of freedom.
    ss = n > 0 ? (used.reduce((a, u) => a + u.w * (u.x - xbar) ** 2, 0) * nEff) / W : 0;
    df = Math.max(nEff - 1, 0);
  } else {
    const ubar = n > 0 ? used.reduce((a, u) => a + u.x, 0) / n : 0;
    ss = used.reduce((a, u) => a + (u.x - ubar) ** 2, 0);
    df = Math.max(n - 1, 0);
  }
  const sigma2 = (NU0 * s0 + ss) / (NU0 + df);
  const precision = 1 / t0 + nEff / sigma2;
  const mu = (m0 / t0 + (nEff * xbar) / sigma2) / precision;
  const s = Math.sqrt(sigma2 + 1 / precision);
  const z = normInv(0.5 + INTERVAL_LEVEL / 2);
  const lower = Math.exp(mu - z * s);
  const upper = Math.exp(mu + z * s);
  return {
    mean: Math.exp(mu), sd: (upper - lower) / (2 * z), lower, upper,
    nUsed: n, nExcluded: finite.length - usedAll.length, withinSd: Math.sqrt(sigma2), scale: "log", mu, s,
  };
}

const make = (o: Opts): Model => (past, ctx, t) => {
  if (t !== "cycle") return MODELS["v2-bayes"](past, ctx, t);
  const p = resolveForecastPrior(ctx.conditions, ctx.perimenoStage);
  const m = predictWeighted(past, p.cycle, p.gate, o);
  return { point: m.mean, lo80: m.lower, hi80: m.upper, lo95: metricQuantile(m, 0.025), hi95: metricQuantile(m, 0.975) };
};

export const models: Record<string, Model> = {
  // CONFIRMATORY (protocol: half-life 4-8, mean + variance, nEff update)
  "H2-hl4": make({ halfLife: 4, weightVar: true, window: HISTORY_WINDOW }),
  "H2-hl6": make({ halfLife: 6, weightVar: true, window: HISTORY_WINDOW }),
  "H2-hl8": make({ halfLife: 8, weightVar: true, window: HISTORY_WINDOW }),
  // EXPLORATORY: weight the mean only, keep the unweighted variance
  "H2-hl6-meanonly": make({ halfLife: 6, weightVar: false, window: HISTORY_WINDOW }),
  // EXPLORATORY: weaker decay, to check the half-life curve converges to v2 without crossing below it
  "H2-hl16": make({ halfLife: 16, weightVar: true, window: HISTORY_WINDOW }),
  // EXPLORATORY: decay only for profiles with no condition (low within-person noise, where drift matters most)
  "H2-hl6-regonly": (past, ctx, t) =>
    ctx.conditions.length ? MODELS["v2-bayes"](past, ctx, t) : make({ halfLife: 6, weightVar: true, window: HISTORY_WINDOW })(past, ctx, t),
};

// Self-check: infinite half-life must reproduce production predictMetric exactly.
{
  const xs = [28, 31, 12, 29, 60, 27, 30, 33, 26, 29, 28, 31, 30, 27];
  const p = resolveForecastPrior([]);
  const a = predictWeighted(xs, p.cycle, p.gate, { halfLife: Infinity, weightVar: true, window: HISTORY_WINDOW });
  const b = predictMetric(xs, p.cycle, p.gate, INTERVAL_LEVEL, CYCLE_SCALE);
  if (Math.abs(a.mu - b.mu) > 1e-12 || Math.abs(a.s - b.s) > 1e-12) throw new Error("H2 self-check: hl=Inf != v2");
}
