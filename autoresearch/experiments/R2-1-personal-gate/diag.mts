/**
 * R2-1 diagnostic: which past intervals does the personal gate set aside, and are
 * they real artifacts? Re-runs backtest.ts syntheticCohort's exact RNG stream to
 * label each logged interval clean / merged (missed log) / double, and checks
 * the replica reproduces the original cohort.
 *   node --no-warnings autoresearch/experiments/R2-1-personal-gate/diag.mts
 */
import { strict as assert } from "node:assert";
import { rng, syntheticCohort, type SyntheticOptions } from "../../../src/lib/prediction/backtest.ts";
import { diffDays, resolveForecastPrior } from "../../../src/lib/prediction/forecast.ts";
import { usableMask } from "../../../src/lib/prediction/forecast.ts";
import { SCENARIOS } from "../../src/eval2.mts";
import { mask, personalGate } from "./model.ts";

type Kind = "clean" | "merged" | "double";

/** Copy of syntheticCohort that also returns a label per logged interval. */
function labelled(o: SyntheticOptions) {
  const rand = rng(o.seed);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-12)) * Math.cos(2 * Math.PI * rand());
  const out: { irregular: boolean; starts: string[]; kinds: Kind[] }[] = [];
  for (let u = 0; u < o.users; u++) {
    const irregular = rand() < (o.irregularShare ?? 0.15);
    const personalMean = irregular ? 34 + 6 * gauss() : 28.5 + 2.6 * gauss();
    const sd = irregular ? 6 + 6 * rand() : Math.exp(Math.log(2.2) + 0.45 * gauss());
    const drift = (rand() - 0.5) * (o.driftRange ?? 0.3);
    const bleedMean = 4 + 2 * rand();
    const nCycles = 2 + Math.floor(rand() * 14);
    const logs: { t: number; real: number; dbl: boolean }[] = [];
    let day = Date.UTC(2024, 0, 1) + Math.floor(rand() * 60) * 86_400_000;
    for (let i = 0; i < nCycles; i++) {
      Math.max(2, Math.min(10, Math.round(bleedMean + gauss())));
      if (!(rand() < (o.missedLog ?? 0.05) && i > 0 && i < nCycles - 1)) {
        rand(); // mEnd draw
        logs.push({ t: day, real: i, dbl: false });
        if (rand() < (o.doubleLog ?? 0.02)) logs.push({ t: day + (3 + Math.floor(rand() * 5)) * 86_400_000, real: i, dbl: true });
      }
      const len = irregular ? personalMean * Math.exp((sd / personalMean) * gauss()) + drift * i : personalMean + sd * gauss() + drift * i;
      day += Math.max(18, Math.round(len)) * 86_400_000;
    }
    const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
    const kinds: Kind[] = [];
    for (let j = 1; j < logs.length; j++) {
      const a = logs[j - 1], b = logs[j];
      kinds.push(a.dbl || b.dbl ? "double" : b.real - a.real > 1 ? "merged" : "clean");
    }
    out.push({ irregular, starts: logs.map((l) => iso(l.t)), kinds });
  }
  return out;
}

for (const sc of SCENARIOS) {
  for (const seed of sc.seeds) {
    const opts = { ...sc.opts, seed };
    const orig = syntheticCohort(opts);
    const lab = labelled(opts);
    // Replica check (orig dedupes nothing, so starts must match exactly once sorted).
    orig.forEach((h, u) => assert.deepEqual([...h.cycles.map((c) => c.mStart)].sort(), [...lab[u].starts].sort(), `replica ${sc.name}/${seed}/${u}`));

    // Interval level, full history per user: what the personal gate removes beyond production.
    const c = { regular: { merged: 0, clean: 0, double: 0, inGateMerged: 0, caughtInGateMerged: 0 }, irregular: { merged: 0, clean: 0, double: 0, inGateMerged: 0, caughtInGateMerged: 0 } };
    let forecasts = 0, changed = 0, pgActive = 0;
    for (let u = 0; u < lab.length; u++) {
      const L = lab[u];
      // Sorted order equals generation order unless a double overtakes the next start (18 d floor > 7 d): never.
      const xs = L.starts.slice(1).map((s, i) => diffDays(L.starts[i], s));
      const gate = resolveForecastPrior(orig[u].conditions).gate;
      const prof = L.irregular ? c.irregular : c.regular;
      // Per forecast origin k (past = xs[0..k-1]): does the fit set change?
      for (let k = 1; k < xs.length; k++) {
        const past = xs.slice(0, k);
        forecasts++;
        if (personalGate(past, gate)) pgActive++;
        const a = usableMask(past, gate), b = mask(past, gate, "literal");
        if (a.some((v, i) => v !== b[i])) changed++;
      }
      if (!xs.length) continue;
      const a = usableMask(xs, gate), b = mask(xs, gate, "literal");
      xs.forEach((x, i) => {
        const kind = L.kinds[i];
        if (kind === "merged" && x >= gate.min && x <= gate.max) {
          prof.inGateMerged++;
          if (!b[i]) prof.caughtInGateMerged++;
        }
        if (a[i] && !b[i]) prof[kind]++;
      });
    }
    console.log(`${sc.name.padEnd(10)} ${seed}  forecasts ${forecasts}  pgate active ${(pgActive / forecasts).toFixed(3)}  fit changed ${(changed / forecasts).toFixed(3)}`);
    for (const [p, v] of Object.entries(c)) {
      console.log(`   ${p.padEnd(9)} newly set aside: merged ${v.merged} clean ${v.clean} double ${v.double} | in-gate merged gaps ${v.inGateMerged}, caught ${v.caughtInGateMerged}`);
    }
  }
}
