/**
 * H6 one-at-a-time sensitivity sweep over NU0, cycle within-SD prior scale
 * and HISTORY_WINDOW, scored by the locked harness, reported per scenario.
 *
 *   node --no-warnings autoresearch/experiments/H6-prior-sensitivity/sweep.mts [--json out.json]
 */
import { writeFileSync } from "node:fs";
import { evaluate, SCENARIOS } from "../../src/eval.mts";
import { makeModel, type Knobs } from "./model.ts";
import type { Model } from "../../../src/lib/prediction/backtest.ts";

const grid: Record<string, Knobs> = { "H6-default": {} };
for (const nu0 of [1, 2, 8, 16, 32]) grid[`H6-nu${nu0}`] = { nu0 };
for (const withinScale of [0.5, 0.75, 1.25, 1.5, 2]) grid[`H6-sd${withinScale}`] = { withinScale };
for (const window of [3, 6, 9, 24]) grid[`H6-win${window}`] = { window };

const cands: Record<string, Model> = {};
for (const [k, v] of Object.entries(grid)) cands[k] = makeModel(v);
// EXPLORATORY (beyond the protocol): per-profile within-SD scale. Base-profile
// users (no conditions) get scale b, condition profiles (here "irregular") get i.
const split = (b: number, i: number): Model => {
  const mb = makeModel({ withinScale: b }), mi = makeModel({ withinScale: i });
  return (p, c, t) => (c.conditions.length ? mi : mb)(p, c, t);
};
for (const [b, i] of [[0.75, 1], [0.75, 1.25], [0.85, 1.15], [1, 1.25]]) cands[`X-b${b}-i${i}`] = split(b, i);
const out = evaluate(cands);

// Self-check: defaults must reproduce production v2-bayes on every run.
const flat = out.scenarios.map((r) => Object.values(r)[0]) as Record<string, Record<string, number | null>>[];
for (const run of flat) for (const k of ["macroMae", "is80", "cov80", "periodMacroMae"])
  if (Math.abs((run["H6-default"][k] ?? 0) - (run["v2-bayes"][k] ?? 0)) > 1e-9) throw new Error(`H6-default drifts on ${k}`);

// Per-scenario means (over seeds) and deltas vs v2-bayes.
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const scen = (m: string, name: string, k: string) =>
  mean(out.scenarios.flatMap((r) => Object.entries(r).filter(([key]) => key.startsWith(name + ":")).map(([, v]) => v[m][k] as number)));
const calib = (m: string, name: string) =>
  mean(out.scenarios.flatMap((r) => Object.entries(r).filter(([key]) => key.startsWith(name + ":")).map(([, v]) => Math.abs((v[m].cov80 as number) - 0.8))));

const f = (x: number, d = 3) => (x >= 0 ? "+" : "") + x.toFixed(d);
const perScenario: Record<string, unknown> = {};
console.log("model          | agg dMAE  dIS80%  calib ok  | per scenario (base / noisy / regular): dMAE ; dIS80 ; cov80 ; d|cov-.8|");
for (const m of Object.keys(out.aggregate)) {
  const a = out.aggregate[m], b = out.aggregate["v2-bayes"];
  const cells = SCENARIOS.map((s) => {
    const r = {
      dMae: scen(m, s.name, "macroMae") - scen("v2-bayes", s.name, "macroMae"),
      dIs80: scen(m, s.name, "is80") - scen("v2-bayes", s.name, "is80"),
      cov80: scen(m, s.name, "cov80"),
      dCalib: calib(m, s.name) - calib("v2-bayes", s.name),
    };
    return [s.name, r] as const;
  });
  perScenario[m] = Object.fromEntries(cells);
  const all3 = (k: "dMae" | "dIs80" | "dCalib") => cells.every(([, r]) => r[k] < 0);
  console.log(
    m.padEnd(14), "|",
    f((a.macroMae as number) - (b.macroMae as number)).padStart(7),
    f((100 * ((a.is80 as number) - (b.is80 as number))) / (b.is80 as number), 2).padStart(7),
    (a.calibErr as number).toFixed(3), String(a.coverageOk).padEnd(5), "|",
    cells.map(([, r]) => `${f(r.dMae)} ; ${f(r.dIs80, 2)} ; ${r.cov80.toFixed(3)} ; ${f(r.dCalib)}`).join("  /  "),
    `| all3: MAE=${all3("dMae")} IS80=${all3("dIs80")} calib=${all3("dCalib")}`,
  );
}

const j = process.argv.indexOf("--json");
if (j > 0) writeFileSync(process.argv[j + 1], JSON.stringify({ grid, aggregate: out.aggregate, perScenario }, null, 2));
