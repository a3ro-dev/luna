/**
 * Rolling-origin backtest of cycle forecasting models.
 *
 *   node --no-warnings scripts/backtest.mts synthetic [seed]
 *   node --env-file=.env --no-warnings scripts/backtest.mts db
 *
 * db mode opens ONE read-only transaction, reads only start/end dates and
 * profile conditions, replaces user ids with in-memory indices, and prints
 * aggregates only. Strata covering fewer than 5 users are suppressed.
 *
 * Acceptance criteria (declared before the first run; see
 * papers/research-notes.md "Evaluation protocol"):
 *  A1 v2 80% coverage within [0.75, 0.88] on synthetic cycle targets.
 *  A2 v2 macro MAE no worse than v1 + 0.25 d on synthetic cycle targets.
 *  A3 v2 MAE no worse than v1 at cold start (nPast <= 2) on synthetic.
 *  A4 real-data results are reported as exploratory only.
 */
import { bootstrapMacroMaeDiff, MODELS, runBacktest, summarize, syntheticCohort, type History, type Row } from "../src/lib/prediction/backtest.ts";

const mode = process.argv[2] ?? "synthetic";
const MIN_USERS = mode === "db" ? 5 : 1;

async function loadDb(): Promise<History[]> {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);
  const [users, cycles] = await sql.transaction(
    [
      sql`SELECT id, conditions, perimeno_stage FROM users`,
      sql`SELECT user_id, m_start::text AS m_start, m_end::text AS m_end FROM cycles ORDER BY user_id, m_start`,
    ],
    { readOnly: true },
  );
  const key = new Map<string, string>();
  (users as { id: string }[]).forEach((u, i) => key.set(u.id, `u${i}`));
  const byUser = new Map<string, History>();
  for (const u of users as { id: string; conditions: unknown; perimeno_stage: string | null }[]) {
    byUser.set(u.id, {
      userKey: key.get(u.id)!,
      conditions: Array.isArray(u.conditions) ? (u.conditions as string[]) : [],
      perimenoStage: (u.perimeno_stage as History["perimenoStage"]) ?? null,
      cycles: [],
    });
  }
  for (const c of cycles as { user_id: string; m_start: string; m_end: string | null }[]) {
    byUser.get(c.user_id)?.cycles.push({ mStart: c.m_start, mEnd: c.m_end });
  }
  return [...byUser.values()].filter((h) => h.cycles.length > 0);
}

const histories =
  mode === "db"
    ? await loadDb()
    : syntheticCohort({ users: 400, seed: Number(process.argv[3] ?? 42), missedLog: 0.05, doubleLog: 0.02, irregularShare: 0.15 });

const f = (x: number | null, d = 2) => (x == null || Number.isNaN(x) ? "  -  " : x.toFixed(d));

function table(title: string, rows: Row[]) {
  const users = new Set(rows.map((r) => r.userKey)).size;
  console.log(`\n### ${title}  (forecasts=${rows.length}, users=${users < MIN_USERS ? "<5" : users})`);
  if (users < MIN_USERS) return console.log("suppressed: fewer than 5 users");
  console.log("model              n   MAE  MedAE  RMSE  bias  P90AE  <=2d  <=3d  <=7d macroMAE cov80 cov95 width80  IS80");
  for (const m of Object.keys(MODELS)) {
    const s = summarize(rows, m);
    if (!s.forecasts) {
      console.log(`${m.padEnd(17)} abstains on all`);
      continue;
    }
    console.log(
      [m.padEnd(17), String(s.forecasts).padStart(3), f(s.mae), f(s.medae), f(s.rmse), f(s.bias), f(s.p90ae), f(s.within2), f(s.within3), f(s.within7), f(s.macroMae), f(s.coverage80), f(s.coverage95), f(s.width80, 1), f(s.intervalScore80, 1)].join(" "),
    );
  }
}

for (const target of ["cycle", "period"] as const) {
  const rows = runBacktest(histories, target);
  console.log(`\n\n## target: ${target}`);
  table("all targets", rows);
  if (target === "cycle") table("targets inside plausible gate", rows.filter((r) => !r.targetGated));
  table("cold start (nPast 0-2)", rows.filter((r) => r.nPast <= 2));
  table("some history (nPast 3-5)", rows.filter((r) => r.nPast >= 3 && r.nPast <= 5));
  table("established (nPast 6+)", rows.filter((r) => r.nPast >= 6));
  const scored = rows.filter((r) => r.nPast >= 1);
  const d = bootstrapMacroMaeDiff(scored, "v2-bayes", "v1-current");
  console.log(
    d.users < MIN_USERS
      ? "\nv2 - v1 macro MAE: suppressed (fewer than 5 users)"
      : `\nv2 - v1 macro MAE (nPast>=1, user-cluster bootstrap 95% CI): ${f(d.diff)} [${f(d.lo)}, ${f(d.hi)}] over ${d.users} users`,
  );
}
