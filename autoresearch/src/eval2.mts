/**
 * Locked evaluation v2 for forecast autoresearch round 2 (2026-09-26).
 *
 *   node --no-warnings autoresearch/src/eval2.mts <candidate-module.ts> [--json out.json]
 *
 * The candidate may export:
 *   models:     Record<string, Model>      day-0 forecasts (as in eval.mts)
 *   lateModels: Record<string, LateModel>  forecasts made once a period is late
 * where LateModel = (past, ctx, t0) => Pred | null predicts the cycle length y
 * given that no period has started by day t0 (so y >= t0).
 *
 * Adds to eval.mts (whose primary metric and constraints are unchanged):
 *  - in-gate metrics: coverage / IS80 on targets inside the plausibility gate,
 *    separating real cycles from logging artifacts (merged or double logs);
 *  - a late regime: cycles still open the day after v2's 80% window ("late"),
 *    and at day 40 ("day40", the Li et al. 2022 protocol). Baseline v2-trunc is
 *    v2's own predictive truncated at t0;
 *  - a literature-anchored scenario (drift +-0.015 d/cycle, 4% missed logs),
 *    REPORT ONLY: a gain that reverses there is rejected;
 *  - PIT histograms (10 bins) for models that return a cdf.
 *
 * Improvement rules (locked before any round-2 candidate runs):
 *  Day-0 track: coverage constraints of eval.mts hold AND one of
 *    (a) macroMAE <= base - 0.05 d;
 *    (b) IS80 <= 0.98 * base with macroMAE <= base + 0.02;
 *    (c) in-gate calibration error <= base - 0.02 with IS80 <= 1.01 * base
 *        and macroMAE <= base + 0.02.
 *  Late track: late MAE <= 0.9 * v2-trunc late MAE, AND late cov80 within
 *    [0.72, 0.90] in every primary run.
 *  Both: the gain must keep its sign on the literature scenario.
 */
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import {
  MODELS, runBacktest, summarize, syntheticCohort,
  type Ctx, type History, type Model, type Pred, type Row, type SyntheticOptions,
} from "../../src/lib/prediction/backtest.ts";
import {
  CYCLE_SCALE, diffDays, metricCdf, metricQuantile, predictMetric, resolveForecastPrior,
} from "../../src/lib/prediction/forecast.ts";

export type LateModel = (past: number[], ctx: Ctx, t0: number) => Pred | null;

export const SCENARIOS: { name: string; opts: Omit<SyntheticOptions, "seed">; seeds: number[]; reportOnly?: boolean }[] = [
  { name: "base", opts: { users: 400, missedLog: 0.05, doubleLog: 0.02, irregularShare: 0.15 }, seeds: [42, 7, 2026] },
  { name: "noisy", opts: { users: 400, missedLog: 0.12, doubleLog: 0.05, irregularShare: 0.3 }, seeds: [11, 12] },
  { name: "regular", opts: { users: 400, missedLog: 0.02, doubleLog: 0.01, irregularShare: 0.05 }, seeds: [21, 22] },
  { name: "literature", opts: { users: 400, missedLog: 0.04, doubleLog: 0.02, irregularShare: 0.15, driftRange: 0.03 }, seeds: [31, 32], reportOnly: true },
];

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

// ─── Baselines with a predictive distribution ─────────────────────
function v2Predictive(past: number[], ctx: Ctx) {
  const p = resolveForecastPrior(ctx.conditions, ctx.perimenoStage);
  return predictMetric(past, p.cycle, p.gate, 0.8, CYCLE_SCALE);
}

/** v2 day-0 with its cdf attached, for PIT. */
const v2WithCdf: Model = (past, ctx, t) => {
  const base = MODELS["v2-bayes"](past, ctx, t);
  if (!base || t !== "cycle") return base;
  const m = v2Predictive(past, ctx);
  return { ...base, cdf: (y: number) => metricCdf(m, y) } as Pred;
};

/** v2's predictive conditioned on y >= t0 (integer days: y > t0 - 0.5). */
export const v2Trunc: LateModel = (past, ctx, t0) => {
  const m = v2Predictive(past, ctx);
  const f0 = metricCdf(m, t0 - 0.5);
  if (f0 >= 1 - 1e-9) return { point: t0, lo80: t0, hi80: t0 + 1 };
  const q = (p: number) => metricQuantile(m, f0 + p * (1 - f0));
  return { point: q(0.5), lo80: q(0.1), hi80: q(0.9), cdf: (y: number) => (metricCdf(m, y) - f0) / (1 - f0) } as Pred;
};

// ─── Late-regime rows ─────────────────────────────────────────────
interface LateRow { userKey: string; y: number; t0: number; past: number[]; ctx: Ctx; regime: "late" | "day40" }

function lateRows(histories: History[]): LateRow[] {
  const rows: LateRow[] = [];
  for (const h of histories) {
    const cycles = [...h.cycles].sort((a, b) => a.mStart.localeCompare(b.mStart));
    const ctx = { conditions: h.conditions, perimenoStage: h.perimenoStage };
    for (let k = 1; k + 1 < cycles.length; k++) {
      const past: number[] = [];
      for (let i = 1; i <= k; i++) past.push(diffDays(cycles[i - 1].mStart, cycles[i].mStart));
      const y = diffDays(cycles[k].mStart, cycles[k + 1].mStart);
      const m = v2Predictive(past, ctx);
      const t0 = Math.floor(m.upper) + 1;
      if (y >= t0) rows.push({ userKey: h.userKey, y, t0, past, ctx, regime: "late" });
      if (y >= 40) rows.push({ userKey: h.userKey, y, t0: 40, past, ctx, regime: "day40" });
    }
  }
  return rows;
}

function scoreLate(rows: LateRow[], model: LateModel) {
  const scored = rows.map((r) => ({ r, p: model(r.past, r.ctx, r.t0) })).filter((x) => x.p);
  const byUser = new Map<string, number[]>();
  const ae = scored.map(({ r, p }) => {
    const e = Math.abs(p!.point - r.y);
    byUser.set(r.userKey, [...(byUser.get(r.userKey) ?? []), e]);
    return e;
  });
  const withI = scored.filter(({ p }) => p!.lo80 != null && p!.hi80 != null);
  return {
    n: scored.length,
    mae: mean(ae),
    macroMae: mean([...byUser.values()].map(mean)),
    cov80: withI.length ? withI.filter(({ r, p }) => r.y >= p!.lo80! && r.y <= p!.hi80!).length / withI.length : null,
    is80: withI.length
      ? mean(withI.map(({ r, p }) => p!.hi80! - p!.lo80! + 10 * Math.max(0, p!.lo80! - r.y) + 10 * Math.max(0, r.y - p!.hi80!)))
      : null,
    width80: withI.length ? mean(withI.map(({ p }) => p!.hi80! - p!.lo80!)) : null,
  };
}

// ─── Day-0 extras ─────────────────────────────────────────────────
function inGate(rows: Row[], m: string) {
  const s = summarize(rows.filter((r) => !r.targetGated), m);
  return { cov80: s.coverage80, is80: s.intervalScore80 };
}

function pit(rows: Row[], m: string): number[] | null {
  const vals = rows
    .map((r) => (r.preds[m] as (Pred & { cdf?: (y: number) => number }) | null)?.cdf?.(r.y))
    .filter((v): v is number => v != null && Number.isFinite(v));
  if (!vals.length) return null;
  const bins = new Array(10).fill(0);
  for (const v of vals) bins[Math.min(9, Math.max(0, Math.floor(v * 10)))]++;
  return bins.map((b) => +(b / vals.length).toFixed(4));
}

export function evaluate(candidates: Record<string, Model> = {}, lateCandidates: Record<string, LateModel> = {}) {
  const dayModels = { "v2-bayes": v2WithCdf, ...candidates };
  const lateModelsAll = { "v2-trunc": v2Trunc, ...lateCandidates };
  const runs: { scenario: string; seed: number; reportOnly: boolean; day0: Record<string, Record<string, unknown>>; late: Record<string, Record<string, unknown>>; artifactShare: number }[] = [];

  for (const sc of SCENARIOS) {
    for (const seed of sc.seeds) {
      const h = syntheticCohort({ ...sc.opts, seed });
      const cyc = runBacktest(h, "cycle", dayModels).filter((r) => r.nPast >= 1);
      const day0: Record<string, Record<string, unknown>> = {};
      for (const m of Object.keys(dayModels)) {
        const s = summarize(cyc, m);
        const g = inGate(cyc, m);
        day0[m] = {
          macroMae: s.macroMae, mae: s.mae, cov80: s.coverage80, is80: s.intervalScore80, width80: s.width80,
          inGateCov80: g.cov80, inGateIs80: g.is80, pit: pit(cyc, m),
        };
      }
      const lr = lateRows(h);
      const late: Record<string, Record<string, unknown>> = {};
      for (const [name, lm] of Object.entries(lateModelsAll)) {
        late[name] = {
          late: scoreLate(lr.filter((r) => r.regime === "late"), lm),
          day40: scoreLate(lr.filter((r) => r.regime === "day40"), lm),
        };
      }
      runs.push({
        scenario: sc.name, seed, reportOnly: Boolean(sc.reportOnly), day0, late,
        artifactShare: cyc.filter((r) => r.targetGated).length / cyc.length,
      });
    }
  }

  const primary = runs.filter((r) => !r.reportOnly);
  const lit = runs.filter((r) => r.reportOnly);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
  const agg = (set: typeof runs, pick: (r: (typeof runs)[number]) => unknown) => mean(set.map((r) => num(pick(r))).filter(Number.isFinite));

  const day0Agg: Record<string, Record<string, number | boolean>> = {};
  for (const m of Object.keys(dayModels)) {
    const covs = primary.map((r) => num(r.day0[m].cov80));
    day0Agg[m] = {
      macroMae: agg(primary, (r) => r.day0[m].macroMae),
      is80: agg(primary, (r) => r.day0[m].is80),
      calibErr: mean(covs.map((c) => Math.abs(c - 0.8))),
      inGateCalibErr: agg(primary, (r) => Math.abs(num(r.day0[m].inGateCov80) - 0.8)),
      inGateIs80: agg(primary, (r) => r.day0[m].inGateIs80),
      coverageOk: covs.every((c) => c >= 0.72 && c <= 0.9) && mean(covs.map((c) => Math.abs(c - 0.8))) <= 0.062,
      litMacroMae: agg(lit, (r) => r.day0[m].macroMae),
      litIs80: agg(lit, (r) => r.day0[m].is80),
    };
  }
  const lateAgg: Record<string, Record<string, number | boolean>> = {};
  for (const m of Object.keys(lateModelsAll)) {
    const covs = primary.map((r) => num((r.late[m].late as { cov80: number | null }).cov80));
    lateAgg[m] = {
      lateMae: agg(primary, (r) => (r.late[m].late as { mae: number }).mae),
      lateMacroMae: agg(primary, (r) => (r.late[m].late as { macroMae: number }).macroMae),
      lateCov80: mean(covs),
      lateCovOk: covs.every((c) => c >= 0.72 && c <= 0.9),
      lateIs80: agg(primary, (r) => (r.late[m].late as { is80: number }).is80),
      day40Mae: agg(primary, (r) => (r.late[m].day40 as { mae: number }).mae),
      day40Cov80: agg(primary, (r) => (r.late[m].day40 as { cov80: number }).cov80),
      litLateMae: agg(lit, (r) => (r.late[m].late as { mae: number }).mae),
      nLate: agg(primary, (r) => (r.late[m].late as { n: number }).n),
    };
  }
  return { runs, day0: day0Agg, late: lateAgg };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const modPath = process.argv[2];
  const mod = modPath ? await import(pathToFileURL(resolve(modPath)).href) : {};
  const out = evaluate(mod.models ?? {}, mod.lateModels ?? {});
  const f = (x: number | boolean) => (typeof x === "boolean" ? String(x) : Number.isFinite(x) ? x.toFixed(3) : "-");
  console.log("DAY-0".padEnd(28), "macroMAE  IS80    calib  gCalib gIS80   ok     litMAE litIS80");
  for (const [m, a] of Object.entries(out.day0)) {
    console.log(m.padEnd(28), [a.macroMae, a.is80, a.calibErr, a.inGateCalibErr, a.inGateIs80, a.coverageOk, a.litMacroMae, a.litIs80].map(f).join("  "));
  }
  console.log("\nLATE".padEnd(29), "lateMAE  macro  cov80  covOk  IS80    d40MAE d40cov litLateMAE n");
  for (const [m, a] of Object.entries(out.late)) {
    console.log(m.padEnd(28), [a.lateMae, a.lateMacroMae, a.lateCov80, a.lateCovOk, a.lateIs80, a.day40Mae, a.day40Cov80, a.litLateMae, a.nLate].map(f).join("  "));
  }
  const j = process.argv.indexOf("--json");
  if (j > 0) writeFileSync(process.argv[j + 1], JSON.stringify(out, null, 2));
}
