/**
 * Locked evaluation for forecast autoresearch.
 *
 *   node --no-warnings autoresearch/src/eval.mts <candidate-module.ts> [--json out.json]
 *
 * The candidate module must `export const models: Record<string, Model>`.
 * Every candidate is scored next to the production baseline "v2-bayes" on
 * the same rows. Scenarios vary the simulator so a change cannot win by
 * fitting one generator setting.
 *
 * Primary metric (lower is better): cycle-target macro MAE over forecasts
 * with nPast >= 1, averaged over all scenario x seed runs.
 * Hard constraints (locked 2026-09-26 after the baseline run, before any
 * candidate): 80% coverage within [0.72, 0.90] in every run, and mean
 * |coverage - 0.80| (calibration error) no worse than 0.062 (baseline 0.052 + 0.01).
 * A candidate counts as an improvement if macro MAE drops by >= 0.05 d, or
 * IS80 drops by >= 2% while macro MAE rises by no more than 0.02 d.
 * Secondary: interval score IS80, within-3-day share, cold-start and
 * established macro MAE, period-target macro MAE.
 */
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { MODELS, runBacktest, summarize, syntheticCohort, type Model, type Row, type SyntheticOptions } from "../../src/lib/prediction/backtest.ts";

export const SCENARIOS: { name: string; opts: Omit<SyntheticOptions, "seed">; seeds: number[] }[] = [
  { name: "base", opts: { users: 400, missedLog: 0.05, doubleLog: 0.02, irregularShare: 0.15 }, seeds: [42, 7, 2026] },
  { name: "noisy", opts: { users: 400, missedLog: 0.12, doubleLog: 0.05, irregularShare: 0.3 }, seeds: [11, 12] },
  { name: "regular", opts: { users: 400, missedLog: 0.02, doubleLog: 0.01, irregularShare: 0.05 }, seeds: [21, 22] },
];

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function evaluate(candidates: Record<string, Model>) {
  const models = { "v2-bayes": MODELS["v2-bayes"], ...candidates };
  const runs: Record<string, Record<string, number | null>>[] = [];
  for (const sc of SCENARIOS) {
    for (const seed of sc.seeds) {
      const h = syntheticCohort({ ...sc.opts, seed });
      const cyc = runBacktest(h, "cycle", models).filter((r) => r.nPast >= 1);
      const per = runBacktest(h, "period", models).filter((r) => r.nPast >= 1);
      const sub = (rows: Row[], f: (r: Row) => boolean) => rows.filter(f);
      const run: Record<string, Record<string, number | null>> = {};
      for (const m of Object.keys(models)) {
        const all = summarize(cyc, m);
        run[m] = {
          macroMae: all.macroMae, mae: all.mae, within3: all.within3, cov80: all.coverage80,
          is80: all.intervalScore80, width80: all.width80, bias: all.bias,
          coldMacroMae: summarize(sub(cyc, (r) => r.nPast <= 2), m).macroMae,
          estMacroMae: summarize(sub(cyc, (r) => r.nPast >= 6), m).macroMae,
          periodMacroMae: summarize(per, m).macroMae,
          periodCov80: summarize(per, m).coverage80,
        };
      }
      runs.push({ [`${sc.name}:${seed}`]: run } as never);
    }
  }
  const flat = runs.map((r) => Object.values(r)[0]) as unknown as Record<string, Record<string, number | null>>[];
  const keys = Object.keys(models);
  const agg: Record<string, Record<string, number | boolean>> = {};
  for (const m of keys) {
    const col = (k: string) => flat.map((r) => r[m][k]).filter((v): v is number => v != null && Number.isFinite(v));
    const covs = col("cov80");
    agg[m] = {
      macroMae: mean(col("macroMae")), mae: mean(col("mae")), within3: mean(col("within3")),
      is80: mean(col("is80")), width80: mean(col("width80")), bias: mean(col("bias")),
      coldMacroMae: mean(col("coldMacroMae")), estMacroMae: mean(col("estMacroMae")),
      periodMacroMae: mean(col("periodMacroMae")),
      cov80Min: covs.length ? Math.min(...covs) : NaN, cov80Max: covs.length ? Math.max(...covs) : NaN,
      calibErr: covs.length ? mean(covs.map((c) => Math.abs(c - 0.8))) : NaN,
      coverageOk:
        covs.length === flat.length && covs.every((c) => c >= 0.72 && c <= 0.9) && mean(covs.map((c) => Math.abs(c - 0.8))) <= 0.062,
    };
  }
  return { scenarios: runs, aggregate: agg };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const modPath = process.argv[2];
  const candidates: Record<string, Model> = modPath ? (await import(pathToFileURL(resolve(modPath)).href)).models : {};
  const out = evaluate(candidates);
  const f = (x: number | boolean) => (typeof x === "boolean" ? String(x) : x.toFixed(3));
  console.log("model".padEnd(28), "macroMAE  MAE    w3     IS80   width  cov[min,max]   calib  cold   est    period ok");
  for (const [m, a] of Object.entries(out.aggregate)) {
    console.log(
      m.padEnd(28),
      [a.macroMae, a.mae, a.within3, a.is80, a.width80].map(f).join("  "),
      ` [${f(a.cov80Min)},${f(a.cov80Max)}]`,
      f(a.calibErr),
      [a.coldMacroMae, a.estMacroMae, a.periodMacroMae].map(f).join("  "),
      a.coverageOk,
    );
  }
  const j = process.argv.indexOf("--json");
  if (j > 0) writeFileSync(process.argv[j + 1], JSON.stringify(out, null, 2));
}
