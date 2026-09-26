/**
 * EXPLORATORY stress test: the harness generator's regular users have a median
 * within-person SD of 2.2 d, tighter than the literature (AWHS 3.8-5.4 d). This
 * copies syntheticCohort (backtest.ts) with that median as a knob; 2.2 reproduces
 * the harness cohort exactly (asserted). Base-scenario settings, harness seeds.
 *
 *   node --no-warnings autoresearch/experiments/R2-6-clean-width/stress.mts
 */
import { strict as assert } from "node:assert";
import { MODELS, rng, runBacktest, summarize, syntheticCohort, type History, type SyntheticOptions } from "../../../src/lib/prediction/backtest.ts";
import type { CycleInput } from "../../../src/lib/prediction/forecast.ts";
import { models } from "./model.ts";

function cohort(o: SyntheticOptions, sdMedian: number): History[] {
  const rand = rng(o.seed);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-12)) * Math.cos(2 * Math.PI * rand());
  const out: History[] = [];
  for (let u = 0; u < o.users; u++) {
    const irregular = rand() < (o.irregularShare ?? 0.15);
    const personalMean = irregular ? 34 + 6 * gauss() : 28.5 + 2.6 * gauss();
    const sd = irregular ? 6 + 6 * rand() : Math.exp(Math.log(sdMedian) + 0.45 * gauss());
    const drift = (rand() - 0.5) * (o.driftRange ?? 0.3);
    const bleedMean = 4 + 2 * rand();
    const nCycles = 2 + Math.floor(rand() * 14);
    const cycles: CycleInput[] = [];
    let day = Date.UTC(2024, 0, 1) + Math.floor(rand() * 60) * 86_400_000;
    const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
    for (let i = 0; i < nCycles; i++) {
      const bleed = Math.max(2, Math.min(10, Math.round(bleedMean + gauss())));
      if (!(rand() < (o.missedLog ?? 0.05) && i > 0 && i < nCycles - 1)) {
        cycles.push({ mStart: iso(day), mEnd: rand() < 0.7 ? iso(day + (bleed - 1) * 86_400_000) : null });
        if (rand() < (o.doubleLog ?? 0.02)) cycles.push({ mStart: iso(day + (3 + Math.floor(rand() * 5)) * 86_400_000), mEnd: null });
      }
      const len = irregular ? personalMean * Math.exp((sd / personalMean) * gauss()) + drift * i : personalMean + sd * gauss() + drift * i;
      day += Math.max(18, Math.round(len)) * 86_400_000;
    }
    out.push({ userKey: `s${u}`, conditions: irregular ? ["irregular"] : [], cycles });
  }
  return out;
}

const opts = { users: 400, missedLog: 0.05, doubleLog: 0.02, irregularShare: 0.15 };
const seeds = [42, 7, 2026];
assert.deepEqual(cohort({ ...opts, seed: 42 }, 2.2), syntheticCohort({ ...opts, seed: 42 }), "copy must reproduce the harness generator");

const ms = { "v2-bayes": MODELS["v2-bayes"], ...models };
console.log("sdMedian  model              macroMAE  IS80    cov80  inGateCov80  inGateIS80");
for (const sdMedian of [2.2, 3.0, 3.8, 4.5]) {
  const acc: Record<string, number[][]> = {};
  for (const seed of seeds) {
    const rows = runBacktest(cohort({ ...opts, seed }, sdMedian), "cycle", ms).filter((r) => r.nPast >= 1);
    for (const m of Object.keys(ms)) {
      const s = summarize(rows, m), g = summarize(rows.filter((r) => !r.targetGated), m);
      (acc[m] ??= []).push([s.macroMae, s.intervalScore80!, s.coverage80!, g.coverage80!, g.intervalScore80!]);
    }
  }
  for (const [m, runs] of Object.entries(acc)) {
    const avg = runs[0].map((_, j) => runs.reduce((a, r) => a + r[j], 0) / runs.length);
    console.log(String(sdMedian).padEnd(9), m.padEnd(18), avg.map((x) => x.toFixed(3).padEnd(7)).join("  "));
  }
}
