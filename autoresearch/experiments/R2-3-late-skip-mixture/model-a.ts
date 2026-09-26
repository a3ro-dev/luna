/**
 * R2-3 design A: late-regime skip mixture, following the protocol literally.
 *
 * Given no start by day t0 (so y >= t0), predict y from
 *   c = 1: v2's own single-cycle predictive, log y ~ N(mu, s^2)
 *   c = 2: a skipped log,                      log y ~ N(mu + log 2, s^2)
 *  (c = 3: two skipped logs,                   log y ~ N(mu + log 3, s^2))
 * with the SAME (mu, s) as v2's predictive, conditioned on y > t0 - 0.5
 * (integer days, as v2-trunc). Quantiles by bisection on the conditional
 * mixture CDF; the point is the conditional median.
 *
 * Skip weight w = P(c >= 2): population rate w0 = 0.045 (AWHS / SkipTrack) as a
 * Beta(w0 * N0, (1 - w0) * N0) prior, N0 = 10 pseudo-intervals, updated by the
 * person's own record: k = past intervals set aside as long (> gate.max and
 * excluded by v2's usableMask), out of n = past intervals >= gate.min.
 *   w = (w0 * N0 + k) / (N0 + n)
 * With c = 3 the skip count is geometric: pi = [1 - w, w (1 - w), w^2].
 *
 * Declared before the first run:
 *   CONFIRMATORY  A-c2      c in {1, 2}, same scale (protocol, literal)
 *   CONFIRMATORY  A-c23     c in {1, 2, 3}, same scale (protocol's optional c = 3)
 *   EXPLORATORY   A-c23-sum c in {1, 2, 3}, but a sum of c cycles gets log-scale
 *                           variance sigma^2 / c + 1/precision (within-person noise
 *                           averages over c cycles; parameter uncertainty does not)
 *   EXPLORATORY   A-c23-n4  A-c23 with a weaker skip prior, N0 = 4 (personal skip
 *                           history counts for more)
 * Added AFTER the first run (post hoc, generator-informed; a sensitivity check,
 * not a candidate): diag-a.mts showed 55% of late rows are merged gaps while the
 * mixture's posterior skip share at t0 is ~0.3, because v2 over-covers clean
 * cycles (true tail mass past t0 ~5%, not the assumed 10%).
 *   EXPLORATORY   A-c23-w09 A-c23 with the population skip rate doubled to 0.09
 * Uses only past, ctx and t0.
 */
import { CYCLE_SCALE, normCdf, predictMetric, resolveForecastPrior, usableMask } from "../../../src/lib/prediction/forecast.ts";
import type { Ctx, Pred } from "../../../src/lib/prediction/backtest.ts";
import type { LateModel } from "../../src/eval2.mts";

interface Opts { maxC: 2 | 3; n0: number; sumScale: boolean; w0?: number }

function skipMixture({ maxC, n0, sumScale, w0 = 0.045 }: Opts): LateModel {
  return (past: number[], ctx: Ctx, t0: number): Pred | null => {
    const prior = resolveForecastPrior(ctx.conditions, ctx.perimenoStage);
    const m = predictMetric(past, prior.cycle, prior.gate, 0.8, CYCLE_SCALE);
    // Log-scale components; CYCLE_SCALE is "log" in production (asserted below).
    const finite = past.filter((x) => Number.isFinite(x) && x > 0);
    const mask = usableMask(finite, prior.gate);
    const n = finite.filter((x) => x >= prior.gate.min).length;
    const k = finite.filter((x, i) => x > prior.gate.max && !mask[i]).length;
    const w = (w0 * n0 + k) / (n0 + n);
    const pis = maxC === 2 ? [1 - w, w] : [1 - w, w * (1 - w), w * w];
    const paramVar = m.s ** 2 - m.withinSd ** 2; // 1 / precision
    const comps = pis.map((pi, i) => {
      const c = i + 1;
      const s = sumScale ? Math.sqrt(m.withinSd ** 2 / c + paramVar) : m.s;
      return { pi, mu: m.mu + Math.log(c), s };
    });
    const cdf = (y: number) => comps.reduce((a, q) => a + q.pi * normCdf((Math.log(Math.max(y, 1e-9)) - q.mu) / q.s), 0);
    const f0 = cdf(t0 - 0.5);
    if (f0 >= 1 - 1e-9) return { point: t0, lo80: t0, hi80: t0 + 1 };
    const cond = (y: number) => (cdf(y) - f0) / (1 - f0);
    const top = Math.exp(Math.max(...comps.map((q) => q.mu + 8 * q.s)));
    const quant = (p: number) => {
      let lo = t0 - 0.5, hi = Math.max(top, t0 + 1);
      for (let it = 0; it < 60; it++) {
        const mid = (lo + hi) / 2;
        if (cond(mid) < p) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    };
    return { point: quant(0.5), lo80: quant(0.1), hi80: quant(0.9) };
  };
}

if (CYCLE_SCALE !== "log") throw new Error("model-a assumes the log cycle scale");

export const lateModels: Record<string, LateModel> = {
  "A-c2": skipMixture({ maxC: 2, n0: 10, sumScale: false }),
  "A-c23": skipMixture({ maxC: 3, n0: 10, sumScale: false }),
  "A-c23-sum": skipMixture({ maxC: 3, n0: 10, sumScale: true }),
  "A-c23-n4": skipMixture({ maxC: 3, n0: 4, sumScale: false }),
  "A-c23-w09": skipMixture({ maxC: 3, n0: 10, sumScale: false, w0: 0.09 }),
};
