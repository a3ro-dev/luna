/**
 * R3 confirmatory run (see protocol.md): frozen round-2 late models on unseen
 * seeds 101-140 for every scenario. Criteria are evaluated here verbatim.
 *
 *   node --no-warnings autoresearch/experiments/R3-late-window/confirm.mts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { SCENARIOS, evaluate } from "../../src/eval2.mts";
import { lateModels as B } from "../R2-3-late-skip-mixture/model-b.ts";
import { lateModels as A } from "../R2-3-late-skip-mixture/model-a.ts";

const seeds = Array.from({ length: 40 }, (_, i) => 101 + i);
for (const sc of SCENARIOS) {
  sc.seeds = seeds;
  sc.reportOnly = false; // every scenario is scored in R3
}
const out = evaluate({}, { "B1-norm-c2": B["B1-norm-c2"], "A-c23": A["A-c23"] });

type Late = { mae: number; cov80: number; is80: number };
const verdict: Record<string, unknown> = {};
for (const name of ["B1-norm-c2", "A-c23"]) {
  const per: Record<string, { covInRange: number; day40Cov: number; maeRatio: number }> = {};
  let isOk = 0;
  for (const sc of SCENARIOS) {
    const runs = out.runs.filter((r) => r.scenario === sc.name);
    const late = runs.map((r) => r.late[name].late as Late);
    const base = runs.map((r) => r.late["v2-trunc"].late as Late);
    const d40 = runs.map((r) => (r.late[name].day40 as Late).cov80);
    late.forEach((l, i) => { if (l.is80 <= 0.7 * base[i].is80) isOk++; });
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    per[sc.name] = {
      covInRange: late.filter((l) => l.cov80 >= 0.72 && l.cov80 <= 0.9).length / late.length,
      day40Cov: mean(d40.filter((x) => Number.isFinite(x))),
      maeRatio: mean(late.map((l) => l.mae)) / mean(base.map((b) => b.mae)),
    };
  }
  const total = SCENARIOS.length * seeds.length;
  const pass =
    Object.values(per).every((p) => p.covInRange >= 0.9 && p.day40Cov >= 0.72 && p.maeRatio <= 1) && isOk / total >= 0.95;
  verdict[name] = { pass, is80ShareUnder70pct: isOk / total, perScenario: per };
}
console.log(JSON.stringify(verdict, null, 2));
mkdirSync(new URL("./results/", import.meta.url), { recursive: true });
writeFileSync(new URL("./results/confirm.json", import.meta.url), JSON.stringify({ verdict, late: out.late }, null, 2));
