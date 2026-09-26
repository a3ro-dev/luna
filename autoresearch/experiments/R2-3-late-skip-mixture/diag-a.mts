/**
 * Diagnostic for design A (not a scored run). Re-generates the harness cohorts
 * with a labelled copy of syntheticCohort (same RNG call order, so identical
 * histories) and splits the late rows into genuine long cycles (c = 1), merged
 * gaps from missed logs (c >= 2) and double-log remainders. Reports each
 * model's MAE / cov80 per class and how often the point sits in a skip mode.
 *
 *   node --no-warnings autoresearch/experiments/R2-3-late-skip-mixture/diag-a.mts
 */
import { rng } from "../../../src/lib/prediction/backtest.ts";
import type { Pred, SyntheticOptions } from "../../../src/lib/prediction/backtest.ts";
import { CYCLE_SCALE, diffDays, normCdf, normInv, predictMetric, resolveForecastPrior } from "../../../src/lib/prediction/forecast.ts";
import { SCENARIOS, v2Trunc } from "../../src/eval2.mts";
import type { LateModel } from "../../src/eval2.mts";
import { lateModels } from "./model-a.ts";

type Start = { iso: string; idx: number; double: boolean };

/** syntheticCohort (backtest.ts) plus the true-cycle index of every logged start. */
function labelledCohort(o: SyntheticOptions) {
  const rand = rng(o.seed);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-12)) * Math.cos(2 * Math.PI * rand());
  const out: { conditions: string[]; starts: Start[]; mean: number }[] = [];
  for (let u = 0; u < o.users; u++) {
    const irregular = rand() < (o.irregularShare ?? 0.15);
    const personalMean = irregular ? 34 + 6 * gauss() : 28.5 + 2.6 * gauss();
    const sd = irregular ? 6 + 6 * rand() : Math.exp(Math.log(2.2) + 0.45 * gauss());
    const drift = (rand() - 0.5) * (o.driftRange ?? 0.3);
    const bleedMean = 4 + 2 * rand();
    const nCycles = 2 + Math.floor(rand() * 14);
    const starts: Start[] = [];
    let day = Date.UTC(2024, 0, 1) + Math.floor(rand() * 60) * 86_400_000;
    const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
    for (let i = 0; i < nCycles; i++) {
      Math.max(2, Math.min(10, Math.round(bleedMean + gauss())));
      if (!(rand() < (o.missedLog ?? 0.05) && i > 0 && i < nCycles - 1)) {
        starts.push({ iso: iso(day), idx: i, double: false });
        rand(); // mEnd coin
        if (rand() < (o.doubleLog ?? 0.02)) starts.push({ iso: iso(day + (3 + Math.floor(rand() * 5)) * 86_400_000), idx: i, double: true });
      }
      const len = irregular ? personalMean * Math.exp((sd / personalMean) * gauss()) + drift * i : personalMean + sd * gauss() + drift * i;
      day += Math.max(18, Math.round(len)) * 86_400_000;
    }
    // Dedupe like the harness does implicitly (sorted by date; duplicates are rare but possible).
    starts.sort((a, b) => a.iso.localeCompare(b.iso));
    out.push({ conditions: irregular ? ["irregular"] : [], starts, mean: personalMean });
  }
  return out;
}

type Cls = "genuine" | "skip" | "double";
/** Class oracle (headroom, not a model): v2-trunc for c = 1 rows, the true-c component truncated at t0 for skips. */
let trueC = 1;
const oracle: LateModel = (past, ctx, t0) => {
  const p = resolveForecastPrior(ctx.conditions, ctx.perimenoStage);
  const m = predictMetric(past, p.cycle, p.gate, 0.8, CYCLE_SCALE);
  if (trueC === 1) return v2Trunc(past, ctx, t0);
  const mu = m.mu + Math.log(trueC);
  const f0 = normCdf((Math.log(t0 - 0.5) - mu) / m.s);
  const q = (u: number) => Math.exp(mu + m.s * normInv(f0 + u * (1 - f0)));
  return { point: q(0.5), lo80: q(0.1), hi80: q(0.9) };
};
const models: Record<string, LateModel> = { "v2-trunc": v2Trunc, ...lateModels, "oracle-c": oracle };
const acc: Record<string, Record<Cls, { n: number; ae: number; cov: number; skipMode: number }>> = {};
const comp: Record<string, Record<Cls, number>> = {};

for (const sc of SCENARIOS) {
  for (const seed of sc.seeds) {
    for (const h of labelledCohort({ ...sc.opts, seed })) {
      const ctx = { conditions: h.conditions };
      const s = h.starts;
      for (let k = 1; k + 1 < s.length; k++) {
        const past: number[] = [];
        for (let i = 1; i <= k; i++) past.push(diffDays(s[i - 1].iso, s[i].iso));
        const y = diffDays(s[k].iso, s[k + 1].iso);
        const p = resolveForecastPrior(ctx.conditions);
        const m = predictMetric(past, p.cycle, p.gate, 0.8, CYCLE_SCALE);
        const t0 = Math.floor(m.upper) + 1;
        if (y < t0) continue;
        const cls: Cls = s[k].double || s[k + 1].double ? "double" : s[k + 1].idx - s[k].idx >= 2 ? "skip" : "genuine";
        const key = sc.reportOnly ? "literature" : "primary";
        comp[key] ??= { genuine: 0, skip: 0, double: 0 };
        comp[key][cls]++;
        if (sc.reportOnly) continue;
        trueC = cls === "skip" ? s[k + 1].idx - s[k].idx : 1;
        for (const [name, lm] of Object.entries(models)) {
          const pr = lm(past, ctx, t0) as Pred;
          acc[name] ??= { genuine: { n: 0, ae: 0, cov: 0, skipMode: 0 }, skip: { n: 0, ae: 0, cov: 0, skipMode: 0 }, double: { n: 0, ae: 0, cov: 0, skipMode: 0 } };
          const a = acc[name][cls];
          a.n++;
          a.ae += Math.abs(pr.point - y);
          a.cov += y >= pr.lo80! && y <= pr.hi80! ? 1 : 0;
          a.skipMode += pr.point > Math.exp(m.mu + Math.log(1.5)) ? 1 : 0;
        }
      }
    }
  }
}

console.log("late-row composition (pooled rows):", JSON.stringify(comp));
console.log("model".padEnd(12), "class    n     MAE    cov80  point-in-skip-mode");
for (const [name, byCls] of Object.entries(acc)) {
  for (const [cls, a] of Object.entries(byCls)) {
    if (!a.n) continue;
    console.log(name.padEnd(12), cls.padEnd(8), String(a.n).padEnd(5), (a.ae / a.n).toFixed(2).padEnd(6), (a.cov / a.n).toFixed(3).padEnd(6), (a.skipMode / a.n).toFixed(3));
  }
}
