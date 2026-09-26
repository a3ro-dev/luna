/**
 * H7 -- integer-aware bleeding-length forecast.
 *
 * Targets are whole-day counts, so treat the v2 predictive X as the latent
 * value and score Y = round(X). Then F_Y(k) = F_X(k + 0.5), and the discrete
 * p-quantile is ceil(q_X(p) - 0.5): the point is the discrete median, and the
 * 80% interval [dq(0.1), dq(0.9)] has P(Y in it) >= 0.8 under the model.
 * The v2 fit itself (prior, shrinkage, gate) is reused unchanged.
 */
import type { Ctx, Model, Pred, Target } from "../../../src/lib/prediction/backtest.ts";
import { CYCLE_SCALE, metricCdf, metricQuantile, predictMetric, resolveForecastPrior, type MetricForecast } from "../../../src/lib/prediction/forecast.ts";

const dq = (m: MetricForecast, p: number) => Math.ceil(metricQuantile(m, p) - 0.5);

// Same call as backtest.ts v2() for "v2-bayes".
function fit(past: number[], ctx: Ctx, t: Target): MetricForecast {
  const p = resolveForecastPrior(ctx.conditions, ctx.perimenoStage);
  return t === "cycle"
    ? predictMetric(past, p.cycle, p.gate, 0.8, CYCLE_SCALE)
    : predictMetric(past, p.period, null, 0.8, "linear");
}

const continuous = (m: MetricForecast): Pred => ({
  point: m.mean, lo80: m.lower, hi80: m.upper, lo95: metricQuantile(m, 0.025), hi95: metricQuantile(m, 0.975),
});
const discrete = (m: MetricForecast): Pred => ({
  point: dq(m, 0.5), lo80: dq(m, 0.1), hi80: dq(m, 0.9), lo95: dq(m, 0.025), hi95: dq(m, 0.975),
});

/** Integer interval among [dq(.1), dq(.9)] and its one-day trims whose model mass is nearest 0.8 (may fall below). */
function nearest80(m: MetricForecast): Pred {
  const mass = ([a, b]: number[]) => metricCdf(m, b + 0.5) - metricCdf(m, a - 0.5);
  const lo = dq(m, 0.1), hi = dq(m, 0.9);
  const [lo80, hi80] = [[lo, hi], [lo + 1, hi], [lo, hi - 1]]
    .filter(([a, b]) => b >= a)
    .reduce((best, c) => (Math.abs(mass(c) - 0.8) < Math.abs(mass(best) - 0.8) ? c : best));
  return { ...discrete(m), lo80, hi80 };
}

export const models: Record<string, Model> = {
  /** CONFIRMATORY ablation: period point = rounded median, interval unchanged. */
  "H7-round": (past, ctx, t) => {
    const m = fit(past, ctx, t);
    return t === "period" ? { ...continuous(m), point: dq(m, 0.5) } : continuous(m);
  },
  /** CONFIRMATORY (the protocol): period point and intervals discrete. */
  "H7-discrete": (past, ctx, t) => {
    const m = fit(past, ctx, t);
    return t === "period" ? discrete(m) : continuous(m);
  },
  /** EXPLORATORY: period point discrete, 80% interval = integer set with model mass nearest 0.8. */
  "H7x-nearest80": (past, ctx, t) => {
    const m = fit(past, ctx, t);
    return t === "period" ? nearest80(m) : continuous(m);
  },
  /** EXPLORATORY: what production already shows (Math.round, ties up); interval unchanged. */
  "H7x-mathround": (past, ctx, t) => {
    const m = fit(past, ctx, t);
    return t === "period" ? { ...continuous(m), point: Math.round(m.mean) } : continuous(m);
  },
  /** EXPLORATORY: same discretization applied to the cycle target too. */
  "H7x-all-discrete": (past, ctx, t) => discrete(fit(past, ctx, t)),
};
