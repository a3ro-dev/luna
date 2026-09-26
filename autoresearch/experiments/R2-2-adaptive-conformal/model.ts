/**
 * R2-2 per-user adaptive conformal level (ACI, Gibbs & Candes 2021).
 *
 * Replays the person's own past v2 forecasts (origin t predicts past[t] from
 * past[0..t-1], starting from the prior-only forecast at t = 0) and updates
 *   alpha_{t+1} = clamp(alpha_t + gamma * (0.2 - err_t), 0.02, 0.5)
 * where err_t = 1 if past[t] fell outside that origin's interval at level
 * 1 - alpha_t. The final interval is the unchanged v2 predictive's central
 * (1 - alpha_n) interval. Point forecast and period target: unchanged v2.
 * Uses only `past` and `ctx`.
 */
import {
  CYCLE_SCALE, metricQuantile, predictMetric, resolveForecastPrior,
} from "../../../src/lib/prediction/forecast.ts";
import { MODELS, type Model } from "../../../src/lib/prediction/backtest.ts";

interface Opts {
  gamma: number;
  /** Skip the update when the past target is outside the population gate (likely a logging artifact). */
  inGateOnly?: boolean;
}

export function aciAlpha(past: number[], gate: { min: number; max: number }, predict: (xs: number[]) => ReturnType<typeof predictMetric>, o: Opts): number {
  let a = 0.2;
  for (let t = 0; t < past.length; t++) {
    const y = past[t];
    if (o.inGateOnly && (y < gate.min || y > gate.max)) continue;
    const m = predict(past.slice(0, t));
    const err = y < metricQuantile(m, a / 2) || y > metricQuantile(m, 1 - a / 2) ? 1 : 0;
    a = Math.min(0.5, Math.max(0.02, a + o.gamma * (0.2 - err)));
  }
  return a;
}

export function makeModel(o: Opts): Model {
  return (past, ctx, t) => {
    const base = MODELS["v2-bayes"](past, ctx, t);
    if (!base || t !== "cycle") return base;
    const p = resolveForecastPrior(ctx.conditions, ctx.perimenoStage);
    const predict = (xs: number[]) => predictMetric(xs, p.cycle, p.gate, 0.8, CYCLE_SCALE);
    const a = aciAlpha(past, p.gate, predict, o);
    const m = predict(past);
    return { ...base, lo80: metricQuantile(m, a / 2), hi80: metricQuantile(m, 1 - a / 2) };
  };
}

export const models: Record<string, Model> = {
  // CONFIRMATORY: exactly the protocol (gamma 0.05, every past forecast counts).
  "R2-2-aci": makeModel({ gamma: 0.05 }),
  // EXPLORATORY: ignore past targets outside the gate (artifacts every model misses).
  "R2-2-aci-ingate": makeModel({ gamma: 0.05, inGateOnly: true }),
  // EXPLORATORY: gamma sensitivity at two values fixed before running (half / double).
  "R2-2-aci-g0.025": makeModel({ gamma: 0.025 }),
  "R2-2-aci-g0.1": makeModel({ gamma: 0.1 }),
};

// Self-check: all hits widen alpha (narrower interval), a miss shrinks it, clamps hold.
{
  const flat = () => predictMetric([], { mean: 28, betweenSd: 0.5, withinSd: 0.5 }, null, 0.8, "linear");
  const g = { min: 15, max: 45 };
  if (!(Math.abs(aciAlpha([28, 28], g, flat, { gamma: 0.05 }) - 0.22) < 1e-9)) throw new Error("aci hit update");
  if (!(Math.abs(aciAlpha([40], g, flat, { gamma: 0.05 }) - 0.16) < 1e-9)) throw new Error("aci miss update");
  if (aciAlpha([40, 40, 40, 40, 40, 40], g, flat, { gamma: 0.1 }) !== 0.02) throw new Error("aci clamp");
  if (aciAlpha([50], g, flat, { gamma: 0.05, inGateOnly: true }) !== 0.2) throw new Error("aci in-gate skip");
}
