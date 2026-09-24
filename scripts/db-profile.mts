/**
 * Read-only, aggregate-only data-quality profile of the cycles database.
 *
 *   node --env-file=.env scripts/db-profile.mts
 *
 * Guarantees:
 * - every query runs inside a single READ ONLY transaction;
 * - only counts / distributions are printed, never ids, emails, dates or notes;
 * - any cell describing fewer than MIN_CELL users is suppressed ("<5").
 */
import { neon } from "@neondatabase/serverless";

const MIN_CELL = 5;
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (use --env-file=.env).");
  process.exit(1);
}
const sql = neon(url);

const cell = (n: number | string | null) => {
  const v = Number(n ?? 0);
  return v > 0 && v < MIN_CELL ? "<5" : String(v);
};

// Ordered cycles with the next start attached. Reused by most checks.
const ORDERED = `
  WITH c AS (
    SELECT user_id, m_start, m_end, ovulation_date, cycle_length, period_length,
           follicular_length, luteal_length, is_anomaly, created_at,
           LAG(m_start)  OVER w AS prev_start,
           LEAD(m_start) OVER w AS next_start,
           ROW_NUMBER()  OVER w AS rn,
           COUNT(*)      OVER (PARTITION BY user_id) AS n_user
    FROM cycles WINDOW w AS (PARTITION BY user_id ORDER BY m_start)
  )`;

const queries = {
  population: `SELECT
      (SELECT count(*) FROM users) AS users,
      (SELECT count(*) FROM users WHERE consent_given) AS consented,
      (SELECT count(*) FROM users WHERE onboarding_completed) AS onboarded,
      (SELECT count(*) FROM cycles) AS cycles,
      (SELECT count(DISTINCT user_id) FROM cycles) AS users_with_cycles,
      (SELECT count(*) FROM prediction_params) AS param_rows,
      (SELECT count(*) FROM chat_sessions) AS chat_sessions`,
  historyLength: `SELECT bucket, count(*) AS users FROM (
      SELECT CASE WHEN n = 1 THEN '1' WHEN n = 2 THEN '2' WHEN n <= 4 THEN '3-4'
                  WHEN n <= 7 THEN '5-7' WHEN n <= 12 THEN '8-12' ELSE '13+' END AS bucket
      FROM (SELECT user_id, count(*) n FROM cycles GROUP BY user_id) t) s
    GROUP BY bucket ORDER BY min(bucket)`,
  completeness: `${ORDERED} SELECT
      count(*) AS cycles,
      count(*) FILTER (WHERE m_end IS NULL) AS missing_end,
      count(*) FILTER (WHERE m_end IS NULL AND next_start IS NULL) AS open_latest,
      count(*) FILTER (WHERE m_end IS NULL AND next_start IS NOT NULL) AS missing_end_historical,
      count(*) FILTER (WHERE ovulation_date IS NOT NULL) AS with_ovulation,
      count(*) FILTER (WHERE next_start IS NOT NULL) AS completed_intervals
    FROM c`,
  integrity: `${ORDERED} SELECT
      count(*) FILTER (WHERE m_end < m_start) AS end_before_start,
      count(*) FILTER (WHERE m_end - m_start + 1 > 14) AS period_over_14d,
      count(*) FILTER (WHERE m_end - m_start + 1 BETWEEN 11 AND 14) AS period_11_14d,
      count(*) FILTER (WHERE next_start IS NOT NULL AND m_end >= next_start) AS overlaps_next,
      count(*) FILTER (WHERE ovulation_date < m_start) AS ovulation_before_start,
      count(*) FILTER (WHERE next_start IS NOT NULL AND ovulation_date >= next_start) AS ovulation_after_next,
      count(*) FILTER (WHERE ovulation_date IS NOT NULL AND m_end IS NOT NULL AND ovulation_date <= m_end) AS ovulation_during_bleed,
      count(*) FILTER (WHERE m_start > CURRENT_DATE) AS future_start,
      (SELECT count(*) FROM (SELECT user_id, m_start FROM cycles GROUP BY 1,2 HAVING count(*) > 1) d) AS duplicate_starts
    FROM c`,
  intervalDistribution: `${ORDERED} SELECT bucket, count(*) AS intervals, count(DISTINCT user_id) AS users FROM (
      SELECT user_id, CASE
        WHEN m_start - prev_start < 15 THEN 'a <15'
        WHEN m_start - prev_start < 21 THEN 'b 15-20'
        WHEN m_start - prev_start <= 35 THEN 'c 21-35'
        WHEN m_start - prev_start <= 45 THEN 'd 36-45'
        WHEN m_start - prev_start <= 90 THEN 'e 46-90'
        ELSE 'f >90' END AS bucket
      FROM c WHERE prev_start IS NOT NULL) s GROUP BY bucket ORDER BY bucket`,
  intervalStats: `${ORDERED} SELECT
      percentile_cont(ARRAY[0.05,0.25,0.5,0.75,0.95]) WITHIN GROUP (ORDER BY m_start - prev_start) AS cycle_q,
      percentile_cont(ARRAY[0.05,0.25,0.5,0.75,0.95]) WITHIN GROUP (ORDER BY m_end - m_start + 1)
        FILTER (WHERE m_end >= m_start) AS period_q
    FROM c`,
  withinUserSd: `${ORDERED}, u AS (
      SELECT user_id, stddev_samp(m_start - prev_start) AS sd, count(*) AS k
      FROM c WHERE prev_start IS NOT NULL AND m_start - prev_start BETWEEN 15 AND 45
      GROUP BY user_id HAVING count(*) >= 3)
    SELECT count(*) AS users,
      percentile_cont(ARRAY[0.25,0.5,0.75]) WITHIN GROUP (ORDER BY sd) AS sd_q FROM u`,
  derivedDrift: `${ORDERED} SELECT
      count(*) FILTER (WHERE cycle_length IS DISTINCT FROM (m_start - prev_start)) AS cycle_length_mismatch,
      count(*) FILTER (WHERE period_length IS DISTINCT FROM (m_end - m_start + 1)) AS period_length_mismatch,
      count(*) FILTER (WHERE luteal_length IS DISTINCT FROM (next_start - ovulation_date)) AS luteal_mismatch,
      count(*) FILTER (WHERE is_anomaly) AS flagged_anomaly
    FROM c`,
  firstIntervalLong: `${ORDERED} SELECT
      count(*) FILTER (WHERE rn = 2 AND m_start - prev_start > 45) AS users_first_interval_gt45,
      count(*) FILTER (WHERE rn = 2 AND m_start - prev_start > 45 AND n_user = 2) AS users_only_interval_gt45
    FROM c`,
  provenance: `SELECT
      count(*) FILTER (WHERE burst >= 3) AS users_with_bulk_created_cycles,
      count(*) AS users_with_cycles FROM (
        SELECT user_id, max(k) AS burst FROM (
          SELECT user_id, date_trunc('minute', created_at) m, count(*) k FROM cycles GROUP BY 1,2) x
        GROUP BY user_id) y`,
  retroLogging: `SELECT
      count(*) FILTER (WHERE created_at::date - m_start <= 3) AS logged_within_3d,
      count(*) FILTER (WHERE created_at::date - m_start BETWEEN 4 AND 30) AS logged_4_30d_late,
      count(*) FILTER (WHERE created_at::date - m_start > 30) AS logged_over_30d_late
    FROM cycles`,
  paramStaleness: `SELECT
      count(*) FILTER (WHERE p.updated_at < c.last_created) AS stale_param_rows,
      count(*) FILTER (WHERE p.param_name = 'cycle_length' AND p.sample_count <> c.intervals) AS cycle_count_mismatch,
      count(*) AS param_rows
    FROM prediction_params p JOIN (
      SELECT user_id, max(created_at) last_created, count(*) - 1 AS intervals FROM cycles GROUP BY user_id) c
    USING (user_id)`,
  conditions: `SELECT cond, count(*) AS users FROM (
      SELECT jsonb_array_elements_text(CASE WHEN jsonb_typeof(conditions) = 'array' THEN conditions ELSE '[]' END) AS cond
      FROM users) s GROUP BY cond ORDER BY cond`,
  conditionCombos: `SELECT jsonb_array_length(conditions) AS k, count(*) AS users FROM users
      WHERE jsonb_typeof(conditions) = 'array' GROUP BY 1 ORDER BY 1`,
  perimenoStage: `SELECT coalesce(perimeno_stage, '(null)') AS stage, count(*) AS users FROM users GROUP BY 1`,
};

const results = await sql.transaction(
  Object.values(queries).map((q) => sql.query(q)),
  { readOnly: true, isolationLevel: "RepeatableRead" },
);

const names = Object.keys(queries);
const COUNT_KEYS = /^(users|users_with_cycles|intervals|consented|onboarded)$/;
for (let i = 0; i < names.length; i++) {
  console.log(`\n## ${names[i]}`);
  for (const row of results[i] as Record<string, unknown>[]) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      // Suppress small user counts; row counts are shown as-is unless the
      // row describes a subgroup (bucket/cond/stage/k), then suppress too.
      const isSubgroupRow = "bucket" in row || "cond" in row || "stage" in row || "k" in row;
      out[k] =
        k === "bucket" || k === "cond" || k === "stage"
          ? v
          :
        typeof v === "number" || (typeof v === "string" && /^\d+$/.test(v))
          ? (COUNT_KEYS.test(k) || isSubgroupRow) && k !== "k"
            ? cell(v as number)
            : v
          : Array.isArray(v)
            ? v.map((x) => Math.round(Number(x) * 10) / 10)
            : v;
    }
    console.log(JSON.stringify(out));
  }
}
