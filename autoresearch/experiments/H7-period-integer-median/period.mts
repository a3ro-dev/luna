/**
 * Period-target secondary metrics the locked harness does not aggregate
 * (IS80, width, per-run coverage) plus a user-cluster bootstrap CI for the
 * period macro-MAE difference vs v2-bayes. Same scenarios and seeds as eval.mts.
 *
 *   node --no-warnings autoresearch/experiments/H7-period-integer-median/period.mts
 */
import { MODELS, bootstrapMacroMaeDiff, runBacktest, summarize, syntheticCohort } from "../../../src/lib/prediction/backtest.ts";
import { SCENARIOS } from "../../src/eval.mts";
import { models as cand } from "./model.ts";

const models = { "v2-bayes": MODELS["v2-bayes"], ...cand };
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const acc: Record<string, Record<"mm" | "is" | "w" | "cov" | "cov95" | "w1" | "days" | "isInt" | "d" | "lo" | "hi", number[]>> = {};
for (const m of Object.keys(models)) acc[m] = { mm: [], is: [], w: [], cov: [], cov95: [], w1: [], days: [], isInt: [], d: [], lo: [], hi: [] };
// Integer-honest view: the interval as the set of whole days it contains, [ceil(lo), floor(hi)].
// Coverage is unchanged (y is an integer); width and IS80 no longer depend on
// whether endpoints happen to be fractional.
const intSet = (lo: number, hi: number) => [Math.ceil(lo - 1e-9), Math.floor(hi + 1e-9)];

for (const sc of SCENARIOS) {
  for (const seed of sc.seeds) {
    const rows = runBacktest(syntheticCohort({ ...sc.opts, seed }), "period", models).filter((r) => r.nPast >= 1);
    for (const m of Object.keys(models)) {
      const s = summarize(rows, m);
      const b = bootstrapMacroMaeDiff(rows, m, "v2-bayes");
      const a = acc[m];
      a.mm.push(s.macroMae); a.is.push(s.intervalScore80!); a.w.push(s.width80!); a.cov.push(s.coverage80!); a.cov95.push(s.coverage95!);
      a.w1.push(rows.filter((r) => Math.abs(r.preds[m]!.point - r.y) <= 1).length / rows.length);
      const ints = rows.map((r) => [...intSet(r.preds[m]!.lo80!, r.preds[m]!.hi80!), r.y]);
      a.days.push(mean(ints.map(([l, h]) => h - l + 1)));
      a.isInt.push(mean(ints.map(([l, h, y]) => h - l + 10 * Math.max(0, l - y) + 10 * Math.max(0, y - h))));
      a.d.push(b.diff); a.lo.push(b.lo); a.hi.push(b.hi);
    }
  }
}

const f = (x: number) => x.toFixed(3);
console.log("model".padEnd(20), "pMacroMAE  pIS80   pWidth  pCov80 [min,max]      pCov95  within1  days    IS80int dMacroMAE per-run 95% CI (worst hi)");
for (const [m, a] of Object.entries(acc)) {
  console.log(
    m.padEnd(20), f(mean(a.mm)).padEnd(10), f(mean(a.is)).padEnd(7), f(mean(a.w)).padEnd(7),
    `${f(mean(a.cov))} [${f(Math.min(...a.cov))},${f(Math.max(...a.cov))}]`.padEnd(22), f(mean(a.cov95)).padEnd(7), f(mean(a.w1)).padEnd(8), f(mean(a.days)).padEnd(7), f(mean(a.isInt)).padEnd(7),
    `${f(mean(a.d))} (runs with CI entirely < 0: ${a.hi.filter((h) => h < 0).length}/${a.hi.length}; worst hi ${f(Math.max(...a.hi))})`,
  );
}
