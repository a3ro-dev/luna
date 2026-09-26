// EXPLORATORY diagnostic for H5: why does the median blend not help?
// Per scenario and nPast bucket: macro MAE of v2, the pure rolling median of
// usable intervals (w=1), H5-gate3, and corr(err_v2, err_median).
import { SCENARIOS } from "../../src/eval.mts";
import { MODELS, runBacktest, summarize, syntheticCohort, type Model } from "../../../src/lib/prediction/backtest.ts";
import { models } from "./model.ts";
import { CYCLE_SCALE, predictMetric, resolveForecastPrior, usableMask } from "../../../src/lib/prediction/forecast.ts";

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const medOnly: Model = (past, ctx, t) => {
  if (t !== "cycle") return null;
  const p = resolveForecastPrior(ctx.conditions, ctx.perimenoStage);
  const f = past.filter((x) => x > 0); const mk = usableMask(f, p.gate); const u = f.filter((_, i) => mk[i]);
  return u.length ? { point: median(u.slice(-6)) } : { point: predictMetric([], p.cycle, null, 0.8, CYCLE_SCALE).mean };
};
const ms = { "v2-bayes": MODELS["v2-bayes"], "med6-usable": medOnly, "H5-gate3": models["H5-gate3"] };
const buckets: [string, (n: number) => boolean][] = [["n1-2", (n) => n <= 2], ["n3-5", (n) => n >= 3 && n <= 5], ["n6+", (n) => n >= 6]];
for (const sc of SCENARIOS) {
  const rows = sc.seeds.flatMap((seed) => runBacktest(syntheticCohort({ ...sc.opts, seed }), "cycle", ms).map((r) => ({ ...r, userKey: `${seed}:${r.userKey}` })));
  for (const [b, f] of buckets) {
    const sub = rows.filter((r) => f(r.nPast));
    const e1 = sub.map((r) => r.preds["v2-bayes"]!.point - r.y), e2 = sub.map((r) => r.preds["med6-usable"]!.point - r.y);
    const mu = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    const m1 = mu(e1), m2 = mu(e2);
    const cov = mu(e1.map((x, i) => (x - m1) * (e2[i] - m2)));
    const corr = cov / Math.sqrt(mu(e1.map((x) => (x - m1) ** 2)) * mu(e2.map((x) => (x - m2) ** 2)));
    console.log(sc.name.padEnd(8), b.padEnd(5), String(sub.length).padStart(5),
      Object.keys(ms).map((m) => `${m}=${summarize(sub, m).macroMae.toFixed(3)}`).join("  "), `corr=${corr.toFixed(3)}`);
  }
}
