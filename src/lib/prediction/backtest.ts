/**
 * Leakage-free rolling-origin backtest for cycle-length and bleeding-length
 * forecasts. Pure: callers supply histories (from the DB or the synthetic
 * generator below) and get back per-forecast rows and summaries.
 *
 * At origin k (the k-th logged start, 0-based) a model sees ONLY the starts
 * 0..k and the bleeding ends of cycles 0..k-1 (the end of cycle k is not yet
 * known when it starts). It predicts the interval start_k -> start_{k+1}
 * (cycle target) or the bleeding length of cycle k (period target). Stored
 * derived columns and prediction_params are never read.
 *
 * Limitation: the user's CURRENT conditions are applied at every origin --
 * profile history is not versioned, so condition changes can leak backwards.
 */
import { predictNextCycle, type PerimenoStage } from "./engine.ts";
import { CYCLE_SCALE, diffDays, metricQuantile, predictMetric, resolveForecastPrior, type CycleInput } from "./forecast.ts";
import { normInv } from "./forecast.ts";

export interface History {
  userKey: string;
  conditions: string[];
  perimenoStage?: PerimenoStage | null;
  cycles: CycleInput[];
}

export interface Pred {
  point: number;
  lo80?: number;
  hi80?: number;
  lo95?: number;
  hi95?: number;
}

export interface Ctx {
  conditions: string[];
  perimenoStage?: PerimenoStage | null;
}

/** A model maps past observations of the target metric to a forecast, or null to abstain. */
export type Model = (past: number[], ctx: Ctx, target: Target) => Pred | null;
export type Target = "cycle" | "period";

const Z80 = normInv(0.9);
const Z95 = normInv(0.975);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function v2(past: number[], ctx: Ctx, t: Target, scale: "linear" | "log"): Pred {
  const p = resolveForecastPrior(ctx.conditions, ctx.perimenoStage);
  const m = predictMetric(past, t === "cycle" ? p.cycle : p.period, t === "cycle" ? p.gate : null, 0.8, scale);
  return {
    point: m.mean, lo80: m.lower, hi80: m.upper,
    lo95: metricQuantile(m, 0.025), hi95: metricQuantile(m, 0.975),
  };
}

export const MODELS: Record<string, Model> = {
  /** Production engine before this change (adaptive EWMA + jackknife / prior blend). */
  "v1-current": (past, ctx, t) => {
    const r = predictNextCycle(past, t === "cycle" ? "cycleLength" : "periodLength", ctx.conditions, ctx.perimenoStage ?? undefined);
    // v1 reports a nominal 95% interval; its 80% counterpart is the same
    // Normal interval rescaled.
    const half = (r.ciUpper - r.ciLower) / 2;
    return { point: r.predicted, lo95: r.ciLower, hi95: r.ciUpper, lo80: r.predicted - (half * Z80) / Z95, hi80: r.predicted + (half * Z80) / Z95 };
  },
  /** Candidate: Bayesian predictive, cycle length on the log scale (production). */
  "v2-bayes": (past, ctx, t) => v2(past, ctx, t, t === "cycle" ? CYCLE_SCALE : "linear"),
  /** Candidate: same model on the linear (day) scale. */
  "v2-linear": (past, ctx, t) => v2(past, ctx, t, "linear"),
  "prior-only": (_past, ctx, t) => {
    const p = resolveForecastPrior(ctx.conditions, ctx.perimenoStage);
    const f = predictMetric([], t === "cycle" ? p.cycle : p.period, null, 0.8, t === "cycle" ? CYCLE_SCALE : "linear");
    return { point: f.mean, lo80: f.lower, hi80: f.upper, lo95: metricQuantile(f, 0.025), hi95: metricQuantile(f, 0.975) };
  },
  "last": (past) => (past.length ? { point: past[past.length - 1] } : null),
  "expanding-median": (past) => (past.length ? { point: median(past) } : null),
  "rolling-mean-6": (past) => (past.length ? { point: mean(past.slice(-6)) } : null),
  "rolling-median-6": (past) => (past.length ? { point: median(past.slice(-6)) } : null),
  "ses-0.3": (past) => {
    if (!past.length) return null;
    let s = past[0];
    for (const x of past.slice(1)) s += 0.3 * (x - s);
    return { point: s };
  },
};

export interface Row {
  userKey: string;
  target: Target;
  /** Number of past observations of the target metric available at the origin. */
  nPast: number;
  y: number;
  /** Whether the target itself is outside the plausible gate (possible missed log). */
  targetGated: boolean;
  preds: Record<string, Pred | null>;
}

export function runBacktest(histories: History[], target: Target, models = MODELS): Row[] {
  const rows: Row[] = [];
  for (const h of histories) {
    const cycles = [...h.cycles].sort((a, b) => a.mStart.localeCompare(b.mStart));
    const ctx = { conditions: h.conditions, perimenoStage: h.perimenoStage };
    const gate = resolveForecastPrior(h.conditions, h.perimenoStage).gate;
    const bleed = (c: CycleInput) => (c.mEnd && c.mEnd >= c.mStart ? diffDays(c.mStart, c.mEnd) + 1 : null);
    for (let k = 0; k < cycles.length; k++) {
      let y: number | null;
      let past: number[];
      if (target === "cycle") {
        if (k + 1 >= cycles.length) break;
        y = diffDays(cycles[k].mStart, cycles[k + 1].mStart);
        past = [];
        for (let i = 1; i <= k; i++) past.push(diffDays(cycles[i - 1].mStart, cycles[i].mStart));
      } else {
        y = bleed(cycles[k]);
        if (y == null || y > 15) continue;
        past = cycles.slice(0, k).map(bleed).filter((d): d is number => d != null && d <= 15);
      }
      const preds: Record<string, Pred | null> = {};
      for (const [name, m] of Object.entries(models)) preds[name] = m(past, ctx, target);
      rows.push({
        userKey: h.userKey, target, nPast: past.length, y,
        targetGated: target === "cycle" && (y < gate.min || y > gate.max),
        preds,
      });
    }
  }
  return rows;
}

export interface Metrics {
  forecasts: number;
  users: number;
  abstained: number;
  mae: number;
  medae: number;
  rmse: number;
  bias: number;
  p90ae: number;
  within2: number;
  within3: number;
  within7: number;
  macroMae: number;
  coverage80: number | null;
  coverage95: number | null;
  width80: number | null;
  /** Interval score for the 80% interval (Gneiting & Raftery 2007); lower is better. */
  intervalScore80: number | null;
}

export function summarize(rows: Row[], model: string): Metrics {
  const scored = rows.filter((r) => r.preds[model]);
  const err = scored.map((r) => r.preds[model]!.point - r.y);
  const ae = err.map(Math.abs).sort((a, b) => a - b);
  const byUser = new Map<string, number[]>();
  scored.forEach((r, i) => byUser.set(r.userKey, [...(byUser.get(r.userKey) ?? []), Math.abs(err[i])]));
  const withI = scored.filter((r) => r.preds[model]!.lo80 != null);
  const cov = (lo: "lo80" | "lo95", hi: "hi80" | "hi95") =>
    withI.length ? withI.filter((r) => r.y >= r.preds[model]![lo]! && r.y <= r.preds[model]![hi]!).length / withI.length : null;
  const frac = (d: number) => (ae.length ? ae.filter((a) => a <= d).length / ae.length : NaN);
  return {
    forecasts: scored.length,
    users: byUser.size,
    abstained: rows.length - scored.length,
    mae: mean(ae),
    medae: median(ae),
    rmse: Math.sqrt(mean(err.map((e) => e * e))),
    bias: mean(err),
    p90ae: ae[Math.min(ae.length - 1, Math.floor(0.9 * ae.length))],
    within2: frac(2),
    within3: frac(3),
    within7: frac(7),
    macroMae: mean([...byUser.values()].map(mean)),
    coverage80: cov("lo80", "hi80"),
    coverage95: cov("lo95", "hi95"),
    width80: withI.length ? mean(withI.map((r) => r.preds[model]!.hi80! - r.preds[model]!.lo80!)) : null,
    intervalScore80: withI.length
      ? mean(withI.map((r) => {
          const { lo80: l, hi80: u } = r.preds[model]!;
          return u! - l! + (2 / 0.2) * Math.max(0, l! - r.y) + (2 / 0.2) * Math.max(0, r.y - u!);
        }))
      : null,
  };
}

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Cluster (user-level) bootstrap CI for the difference in macro MAE between
 * two models, restricted to forecasts both models made.
 */
export function bootstrapMacroMaeDiff(rows: Row[], a: string, b: string, reps = 2000, seed = 1) {
  const users = new Map<string, number[]>();
  for (const r of rows) {
    if (!r.preds[a] || !r.preds[b]) continue;
    const d = Math.abs(r.preds[a]!.point - r.y) - Math.abs(r.preds[b]!.point - r.y);
    users.set(r.userKey, [...(users.get(r.userKey) ?? []), d]);
  }
  const perUser = [...users.values()].map(mean);
  if (perUser.length < 2) return { users: perUser.length, diff: perUser[0] ?? NaN, lo: NaN, hi: NaN };
  const rand = rng(seed);
  const stats: number[] = [];
  for (let i = 0; i < reps; i++) {
    let s = 0;
    for (let j = 0; j < perUser.length; j++) s += perUser[Math.floor(rand() * perUser.length)];
    stats.push(s / perUser.length);
  }
  stats.sort((x, y) => x - y);
  return { users: perUser.length, diff: mean(perUser), lo: stats[Math.floor(0.025 * reps)], hi: stats[Math.floor(0.975 * reps)] };
}

// ─── Synthetic cohorts ───────────────────────────────────────────
// For correctness and stress testing only. Generator parameters are
// assumptions, deliberately NOT the model's priors, and include skew,
// drift, missed logs and double logs. Synthetic results say nothing about
// real-world accuracy.
export interface SyntheticOptions {
  users: number;
  seed: number;
  /** Probability a period goes unlogged (the gap merges two cycles). */
  missedLog?: number;
  /** Probability of a spurious extra start a few days after a real one. */
  doubleLog?: number;
  /** Fraction of users with highly variable, right-skewed cycles. */
  irregularShare?: number;
}

export function syntheticCohort(o: SyntheticOptions): History[] {
  const rand = rng(o.seed);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-12)) * Math.cos(2 * Math.PI * rand());
  const out: History[] = [];
  for (let u = 0; u < o.users; u++) {
    const irregular = rand() < (o.irregularShare ?? 0.15);
    const personalMean = irregular ? 34 + 6 * gauss() : 28.5 + 2.6 * gauss();
    const sd = irregular ? 6 + 6 * rand() : Math.exp(Math.log(2.2) + 0.45 * gauss());
    const drift = (rand() - 0.5) * 0.3; // days per cycle
    const bleedMean = 4 + 2 * rand();
    const nCycles = 2 + Math.floor(rand() * 14);
    const cycles: CycleInput[] = [];
    let day = Date.UTC(2024, 0, 1) + Math.floor(rand() * 60) * 86_400_000;
    const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
    for (let i = 0; i < nCycles; i++) {
      const bleed = Math.max(2, Math.min(10, Math.round(bleedMean + gauss())));
      if (!(rand() < (o.missedLog ?? 0.05) && i > 0 && i < nCycles - 1)) {
        cycles.push({ mStart: iso(day), mEnd: rand() < 0.7 ? iso(day + (bleed - 1) * 86_400_000) : null });
        if (rand() < (o.doubleLog ?? 0.02)) cycles.push({ mStart: iso(day + (3 + Math.floor(rand() * 5)) * 86_400_000), mEnd: null });
      }
      // Right skew for irregular users: gamma-like via exp of a normal.
      const len = irregular
        ? personalMean * Math.exp((sd / personalMean) * gauss()) + drift * i
        : personalMean + sd * gauss() + drift * i;
      day += Math.max(18, Math.round(len)) * 86_400_000;
    }
    out.push({ userKey: `s${u}`, conditions: irregular ? ["irregular"] : [], cycles });
  }
  return out;
}
