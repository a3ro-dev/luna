/**
 * EXPLORATORY diagnostic for R2-6. Pooled over each scenario's seeds:
 *  - null check: cleanSd = 4 must reproduce v2-bayes exactly;
 *  - 80% coverage / IS80 split by branch (clean base-profile, base-profile with a
 *    set-aside interval, condition profile) x target (in-gate vs artifact);
 *  - artifact-target rate per branch (does a set-aside past predict artifact risk?);
 *  - PIT histograms (in-gate, clean branch) for v2 and R26-clean3.
 *
 *   node --no-warnings autoresearch/experiments/R2-6-clean-width/diag.mts
 */
import { strict as assert } from "node:assert";
import { SCENARIOS } from "../../src/eval2.mts";
import { MODELS, runBacktest, syntheticCohort, type Row } from "../../../src/lib/prediction/backtest.ts";
import { CYCLE_SCALE, diffDays, metricCdf, predictMetric, resolveForecastPrior } from "../../../src/lib/prediction/forecast.ts";
import { isClean, makeModel, models } from "./model.ts";

const v2 = MODELS["v2-bayes"];
const cands = { "v2-bayes": v2, "null-sd4": makeModel({ cleanSd: 4 }), "R26-clean3": models["R26-clean3"], "R26-clean3-wonly": models["R26-clean3-wonly"] };
const is80 = (r: Row, m: string) => {
  const { lo80: l, hi80: u } = r.preds[m]!;
  return u! - l! + 10 * Math.max(0, l! - r.y) + 10 * Math.max(0, r.y - u!);
};
const cov = (rs: Row[], m: string) => rs.filter((r) => r.y >= r.preds[m]!.lo80! && r.y <= r.preds[m]!.hi80!).length / rs.length;
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const f = (x: number) => x.toFixed(3);

type R = Row & { branch: string; pit: number };
for (const sc of SCENARIOS) {
  const rows: R[] = [];
  for (const seed of sc.seeds) {
    const h = syntheticCohort({ ...sc.opts, seed });
    const byKey = new Map(h.map((u) => [u.userKey, u]));
    for (const r of runBacktest(h, "cycle", cands)) {
      if (r.nPast < 1) continue;
      const a = r.preds["v2-bayes"]!, b = r.preds["null-sd4"]!;
      assert.ok(Math.abs(a.point - b.point) < 1e-9 && Math.abs(a.lo80! - b.lo80!) < 1e-9 && Math.abs(a.hi80! - b.hi80!) < 1e-9, "cleanSd=4 must equal v2");
      const u = byKey.get(r.userKey)!;
      // runBacktest does not expose past; rebuild it exactly as it does (intervals up to origin nPast).
      const cyc = [...u.cycles].sort((x, y) => x.mStart.localeCompare(y.mStart));
      const past = cyc.slice(1, r.nPast + 1).map((c, i) => diffDays(cyc[i].mStart, c.mStart));
      const p = resolveForecastPrior(u.conditions, u.perimenoStage);
      const branch = p.cycle.withinSd !== 4 ? "condition" : isClean(past, u.conditions, u.perimenoStage) ? "clean" : "set-aside";
      const m = predictMetric(past, p.cycle, p.gate, 0.8, CYCLE_SCALE);
      rows.push({ ...r, userKey: `${seed}:${r.userKey}`, branch, pit: metricCdf(m, r.y) });
    }
  }
  console.log(`\n${sc.name}${sc.reportOnly ? " (report-only)" : ""}: ${rows.length} rows`);
  console.log("branch     target    n      artRate  cov v2 / clean3 / wonly      IS80 v2 / clean3 / wonly");
  for (const br of ["clean", "set-aside", "condition"]) {
    const g = rows.filter((r) => r.branch === br);
    const art = g.filter((r) => r.targetGated).length / g.length;
    for (const [tl, pick] of [["in-gate", (r: Row) => !r.targetGated], ["artifact", (r: Row) => r.targetGated]] as const) {
      const s = g.filter(pick);
      if (!s.length) continue;
      const ms = ["v2-bayes", "R26-clean3", "R26-clean3-wonly"];
      console.log(br.padEnd(10), tl.padEnd(9), String(s.length).padEnd(6), f(art).padEnd(8),
        ms.map((m) => f(cov(s, m))).join(" / ").padEnd(28), ms.map((m) => avg(s.map((r) => is80(r, m))).toFixed(2)).join(" / "));
    }
  }
  const clean = rows.filter((r) => r.branch === "clean" && !r.targetGated);
  const hist = (vals: number[]) => {
    const b = new Array(10).fill(0);
    for (const v of vals) b[Math.min(9, Math.max(0, Math.floor(v * 10)))]++;
    return b.map((x) => (x / vals.length).toFixed(3)).join(" ");
  };
  console.log("PIT clean in-gate v2    ", hist(clean.map((r) => r.pit)));
  const c3 = clean.map((r) => (r.preds["R26-clean3"] as { cdf: (y: number) => number }).cdf(r.y));
  console.log("PIT clean in-gate clean3", hist(c3));
}
console.log("\nnull check passed: cleanSd = 4 reproduces v2-bayes on every row");
