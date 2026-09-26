/**
 * R2-2 diagnostic: how far does ACI move alpha, and does it close the
 * per-group (regular vs irregular profile) in-gate coverage gap?
 *   node --no-warnings autoresearch/experiments/R2-2-adaptive-conformal/diag.mts
 */
import { MODELS, runBacktest, syntheticCohort } from "../../../src/lib/prediction/backtest.ts";
import { CYCLE_SCALE, predictMetric, resolveForecastPrior } from "../../../src/lib/prediction/forecast.ts";
import { aciAlpha, models } from "./model.ts";
import { SCENARIOS } from "../../src/eval2.mts";

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
for (const sc of SCENARIOS) {
  const h = syntheticCohort({ ...sc.opts, seed: sc.seeds[0] });
  const cond = new Map(h.map((u) => [u.userKey, u.conditions]));
  const rows = runBacktest(h, "cycle", { "v2-bayes": MODELS["v2-bayes"], ...models }).filter((r) => r.nPast >= 1);
  console.log(`\n${sc.name} seed ${sc.seeds[0]}  (rows ${rows.length})`);
  for (const grp of ["regular", "irregular"]) {
    const g = rows.filter((r) => (cond.get(r.userKey)!.includes("irregular") ? "irregular" : "regular") === grp && !r.targetGated);
    const line = ["v2-bayes", "R2-2-aci", "R2-2-aci-ingate"].map((m) => {
      const cov = g.filter((r) => r.y >= r.preds[m]!.lo80! && r.y <= r.preds[m]!.hi80!).length / g.length;
      const w = mean(g.map((r) => r.preds[m]!.hi80! - r.preds[m]!.lo80!));
      return `${m} cov ${cov.toFixed(3)} w ${w.toFixed(2)}`;
    });
    console.log(`  ${grp.padEnd(9)} in-gate n=${g.length}  ${line.join(" | ")}`);
  }
}

// Alpha distribution at the final origin of each user (base seed 42).
const h = syntheticCohort({ ...SCENARIOS[0].opts, seed: SCENARIOS[0].seeds[0] });
const finals: { a: number; ai: number; n: number }[] = [];
for (const u of h) {
  const starts = [...u.cycles].map((c) => c.mStart).sort();
  const past = starts.slice(1).map((s, i) => Math.round((Date.parse(s) - Date.parse(starts[i])) / 86_400_000));
  if (!past.length) continue;
  const p = resolveForecastPrior(u.conditions, null);
  const predict = (xs: number[]) => predictMetric(xs, p.cycle, p.gate, 0.8, CYCLE_SCALE);
  finals.push({ a: aciAlpha(past, p.gate, predict, { gamma: 0.05 }), ai: aciAlpha(past, p.gate, predict, { gamma: 0.05, inGateOnly: true }), n: past.length });
}
const q = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.floor(p * (xs.length - 1))];
for (const k of ["a", "ai"] as const) {
  const xs = finals.map((f) => f[k]);
  console.log(`\nfinal alpha (${k === "a" ? "aci" : "aci-ingate"}), base 42, ${xs.length} users: p10 ${q(xs, 0.1).toFixed(3)} p50 ${q(xs, 0.5).toFixed(3)} p90 ${q(xs, 0.9).toFixed(3)} min ${Math.min(...xs).toFixed(3)} max ${Math.max(...xs).toFixed(3)}; |alpha-0.2|>0.05: ${(xs.filter((x) => Math.abs(x - 0.2) > 0.05).length / xs.length).toFixed(3)}`);
}
console.log(`mean past intervals per user: ${mean(finals.map((f) => f.n)).toFixed(1)}`);
