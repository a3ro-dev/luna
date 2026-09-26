/**
 * H3 Student-t predictive. Same log-scale model and gate as forecast-v2
 * (src/lib/prediction/forecast.ts predictMetric), but interval quantiles come
 * from a Student-t posterior predictive instead of a Normal with a plug-in
 * variance. Applies to both targets (predictMetric serves both).
 *
 *   H3-t-plugin  production mu and s unchanged; quantile t_{nu0+n} instead of z.
 *                Point forecast is identical to v2 by construction.
 *   H3-nig-exact full normal-inverse-gamma conjugate: m | s2 ~ N(m0, s2/k0),
 *                s2 ~ Scaled-Inv-chi2(nu0, s0), k0 = s0/t0 (same prior spread
 *                on m as v2 at s2 = s0). Predictive
 *                t_{nu0+n}(mu_n, s_n^2 (1 + 1/k_n)). Point shrinkage changes.
 *   H3-t-eb      t-plugin, but the within-person variance prior (nu0, s0) is
 *                fitted by empirical Bayes (marginal likelihood of per-user
 *                sample variances, v/s0 ~ F(n-1, nu0)) on a HELD-OUT synthetic
 *                cohort (seed 9001, not an eval seed), per condition profile.
 *                Cycle target only; period stays on t-plugin.
 *                Caveat: fits the generator, which is ours -- an optimistic
 *                upper bound for what EB on real users could do.
 */
import { CYCLE_SCALE, HISTORY_WINDOW, NU0, diffDays, resolveForecastPrior, usableMask, type MetricPrior } from "../../../src/lib/prediction/forecast.ts";
import { MODELS, syntheticCohort, type Model, type Pred } from "../../../src/lib/prediction/backtest.ts";

// ─── Student-t quantile (exact: regularized incomplete beta + bisection) ──
function lgamma(x: number): number {
  // Lanczos (g=7, n=9)
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Regularized incomplete beta I_x(a, b) (Numerical Recipes betacf). */
function betai(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  const cf = (x: number, a: number, b: number) => {
    let c = 1, d = 1 - ((a + b) * x) / (a + 1);
    d = 1 / (Math.abs(d) < 1e-300 ? 1e-300 : d);
    let h = d;
    for (let m = 1; m <= 300; m++) {
      for (const aa of [(m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m)), (-(a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1))]) {
        d = 1 + aa * d; d = 1 / (Math.abs(d) < 1e-300 ? 1e-300 : d);
        c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
        h *= d * c;
      }
      if (Math.abs(d * c - 1) < 1e-12) break;
    }
    return h;
  };
  return x < (a + 1) / (a + b + 2) ? (front * cf(x, a, b)) / a : 1 - (front * cf(1 - x, b, a)) / b;
}

const tCdf = (t: number, nu: number) => {
  const tail = 0.5 * betai(nu / (nu + t * t), nu / 2, 0.5);
  return t >= 0 ? 1 - tail : tail;
};

const tMemo = new Map<string, number>();
export function tInv(p: number, nu: number): number {
  const key = `${p}|${nu}`;
  const hit = tMemo.get(key);
  if (hit !== undefined) return hit;
  if (p < 0.5) return -tInv(1 - p, nu);
  let lo = 0, hi = 1e3;
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (tCdf(m, nu) < p) lo = m; else hi = m; }
  tMemo.set(key, (lo + hi) / 2);
  return (lo + hi) / 2;
}
// Self-check against table values; fails loudly if the quantile code breaks.
for (const [p, nu, q] of [[0.9, 4, 1.533206], [0.9, 16, 1.336757], [0.975, 4, 2.776445], [0.9, 2, 1.885618], [0.9, 3, 1.637744], [0.9, 1e6, 1.281552]]) {
  if (Math.abs(tInv(p, nu) - q) > 2e-3) throw new Error(`tInv(${p},${nu})=${tInv(p, nu)} != ${q}`);
}

// ─── Predictive ─────────────────────────────────────────────────
interface Opts { exact: boolean; nu0: number; s0?: number; /** Fixed t df (diagnostics only). */ df?: number }

export function predictT(observations: number[], prior: MetricPrior, gate: { min: number; max: number } | null, scale: "linear" | "log", o: Opts): Pred {
  const finite = observations.filter((x) => Number.isFinite(x) && x > 0);
  const mask = gate ? usableMask(finite, gate) : finite.map(() => true);
  const log = scale === "log";
  const toLogSd = (sd: number) => Math.sqrt(Math.log(1 + (sd / prior.mean) ** 2));
  const m0 = log ? Math.log(prior.mean) : prior.mean;
  const t0 = (log ? toLogSd(prior.betweenSd) : prior.betweenSd) ** 2;
  const s0 = o.s0 ?? (log ? toLogSd(prior.withinSd) : prior.withinSd) ** 2;
  const xs = finite.filter((_, i) => mask[i]).slice(-HISTORY_WINDOW).map((x) => (log ? Math.log(x) : x));
  const n = xs.length;
  const xbar = n > 0 ? xs.reduce((a, b) => a + b, 0) / n : 0;
  const ss = xs.reduce((a, x) => a + (x - xbar) ** 2, 0);
  const nu = o.df ?? o.nu0 + n;
  let mu: number, s: number;
  if (o.exact) {
    const k0 = s0 / t0, kn = k0 + n;
    mu = (k0 * m0 + n * xbar) / kn;
    const sn2 = (o.nu0 * s0 + ss + (k0 * n * (xbar - m0) ** 2) / kn) / nu;
    s = Math.sqrt(sn2 * (1 + 1 / kn));
  } else {
    const sigma2 = (o.nu0 * s0 + ss) / (o.nu0 + Math.max(n - 1, 0));
    const precision = 1 / t0 + n / sigma2;
    mu = (m0 / t0 + (n * xbar) / sigma2) / precision;
    s = Math.sqrt(sigma2 + 1 / precision);
  }
  const q = (p: number) => (log ? Math.exp(mu + s * tInv(p, nu)) : mu + s * tInv(p, nu));
  return { point: log ? Math.exp(mu) : mu, lo80: q(0.1), hi80: q(0.9), lo95: q(0.025), hi95: q(0.975) };
}

// ─── Empirical-Bayes within-person variance prior (held-out cohort) ──
/** log density of v where v/s0 ~ F(k, nu0). */
function logF(v: number, k: number, nu0: number, s0: number): number {
  const x = v / s0;
  return lgamma((k + nu0) / 2) - lgamma(k / 2) - lgamma(nu0 / 2) + (k / 2) * Math.log(k / nu0)
    + (k / 2 - 1) * Math.log(x) - ((k + nu0) / 2) * Math.log(1 + (k * x) / nu0) - Math.log(s0);
}

function fitEB(): Map<string, { nu0: number; s0: number; users: number; zeroVar: number }> {
  const groups = new Map<string, { v: number; k: number }[]>();
  const zeros = new Map<string, number>();
  for (const h of syntheticCohort({ users: 4000, seed: 9001, missedLog: 0.05, doubleLog: 0.02, irregularShare: 0.15 })) {
    const key = h.conditions.join(",");
    const gate = resolveForecastPrior(h.conditions, h.perimenoStage).gate;
    const starts = h.cycles.map((c) => c.mStart).sort();
    const iv = starts.slice(1).map((s, i) => diffDays(starts[i], s));
    const mask = usableMask(iv, gate);
    const xs = iv.filter((_, i) => mask[i]).slice(-HISTORY_WINDOW).map(Math.log);
    if (xs.length < 2) continue;
    const xbar = xs.reduce((a, b) => a + b, 0) / xs.length;
    const v = xs.reduce((a, x) => a + (x - xbar) ** 2, 0) / (xs.length - 1);
    // ponytail: zero sample variance (identical integer intervals) is dropped; biases s0 up slightly.
    if (v <= 0) { zeros.set(key, (zeros.get(key) ?? 0) + 1); continue; }
    groups.set(key, [...(groups.get(key) ?? []), { v, k: xs.length - 1 }]);
  }
  const out = new Map<string, { nu0: number; s0: number; users: number; zeroVar: number }>();
  for (const [key, d] of groups) {
    let best = { ll: -Infinity, nu0: NU0, s0: 0 };
    for (let nu0 = 0.5; nu0 <= 40; nu0 += 0.25) {
      for (let ls = Math.log(1e-4); ls <= Math.log(0.5); ls += 0.02) {
        const s0 = Math.exp(ls);
        let ll = 0;
        for (const { v, k } of d) ll += logF(v, k, nu0, s0);
        if (ll > best.ll) best = { ll, nu0, s0 };
      }
    }
    out.set(key, { nu0: best.nu0, s0: best.s0, users: d.length, zeroVar: zeros.get(key) ?? 0 });
  }
  return out;
}

export const EB = fitEB();

// ─── Models ─────────────────────────────────────────────────────
function v2t(exact: boolean): Model {
  return (past, ctx, t) => {
    const p = resolveForecastPrior(ctx.conditions, ctx.perimenoStage);
    return t === "cycle"
      ? predictT(past, p.cycle, p.gate, CYCLE_SCALE, { exact, nu0: NU0 })
      : predictT(past, p.period, null, "linear", { exact, nu0: NU0 });
  };
}

const tPlugin = v2t(false);

export const models: Record<string, Model> = {
  "H3-t-plugin": tPlugin,
  "H3-nig-exact": v2t(true),
  "H3-t-eb": (past, ctx, t) => {
    const eb = EB.get(ctx.conditions.join(","));
    if (t !== "cycle" || !eb) return tPlugin(past, ctx, t);
    const p = resolveForecastPrior(ctx.conditions, ctx.perimenoStage);
    return predictT(past, p.cycle, p.gate, CYCLE_SCALE, { exact: false, nu0: eb.nu0, s0: eb.s0 });
  },
  /** EXPLORATORY (beyond protocol): t-plugin only for the irregular profile, v2 Normal otherwise. */
  "H3-t-irreg-only": (past, ctx, t) => (ctx.conditions.includes("irregular") ? tPlugin(past, ctx, t) : MODELS["v2-bayes"](past, ctx, t)),
};
