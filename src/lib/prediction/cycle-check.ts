/**
 * Compares logged bleeding patterns with FIGO AUB System 1 normal limits
 * (Munro et al., Int J Gynecol Obstet 2018, doi:10.1002/ijgo.12666):
 * frequency 24-38 days, duration <= 8 days, shortest-to-longest variation
 * <= 7 days (age 26-41) or <= 9 days (18-25, 42-45), over the last 6 months.
 * Norms are only defined for ages 18-45 and do not apply to withdrawal bleeds
 * on hormonal contraception. This is a pattern summary, not a diagnosis.
 */

export type CheckStatus = "typical" | "outside" | "unknown";

export interface CheckItem {
  id: "frequency" | "duration" | "regularity" | "gap";
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface CycleCheck {
  applicable: boolean;
  reason: string | null;
  items: CheckItem[];
  /** True when any item is outside the reference range. */
  worthMentioning: boolean;
}

interface Row {
  mStart: string;
  mEnd: string | null;
}

const DAY_MS = 86_400_000;
const days = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / DAY_MS);

const WINDOW_DAYS = 183; // FIGO metrics use the previous 6 months
const GAP_DAYS = 90; // no bleeding in 90 days is FIGO's "absent"

export function ageOn(dateOfBirth: string | null | undefined, today: string): number | null {
  if (!dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return null;
  const [y, m, d] = dateOfBirth.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
}

export function cycleCheck(
  rows: Row[],
  opts: { today: string; conditions: string[]; age: number | null },
): CycleCheck {
  const na = (reason: string): CycleCheck => ({ applicable: false, reason, items: [], worthMentioning: false });
  if (opts.conditions.includes("hormonal_bc")) {
    return na("On hormonal contraception, bleeds are withdrawal bleeds, so natural-cycle reference ranges don't apply.");
  }
  if (rows.length === 0) return na("Log a period to see how your pattern compares with typical ranges.");

  const sorted = [...rows].filter((r) => r.mStart <= opts.today).sort((a, b) => a.mStart.localeCompare(b.mStart));
  const recent = (iso: string) => days(iso, opts.today) <= WINDOW_DAYS;
  const intervals = sorted.slice(1).flatMap((r, i) => (recent(r.mStart) ? [days(sorted[i].mStart, r.mStart)] : []));
  const durations = sorted.flatMap((r) => (r.mEnd && recent(r.mStart) ? [days(r.mStart, r.mEnd) + 1] : []));
  const ageKnownInRange = opts.age != null && opts.age >= 18 && opts.age <= 45;
  const ageNote =
    opts.age != null && !ageKnownInRange ? " Reference ranges are defined for ages 18-45, so treat this loosely." : "";
  const items: CheckItem[] = [];

  // Frequency: typical cycle length within 24-38 days
  if (intervals.length < 2) {
    items.push({
      id: "frequency",
      label: "Cycle length",
      status: "unknown",
      detail: `Needs ${2 - intervals.length} more cycle${intervals.length === 1 ? "" : "s"} in the last 6 months.`,
    });
  } else {
    const short = intervals.filter((n) => n < 24).length;
    const long = intervals.filter((n) => n > 38).length;
    const outside = short + long > intervals.length / 2;
    items.push({
      id: "frequency",
      label: "Cycle length",
      status: outside ? "outside" : "typical",
      detail: outside
        ? `Most recent cycles were ${short >= long ? "shorter than 24" : "longer than 38"} days (typical range is 24-38).${ageNote}`
        : `Your recent cycles (${Math.min(...intervals)}-${Math.max(...intervals)} days) mostly fall in the typical 24-38 day range.${ageNote}`,
    });
  }

  // Duration: bleeding of 8 days or less
  if (durations.length === 0) {
    items.push({ id: "duration", label: "Period length", status: "unknown", detail: "Log when a period ends to include this." });
  } else {
    const longest = Math.max(...durations);
    items.push({
      id: "duration",
      label: "Period length",
      status: longest > 8 ? "outside" : "typical",
      detail:
        longest > 8
          ? `A recent period lasted ${longest} days; bleeding beyond 8 days is considered prolonged.`
          : `Recent periods lasted up to ${longest} days, within the typical 8 days or less.`,
    });
  }

  // Regularity: shortest-to-longest spread, threshold depends on age
  if (intervals.length < 3) {
    items.push({
      id: "regularity",
      label: "Regularity",
      status: "unknown",
      detail: `Needs ${3 - intervals.length} more cycle${intervals.length === 2 ? "" : "s"} in the last 6 months.`,
    });
  } else {
    const spread = Math.max(...intervals) - Math.min(...intervals);
    const limit = opts.age != null && opts.age >= 26 && opts.age <= 41 ? 7 : 9;
    items.push({
      id: "regularity",
      label: "Regularity",
      status: spread > limit ? "outside" : "typical",
      detail:
        spread > limit
          ? `Your shortest and longest recent cycles differ by ${spread} days; more than ${limit} counts as irregular${opts.age == null ? " (add your date of birth in settings for an age-specific range)" : ""}.${ageNote}`
          : `Your shortest and longest recent cycles differ by ${spread} days (typical is ${limit} or less).${ageNote}`,
    });
  }

  // Gap: no period logged in 90+ days
  const sinceLast = days(sorted[sorted.length - 1].mStart, opts.today);
  if (sinceLast >= GAP_DAYS) {
    items.push({
      id: "gap",
      label: "Time since last period",
      status: "outside",
      detail: `No period logged for ${sinceLast} days. If you've had one, log it; if not, 90+ days without bleeding is worth raising with a clinician.`,
    });
  }

  return { applicable: true, reason: null, items, worthMentioning: items.some((i) => i.status === "outside") };
}
