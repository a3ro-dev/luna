// Diagnostic (not the locked metric): where do H4 variants gain or lose vs v2-bayes?
// Buckets: user type x nPast (cold <=2 / 3-5 / est >=6) x whether the variant changed the forecast.
import { MODELS, runBacktest, syntheticCohort } from "../../../src/lib/prediction/backtest.ts";
import { SCENARIOS } from "../../src/eval.mts";
import { models } from "./model.ts";
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(models);
for (const sc of SCENARIOS) {
  const acc: Record<string, { n: number; d: number; inB: number; inC: number }> = {};
  for (const seed of sc.seeds) {
    const h = syntheticCohort({ ...sc.opts, seed });
    const ctype = new Map(h.map((u) => [u.userKey, u.conditions.length ? "irr" : "reg"]));
    const rows = runBacktest(h, "cycle", { base: MODELS["v2-bayes"], ...Object.fromEntries(names.map((n) => [n, models[n]])) }).filter((r) => r.nPast >= 1);
    for (const r of rows) for (const n of names) {
      const b = r.preds.base!, c = r.preds[n]!;
      if (Math.abs(b.point - c.point) < 1e-9) continue;
      const k = `${n.padEnd(11)} ${ctype.get(r.userKey)} ${r.nPast <= 2 ? "cold" : r.nPast < 6 ? "mid " : "est "} ${r.targetGated ? "yGated" : "yOk   "}`;
      const a = (acc[k] ??= { n: 0, d: 0, inB: 0, inC: 0 });
      a.n++; a.d += Math.abs(c.point - r.y) - Math.abs(b.point - r.y);
      a.inB += +(r.y >= b.lo80! && r.y <= b.hi80!); a.inC += +(r.y >= c.lo80! && r.y <= c.hi80!);
    }
  }
  console.log(`== ${sc.name} (rows whose forecast changed; dAE = sum of |err| change, >0 is worse)`);
  for (const [k, a] of Object.entries(acc).sort()) console.log(k, `n=${String(a.n).padStart(4)} dAE=${a.d.toFixed(0).padStart(5)} mean=${(a.d / a.n).toFixed(2).padStart(6)} cov ${(a.inB / a.n).toFixed(2)}->${(a.inC / a.n).toFixed(2)}`);
}
