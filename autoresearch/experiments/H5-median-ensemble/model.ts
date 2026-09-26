/**
 * H5 median ensemble: cycle point = geometric blend of the v2 posterior median
 * exp(mu) and the rolling median of the last 6 usable intervals, weight w(n)
 * rising with n (usable intervals in the v2 window). The 80/95% intervals keep
 * v2's predictive s and are recentred on the blend (log scale). Period target
 * is left on v2 unchanged (the protocol is about intervals).
 */
import { CYCLE_SCALE, HISTORY_WINDOW, metricQuantile, predictMetric, resolveForecastPrior, usableMask } from "../../../src/lib/prediction/forecast.ts";
import { MODELS, type Model } from "../../../src/lib/prediction/backtest.ts";

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const med6 = (u: number[]) => median(u.slice(-6));

function blend(w: (n: number) => number, loc: (used: number[]) => number = med6): Model {
  return (past, ctx, t) => {
    if (t !== "cycle") return MODELS["v2-bayes"](past, ctx, t);
    const p = resolveForecastPrior(ctx.conditions, ctx.perimenoStage);
    const m = predictMetric(past, p.cycle, p.gate, 0.8, CYCLE_SCALE);
    const finite = past.filter((x) => Number.isFinite(x) && x > 0);
    const mask = usableMask(finite, p.gate);
    const used = finite.filter((_, i) => mask[i]);
    const wt = used.length ? w(Math.min(used.length, HISTORY_WINDOW)) : 0;
    const mu = (1 - wt) * m.mu + (wt ? wt * Math.log(loc(used)) : 0);
    const f = { ...m, mu };
    return {
      point: Math.exp(mu),
      lo80: metricQuantile(f, 0.1), hi80: metricQuantile(f, 0.9),
      lo95: metricQuantile(f, 0.025), hi95: metricQuantile(f, 0.975),
    };
  };
}

export const models: Record<string, Model> = {
  /** w = n/(n+12): 0.2 at n=3, 0.33 at 6, 0.5 at 12. */
  "H5-n12": blend((n) => n / (n + 12)),
  /** w ramps linearly to 0.5 at n=6. */
  "H5-cap50": blend((n) => 0.5 * Math.min(n, 6) / 6),
  /** Cold start untouched: w=0 for n<3, ramps to 0.5 at n=6. */
  "H5-gate3": blend((n) => (n < 3 ? 0 : 0.5 * Math.min(n - 2, 4) / 4)),
  /** Dose check: ramps to 0.75 at n=6. */
  "H5-cap75": blend((n) => 0.75 * Math.min(n, 6) / 6),
  // EXPLORATORY (beyond protocol): separate recency from robustness.
  /** Robustness only: median of the same 12-interval window v2 uses. */
  "H5x-med12-cap50": blend((n) => 0.5 * Math.min(n, 6) / 6, (u) => median(u.slice(-12))),
  /** Recency only: arithmetic mean of the last 6 usable intervals. */
  "H5x-mean6-cap50": blend((n) => 0.5 * Math.min(n, 6) / 6, (u) => mean(u.slice(-6))),
};
