/**
 * EXPLORATORY diagnostics for H1 (not part of the locked evaluation):
 * how often the robust location moves the forecast, how much error sits in
 * artifact-like targets, and a user-cluster bootstrap CI for the best variant.
 *   node --no-warnings autoresearch/experiments/H1-robust-location/diagnose.ts
 */
import { MODELS, bootstrapMacroMaeDiff, runBacktest, syntheticCohort } from "../../../src/lib/prediction/backtest.ts";
import { SCENARIOS } from "../../src/eval.mts";
import { variant } from "./model.ts";

const models = { base: MODELS["v2-bayes"], hub: variant("huber", "classic") };
for (const sc of SCENARIOS) for (const seed of sc.seeds) {
  const rows = runBacktest(syntheticCohort({ ...sc.opts, seed }), "cycle", models).filter((r) => r.nPast >= 1);
  const moved = rows.filter((r) => Math.abs(r.preds.hub!.point - r.preds.base!.point) >= 0.5);
  const ae = (rs: typeof rows, m: string) => rs.reduce((a, r) => a + Math.abs(r.preds[m]!.point - r.y), 0) / rs.length;
  const weird = rows.filter((r) => r.y < 0.75 * r.preds.base!.point || r.y > 1.4 * r.preds.base!.point);
  const b = bootstrapMacroMaeDiff(rows, "hub", "base");
  console.log(`${sc.name}:${seed}`.padEnd(12),
    `moved>=0.5d ${(moved.length / rows.length).toFixed(3)}  AE on moved base ${ae(moved, "base").toFixed(2)} hub ${ae(moved, "hub").toFixed(2)}`,
    `| artifact-like targets ${(weird.length / rows.length).toFixed(3)} carry ${(weird.reduce((a, r) => a + Math.abs(r.preds.base!.point - r.y), 0) / rows.reduce((a, r) => a + Math.abs(r.preds.base!.point - r.y), 0)).toFixed(3)} of base AE`,
    `| hub-base macro ${b.diff.toFixed(3)} [${b.lo.toFixed(3)}, ${b.hi.toFixed(3)}]`);
}
