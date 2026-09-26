/**
 * Reviewer check (throwaway): R2-6 on UNSEEN seeds. Reuses the locked harness
 * evaluate() unchanged (same runBacktest/syntheticCohort/lateRows/scoring) by
 * swapping the seed lists in memory; eval2.mts on disk is untouched.
 *
 *   node --no-warnings autoresearch/experiments/R2-6-clean-width/verify-unseen.mts [seeds...]
 */
import { SCENARIOS, evaluate } from "../../src/eval2.mts";
import { models } from "./model.ts";

const seeds = process.argv.slice(2).map(Number).filter(Number.isFinite);
const use = seeds.length ? seeds : [101, 102, 103];
const keep = SCENARIOS.filter((s) => s.name === "base" || s.name === "noisy" || s.name === "literature");
SCENARIOS.splice(0, SCENARIOS.length, ...keep.map((s) => ({ ...s, seeds: use })));

const cands = { "R26-clean3": models["R26-clean3"], "R26-clean3-wonly": models["R26-clean3-wonly"] };
const out = evaluate(cands);
const f = (x: number) => x.toFixed(3);
const num = (v: unknown) => v as number;

console.log("seeds", use.join(","));
console.log("scen       seed  model             macroMAE IS80    cov80  gCov80");
for (const r of out.runs) for (const m of ["v2-bayes", ...Object.keys(cands)]) {
  const d = r.day0[m];
  console.log(r.scenario.padEnd(10), String(r.seed).padEnd(5), m.padEnd(17), f(num(d.macroMae)), f(num(d.is80)).padEnd(7), f(num(d.cov80)), f(num(d.inGateCov80)));
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
for (const sc of ["base", "noisy", "literature", "base+noisy"]) {
  const rs = out.runs.filter((r) => (sc === "base+noisy" ? r.scenario !== "literature" : r.scenario === sc));
  const agg = (m: string) => {
    const covs = rs.map((r) => num(r.day0[m].cov80));
    return {
      macro: avg(rs.map((r) => num(r.day0[m].macroMae))),
      is80: avg(rs.map((r) => num(r.day0[m].is80))),
      calib: avg(covs.map((c) => Math.abs(c - 0.8))),
      gCalib: avg(rs.map((r) => Math.abs(num(r.day0[m].inGateCov80) - 0.8))),
      minCov: Math.min(...covs),
    };
  };
  const b = agg("v2-bayes");
  for (const m of Object.keys(cands)) {
    const c = agg(m);
    const clauseC = c.gCalib <= b.gCalib - 0.02 && c.is80 <= 1.01 * b.is80 && c.macro <= b.macro + 0.02;
    console.log(`${sc.padEnd(11)} ${m.padEnd(17)} dMacro ${(c.macro - b.macro).toFixed(3)}  IS80 ${((c.is80 / b.is80 - 1) * 100).toFixed(2)}%  ` +
      `gCalib ${f(b.gCalib)}->${f(c.gCalib)}  calib ${f(b.calib)}->${f(c.calib)}  minCov ${f(b.minCov)}->${f(c.minCov)} ${c.minCov >= 0.72 ? "" : "BELOW-FLOOR"}  clauseC ${clauseC}`);
  }
}
const lt = out.late["v2-trunc"];
console.log(`late v2-trunc (base+noisy): lateMAE ${f(num(lt.lateMae))} cov80 ${f(num(lt.lateCov80))}`);
