/**
 * EXPLORATORY diagnostic: where does the baseline mis-coverage come from?
 * Cycle-target 80% coverage split by scenario x prior profile (base vs
 * "irregular" condition) x whether the target interval itself falls outside
 * the gate (a merged missed-log gap or a double log), pooled over seeds.
 *
 *   node --no-warnings autoresearch/experiments/H6-prior-sensitivity/diag.mts
 */
import { SCENARIOS } from "../../src/eval.mts";
import { MODELS, runBacktest, syntheticCohort, type Row } from "../../../src/lib/prediction/backtest.ts";
import { makeModel } from "./model.ts";

const models = {
  "v2-bayes": MODELS["v2-bayes"],
  "nu1": makeModel({ nu0: 1 }),
  "sd0.75": makeModel({ withinScale: 0.75 }),
  "sd1.25": makeModel({ withinScale: 1.25 }),
};
const cov = (rows: Row[], m: string) =>
  rows.filter((r) => r.y >= r.preds[m]!.lo80! && r.y <= r.preds[m]!.hi80!).length / rows.length;

console.log("scenario  profile    target    n      share  " + Object.keys(models).map((m) => m.padEnd(9)).join(""));
for (const sc of SCENARIOS) {
  const rows: (Row & { irr: boolean })[] = [];
  for (const seed of sc.seeds) {
    const h = syntheticCohort({ ...sc.opts, seed });
    const irr = new Set(h.filter((u) => u.conditions.includes("irregular")).map((u) => `${seed}:${u.userKey}`));
    for (const r of runBacktest(h, "cycle", models)) if (r.nPast >= 1) rows.push({ ...r, irr: irr.has(`${seed}:${r.userKey}`) });
  }
  const groups: [string, (r: Row & { irr: boolean }) => boolean][] = [
    ["base  all     ", (r) => !r.irr],
    ["base  in-gate ", (r) => !r.irr && !r.targetGated],
    ["base  gated   ", (r) => !r.irr && r.targetGated],
    ["irreg all     ", (r) => r.irr],
    ["irreg in-gate ", (r) => r.irr && !r.targetGated],
    ["irreg gated   ", (r) => r.irr && r.targetGated],
  ];
  // Share of the baseline's summed 80% interval score that comes from gated targets.
  const is80 = (r: Row) => {
    const { lo80: l, hi80: u } = r.preds["v2-bayes"]!;
    return u! - l! + 10 * Math.max(0, l! - r.y) + 10 * Math.max(0, r.y - u!);
  };
  const tot = rows.reduce((a, r) => a + is80(r), 0);
  const gated = rows.filter((r) => r.targetGated).reduce((a, r) => a + is80(r), 0);
  console.log(`${sc.name}: gated targets = ${(rows.filter((r) => r.targetGated).length / rows.length).toFixed(3)} of rows, ${(gated / tot).toFixed(3)} of v2-bayes IS80`);
  for (const [label, pick] of groups) {
    const g = rows.filter(pick);
    if (!g.length) continue;
    console.log(
      sc.name.padEnd(9), label.padEnd(20), String(g.length).padEnd(6), (g.length / rows.length).toFixed(3).padEnd(6),
      Object.keys(models).map((m) => cov(g, m).toFixed(3).padEnd(9)).join(""),
    );
  }
}
