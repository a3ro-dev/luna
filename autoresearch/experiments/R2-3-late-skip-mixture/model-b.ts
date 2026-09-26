/**
 * R2-3 design B: lateness as evidence for a skipped log.
 *
 * Once no start is logged by day t0, y (the open interval) is modelled as a
 * mixture of c = 1, 2 (optionally 3) true cycles:
 *
 *   log y | c ~ D(mu + log c, s)        mu, s: forecast-v2's log-scale predictive
 *   P(c=2) = w  (P(c=3) = w^2)          w ~ Beta-binomial: prior mean W0 = 0.045
 *                                       (AWHS / SkipTrack), updated by the
 *                                       person's set-aside long intervals
 *
 * Conditioning on y >= t0 is Bayes on the component label:
 *   P(c | y >= t0) ∝ P(c) * S_c(t0)
 * so a long wait moves weight to the skip component by itself. D is Normal
 * (protocol form) or Student-t with nu = 4 on the log scale (design B: genuinely
 * long single cycles are over-represented among late ones, so the single
 * component gets a heavier tail). Point = conditional median, interval =
 * conditional 10%/90% quantiles.
 *
 * Uses only `past`, `ctx` and `t0`.
 */
import { CYCLE_SCALE, normCdf, predictMetric, resolveForecastPrior, usableMask } from "../../../src/lib/prediction/forecast.ts";
import type { Pred } from "../../../src/lib/prediction/backtest.ts";
import type { LateModel } from "../../src/eval2.mts";

const W0 = 0.045;
const A0 = 1;
const B0 = (A0 * (1 - W0)) / W0; // Beta(1, 21.2): prior worth ~22 cycles

type Tail = "normal" | "t4";
/** Student-t CDF, nu = 4 (closed form). */
const t4Cdf = (t: number) => {
  const u = 1 + (t * t) / 4;
  return 0.5 + 0.375 * (t / Math.sqrt(u)) * (1 - (t * t) / (12 * u));
};
const stdCdf = (tail: Tail, z: number) => (tail === "normal" ? normCdf(z) : t4Cdf(z));

export function skipMixture(o: { tail: Tail; maxC: 1 | 2 | 3 }): LateModel {
  return (past, ctx, t0) => {
    const p = resolveForecastPrior(ctx.conditions, ctx.perimenoStage);
    const m = predictMetric(past, p.cycle, p.gate, 0.8, CYCLE_SCALE);
    const mask = usableMask(past, p.gate);
    const k = past.filter((x, i) => !mask[i] && x > p.gate.max).length;
    const n = past.filter((x) => x >= p.gate.min).length;
    const w = (A0 + k) / (A0 + B0 + n);
    const pis = o.maxC === 1 ? [1] : o.maxC === 2 ? [1 - w, w] : [1 - w, w * (1 - w), w * w];
    const F = (y: number) => pis.map((_, i) => stdCdf(o.tail, (Math.log(y) - m.mu - Math.log(i + 1)) / m.s));
    const a = t0 - 0.5; // integer days: y >= t0 <=> y > t0 - 0.5
    const Fa = F(a);
    const Z = pis.reduce((acc, pi, i) => acc + pi * (1 - Fa[i]), 0);
    if (Z < 1e-12) return { point: t0, lo80: t0, hi80: t0 + 1 };
    const G = (y: number) => (y <= a ? 0 : F(y).reduce((acc, f, i) => acc + pis[i] * (f - Fa[i]), 0) / Z);
    const q = (pr: number) => {
      let lo = Math.log(a), hi = Math.log(a) + 5; // up to ~150x t0
      for (let it = 0; it < 60; it++) {
        const mid = (lo + hi) / 2;
        if (G(Math.exp(mid)) < pr) lo = mid; else hi = mid;
      }
      return Math.exp((lo + hi) / 2);
    };
    return { point: q(0.5), lo80: q(0.1), hi80: q(0.9), cdf: G } as Pred;
  };
}

export const lateModels: Record<string, LateModel> = {
  "B1-norm-c2": skipMixture({ tail: "normal", maxC: 2 }), // CONFIRMATORY (protocol)
  "B2-norm-c3": skipMixture({ tail: "normal", maxC: 3 }), // CONFIRMATORY (protocol option c = 3)
  "B3-t4-c2": skipMixture({ tail: "t4", maxC: 2 }), //     EXPLORATORY (design B)
  "B4-t4-c3": skipMixture({ tail: "t4", maxC: 3 }), //     EXPLORATORY (design B)
  "B5-t4-only": skipMixture({ tail: "t4", maxC: 1 }), //   EXPLORATORY ablation: heavy tail, no skip
};
