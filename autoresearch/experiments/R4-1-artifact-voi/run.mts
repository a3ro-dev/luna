/**
 * R4-1: value of catching logging artifacts at input time (see protocol.md).
 *   node --no-warnings autoresearch/experiments/R4-1-artifact-voi/run.mts [--json out.json]
 */
import { writeFileSync } from "node:fs";
import { MODELS, runBacktest, summarize, syntheticCohort } from "../../../src/lib/prediction/backtest.ts";
import { SCENARIOS } from "../../src/eval2.mts";

const SEEDS = [201, 202, 203, 204, 205, 206, 207, 208, 209, 210];
const RATES = [0, 0.25, 0.5, 0.75, 1];
const ARMS = ["missed", "double", "both"] as const;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const models = { "v2-bayes": MODELS["v2-bayes"] };

const out: Record<string, Record<string, Record<string, { macroMae: number; is80: number; cov80: number; artifactShare: number }>>> = {};
for (const sc of SCENARIOS) {
  out[sc.name] = {};
  for (const arm of ARMS) {
    out[sc.name][arm] = {};
    for (const c of RATES) {
      if (arm !== "missed" && c === 0 && out[sc.name].missed?.["0"]) { out[sc.name][arm]["0"] = out[sc.name].missed["0"]; continue; }
      const runs = SEEDS.map((seed) => {
        const opts = { ...sc.opts, seed };
        if (arm !== "double") opts.missedLog = (sc.opts.missedLog ?? 0.05) * (1 - c);
        if (arm !== "missed") opts.doubleLog = (sc.opts.doubleLog ?? 0.02) * (1 - c);
        const rows = runBacktest(syntheticCohort(opts), "cycle", models).filter((r) => r.nPast >= 1);
        const s = summarize(rows, "v2-bayes");
        return { macroMae: s.macroMae, is80: s.intervalScore80, cov80: s.coverage80, artifactShare: rows.filter((r) => r.targetGated).length / rows.length };
      });
      out[sc.name][arm][String(c)] = {
        macroMae: mean(runs.map((r) => r.macroMae)), is80: mean(runs.map((r) => r.is80)),
        cov80: mean(runs.map((r) => r.cov80)), artifactShare: mean(runs.map((r) => r.artifactShare)),
      };
    }
  }
}

for (const [sc, arms] of Object.entries(out)) {
  console.log(`\n${sc}`);
  for (const [arm, byC] of Object.entries(arms)) {
    const b = byC["0"];
    for (const [c, m] of Object.entries(byC)) {
      console.log(`  ${arm.padEnd(7)} c=${c.padEnd(5)} macroMAE ${m.macroMae.toFixed(3)}  IS80 ${m.is80.toFixed(2)} (${((m.is80 / b.is80 - 1) * 100).toFixed(1)}%)  cov80 ${m.cov80.toFixed(3)}  artifacts ${(m.artifactShare * 100).toFixed(1)}%`);
    }
  }
}
const j = process.argv.indexOf("--json");
if (j > 0) writeFileSync(process.argv[j + 1], JSON.stringify(out, null, 2));
