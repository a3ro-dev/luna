// Null check: with splitting disabled the local predictor must equal v2-bayes exactly.
import { MODELS, runBacktest, syntheticCohort } from "../../../src/lib/prediction/backtest.ts";
import { make } from "./model.ts";
const h = syntheticCohort({ users: 400, seed: 11, missedLog: 0.12, doubleLog: 0.05, irregularShare: 0.3 });
const rows = runBacktest(h, "cycle", { base: MODELS["v2-bayes"], off: make("one", -1) });
let maxd = 0;
for (const r of rows) for (const k of ["point", "lo80", "hi80"] as const) maxd = Math.max(maxd, Math.abs(r.preds.base![k]! - r.preds.off![k]!));
console.log("rows", rows.length, "max abs diff", maxd);
if (maxd > 1e-9) process.exit(1);
