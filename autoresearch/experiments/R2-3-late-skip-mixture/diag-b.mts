// Design B diagnostic: what late rows are, and how far a point forecast can go.
// "skip-like" = y > 1.6 x the v2 predictive median (a proxy; the generator does not label merges).
import { syntheticCohort } from "../../../src/lib/prediction/backtest.ts";
import { CYCLE_SCALE, diffDays, normCdf, predictMetric, resolveForecastPrior, usableMask } from "../../../src/lib/prediction/forecast.ts";
import { SCENARIOS, v2Trunc } from "../../src/eval2.mts";
import { lateModels } from "./model-b.ts";

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const t4 = (t: number) => { const u = 1 + (t * t) / 4; return 0.5 + 0.375 * (t / Math.sqrt(u)) * (1 - (t * t) / (12 * u)); };
/** P(c = 2 | y >= t0) for the c in {1,2} mixture (same formulas as model-b.ts). */
function postSkip(past: number[], p: ReturnType<typeof resolveForecastPrior>, mu: number, s: number, t0: number, cdf: (z: number) => number) {
  const mask = usableMask(past, p.gate);
  const w = (1 + past.filter((x, i) => !mask[i] && x > p.gate.max).length) / (1 + 0.955 / 0.045 + past.filter((x) => x >= p.gate.min).length);
  const a = Math.log(t0 - 0.5);
  const s1 = (1 - w) * (1 - cdf((a - mu) / s)), s2 = w * (1 - cdf((a - mu - Math.log(2)) / s));
  return s2 / (s1 + s2);
}
const acc: Record<string, { cls: string; e: Record<string, number>; y: number; t0: number; med: number; irr: boolean; pN: number; pT: number }[]> = {};
for (const sc of SCENARIOS) for (const seed of sc.seeds) {
  const rows: typeof acc[string] = (acc[sc.name] ??= []);
  for (const h of syntheticCohort({ ...sc.opts, seed })) {
    const cyc = [...h.cycles].sort((a, b) => a.mStart.localeCompare(b.mStart));
    const ctx = { conditions: h.conditions };
    const p = resolveForecastPrior(h.conditions);
    for (let k = 1; k + 1 < cyc.length; k++) {
      const past: number[] = [];
      for (let i = 1; i <= k; i++) past.push(diffDays(cyc[i - 1].mStart, cyc[i].mStart));
      const y = diffDays(cyc[k].mStart, cyc[k + 1].mStart);
      const m = predictMetric(past, p.cycle, p.gate, 0.8, CYCLE_SCALE);
      const t0 = Math.floor(m.upper) + 1;
      if (y < t0) continue;
      const e: Record<string, number> = { "v2-trunc": Math.abs(v2Trunc(past, ctx, t0)!.point - y) };
      for (const [n, f] of Object.entries(lateModels)) e[n] = Math.abs(f(past, ctx, t0)!.point - y);
      rows.push({ cls: y > 1.6 * m.mean ? "skip-like" : "single-like", e, y, t0, med: m.mean, irr: h.conditions.length > 0,
        pN: postSkip(past, p, m.mu, m.s, t0, normCdf), pT: postSkip(past, p, m.mu, m.s, t0, t4) });
    }
  }
}
for (const [sc, rows] of Object.entries(acc)) {
  for (const cls of ["single-like", "skip-like"]) {
    const r = rows.filter((x) => x.cls === cls);
    console.log(sc.padEnd(10), cls.padEnd(11), `share=${(r.length / rows.length).toFixed(2)}`, `irr=${mean(r.map((x) => +x.irr)).toFixed(2)}`,
      `y-t0=${mean(r.map((x) => x.y - x.t0)).toFixed(1)}`, `P(skip|late) norm=${mean(r.map((x) => x.pN)).toFixed(2)} t4=${mean(r.map((x) => x.pT)).toFixed(2)}`,
      ...["v2-trunc", "B1-norm-c2", "B3-t4-c2"].map((m) => `${m}=${mean(r.map((x) => x.e[m])).toFixed(2)}`));
  }
  // Oracle: class known, point = class-typical value (t0 + 1 for single, 2 x median for skip), same rows.
  const orc = mean(rows.map((x) => Math.abs((x.cls === "skip-like" ? Math.max(x.t0, 2 * x.med) : x.t0 + 1) - x.y)));
  console.log(sc.padEnd(10), "oracle-class point MAE", orc.toFixed(2), " all-rows v2-trunc", mean(rows.map((x) => x.e["v2-trunc"])).toFixed(2));
}
