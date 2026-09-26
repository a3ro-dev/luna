/**
 * H3 diagnostics (not the locked eval): 80% coverage and IS80 split by
 * scenario, nPast bucket and whether the target itself is outside the gate
 * (missed/extra log). Also checks the local predictive reduces to v2 when
 * the t df goes to infinity.
 *   node --no-warnings autoresearch/experiments/H3-student-t-predictive/diag.mts
 */
import { SCENARIOS } from "../../src/eval.mts";
import { MODELS, runBacktest, syntheticCohort, type Model, type Row } from "../../../src/lib/prediction/backtest.ts";
import { CYCLE_SCALE, resolveForecastPrior } from "../../../src/lib/prediction/forecast.ts";
import { models, predictT } from "./model.ts";

const normalCopy: Model = (past, ctx, t) => {
  const p = resolveForecastPrior(ctx.conditions, ctx.perimenoStage);
  return t === "cycle"
    ? predictT(past, p.cycle, p.gate, CYCLE_SCALE, { exact: false, nu0: 4, df: 1e7 })
    : predictT(past, p.period, null, "linear", { exact: false, nu0: 4, df: 1e7 });
};
{
  // Sanity: local copy with df -> inf must match production v2 on every row.
  let maxD = 0;
  for (const t of ["cycle", "period"] as const) {
    for (const r of runBacktest(syntheticCohort({ users: 300, seed: 5, missedLog: 0.1, doubleLog: 0.05, irregularShare: 0.3 }), t, { a: MODELS["v2-bayes"], b: normalCopy })) {
      const a = r.preds.a!, b = r.preds.b!;
      maxD = Math.max(maxD, Math.abs(a.point - b.point), Math.abs(a.lo80! - b.lo80!), Math.abs(a.hi80! - b.hi80!));
    }
  }
  console.log(`local-normal vs v2-bayes max |diff| = ${maxD.toExponential(2)}`);
  if (maxD > 1e-4) throw new Error("local predictive copy diverges from production v2");
}

const all = { "v2-bayes": MODELS["v2-bayes"], ...models };
const cov = (rows: Row[], m: string) => rows.filter((r) => r.y >= r.preds[m]!.lo80! && r.y <= r.preds[m]!.hi80!).length / rows.length;
const is80 = (rows: Row[], m: string) =>
  rows.reduce((a, r) => { const { lo80: l, hi80: u } = r.preds[m]!; return a + u! - l! + 10 * Math.max(0, l! - r.y) + 10 * Math.max(0, r.y - u!); }, 0) / rows.length;
const buckets: [string, (r: Row) => boolean][] = [
  ["n1-2", (r) => r.nPast <= 2], ["n3-5", (r) => r.nPast >= 3 && r.nPast <= 5], ["n6+", (r) => r.nPast >= 6],
  ["gatedY", (r) => r.targetGated], ["cleanY", (r) => !r.targetGated],
];
for (const sc of SCENARIOS) {
  const rows = sc.seeds.flatMap((seed) => runBacktest(syntheticCohort({ ...sc.opts, seed }), "cycle", all).filter((r) => r.nPast >= 1));
  console.log(`\n${sc.name} (rows ${rows.length}, gated targets ${(rows.filter((r) => r.targetGated).length / rows.length).toFixed(3)})`);
  console.log("model".padEnd(14), buckets.map(([b]) => `${b} cov/IS80`.padEnd(18)).join(""));
  for (const m of Object.keys(all)) {
    console.log(m.padEnd(14), buckets.map(([, f]) => { const s = rows.filter(f); return `${cov(s, m).toFixed(3)}/${is80(s, m).toFixed(1)}`.padEnd(18); }).join(""));
  }
}
