/**
 * H1 robust location -- candidates for the locked harness.
 *
 * Same log-scale conjugate normal as forecast-v2 (prior, NU0 pseudo-obs,
 * posterior predictive, gate, 12-interval window) but the sample mean and/or
 * the sample sum of squares are replaced with robust counterparts:
 *   - location: Huber M-estimate (k = 1.345, IRLS from the median), with the
 *     cutoff scaled by the prior-shrunk MAD scale so it never collapses to 0;
 *   - scale: MAD * 1.4826 with a small-sample variance correction, entered
 *     as ss = (n - 1) * madVar so the NU0 prior update is unchanged.
 * Only the cycle target changes; the period target is the baseline v2 path.
 */
import { MODELS, type Model } from "../../../src/lib/prediction/backtest.ts";
import {
  HISTORY_WINDOW, NU0, metricQuantile, normInv, resolveForecastPrior, usableMask,
  type MetricForecast, type MetricPrior,
} from "../../../src/lib/prediction/forecast.ts";

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * E[(1.4826 * MAD)^2] = VARC[n]^-1 * sigma^2 for Normal samples of size n,
 * simulated (200k reps). n > 12 never occurs (HISTORY_WINDOW = 12).
 */
const VARC: Record<number, number> = { 2: 0.912, 3: 1.316, 4: 1.396, 5: 1.107, 6: 1.153, 7: 1.052, 8: 1.084, 9: 1.032, 10: 1.057, 11: 1.025, 12: 1.041 };

export type Loc = "mean" | "huber" | "median" | "trim";
export type Scale = "classic" | "mad";

export function robustPredict(
  observations: number[], prior: MetricPrior, gate: { min: number; max: number }, loc: Loc, scale: Scale, hk = 1.345, level = 0.8,
): MetricForecast {
  const finite = observations.filter((x) => Number.isFinite(x) && x > 0);
  const mask = usableMask(finite, gate);
  const used = finite.filter((_, i) => mask[i]);
  const toLogSd = (sd: number) => Math.sqrt(Math.log(1 + (sd / prior.mean) ** 2));
  const m0 = Math.log(prior.mean);
  const t0 = toLogSd(prior.betweenSd) ** 2;
  const s0 = toLogSd(prior.withinSd) ** 2;
  const xs = used.slice(-HISTORY_WINDOW).map(Math.log);
  const n = xs.length;
  const df = Math.max(n - 1, 0);

  const xbar = n > 0 ? avg(xs) : 0;
  const med = n > 0 ? median(xs) : 0;
  const madVar = n >= 2 ? (1.4826 * median(xs.map((x) => Math.abs(x - med)))) ** 2 * (VARC[n] ?? 1) : 0;
  const robustSigma2 = (NU0 * s0 + df * madVar) / (NU0 + df);
  const ss = scale === "mad" ? df * madVar : xs.reduce((a, x) => a + (x - xbar) ** 2, 0);
  const sigma2 = (NU0 * s0 + ss) / (NU0 + df);

  let center = xbar;
  if (n > 0 && loc === "median") center = med;
  if (n > 0 && loc === "trim") {
    const g = Math.floor(0.2 * n);
    center = avg([...xs].sort((a, b) => a - b).slice(g, n - g));
  }
  if (n > 0 && loc === "huber") {
    const k = hk * Math.sqrt(robustSigma2);
    center = med;
    for (let it = 0; it < 50; it++) {
      const w = xs.map((x) => Math.min(1, k / Math.max(Math.abs(x - center), 1e-12)));
      const next = xs.reduce((a, x, i) => a + w[i] * x, 0) / w.reduce((a, b) => a + b, 0);
      if (Math.abs(next - center) < 1e-10) { center = next; break; }
      center = next;
    }
  }

  const precision = 1 / t0 + n / sigma2;
  const mu = (m0 / t0 + (n * center) / sigma2) / precision;
  const s = Math.sqrt(sigma2 + 1 / precision);
  const z = normInv(0.5 + level / 2);
  const lower = Math.exp(mu - z * s);
  const upper = Math.exp(mu + z * s);
  return {
    mean: Math.exp(mu), sd: (upper - lower) / (2 * z), lower, upper,
    nUsed: n, nExcluded: finite.length - used.length, withinSd: Math.sqrt(sigma2), scale: "log", mu, s,
  };
}

export function variant(loc: Loc, scale: Scale, hk = 1.345): Model {
  return (past, ctx, t) => {
    if (t !== "cycle") return MODELS["v2-bayes"](past, ctx, t);
    const p = resolveForecastPrior(ctx.conditions, ctx.perimenoStage);
    const m = robustPredict(past, p.cycle, p.gate, loc, scale, hk);
    return { point: m.mean, lo80: m.lower, hi80: m.upper, lo95: metricQuantile(m, 0.025), hi95: metricQuantile(m, 0.975) };
  };
}

// CONFIRMATORY (protocol): Huber + MAD, and the two single-component ablations,
// plus the protocol's trimmed-mean alternative.
export const models: Record<string, Model> = {
  "H1-huber-mad": variant("huber", "mad"),
  "H1-huber-loc": variant("huber", "classic"),
  "H1-mad-scale": variant("mean", "mad"),
  "H1-trim-mad": variant("trim", "mad"),
};
