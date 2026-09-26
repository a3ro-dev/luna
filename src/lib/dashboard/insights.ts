/**
 * Presentation helpers for the dashboards. Everything here is derived from the
 * same cycle rows and forecast every plan already has; nothing is gated.
 */

export interface NoteRow {
  mStart: string;
  notes: Record<string, string[]>;
}

export interface NoteEntry {
  /** The day the note is about (ISO). */
  date: string;
  text: string;
  /** Start of the cycle the note belongs to. */
  cycleStart: string;
  /** 1-based day of that cycle. */
  cycleDay: number;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
const diff = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / DAY_MS);

/** Tidy a stored note for display: drop the "symptoms:" prefix chat adds. */
const tidy = (text: string) => text.replace(/^symptoms?:\s*/i, "").trim();

export function allNotes(rows: NoteRow[]): NoteEntry[] {
  const sorted = [...rows].sort((a, b) => a.mStart.localeCompare(b.mStart));
  return sorted.flatMap((row) =>
    Object.entries(row.notes).flatMap(([date, texts]) =>
      ISO.test(date) && date >= row.mStart
        ? texts.map((t) => ({ date, text: tidy(t), cycleStart: row.mStart, cycleDay: diff(row.mStart, date) + 1 }))
        : [],
    ),
  );
}

/** Notes in the current (latest) cycle up to today, newest first. */
export function currentCycleNotes(rows: NoteRow[], today: string): NoteEntry[] {
  const latest = [...rows].filter((r) => r.mStart <= today).sort((a, b) => b.mStart.localeCompare(a.mStart))[0];
  if (!latest) return [];
  return allNotes([latest])
    .filter((n) => n.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * "Circling back": what you noted around this same day in earlier cycles.
 * Most recent cycles first; at most `max` notes.
 */
export function circleBack(rows: NoteRow[], cycleDay: number | null, window = 2, max = 3): NoteEntry[] {
  if (cycleDay == null || rows.length < 2) return [];
  const latestStart = rows.reduce((m, r) => (r.mStart > m ? r.mStart : m), "");
  return allNotes(rows)
    .filter((n) => n.cycleStart !== latestStart && Math.abs(n.cycleDay - cycleDay) <= window)
    .sort((a, b) => b.cycleStart.localeCompare(a.cycleStart) || Math.abs(a.cycleDay - cycleDay) - Math.abs(b.cycleDay - cycleDay))
    .slice(0, max);
}

export interface CyclePoint {
  /** Start of the cycle this length ends at (the later start). */
  start: string;
  length: number;
  setAside: boolean;
}

/** Recent cycle lengths (start to start), oldest first, for a trend line. */
export function cycleLengthSeries(
  rows: { mStart: string; cycleLength: number | null; isAnomaly: boolean | null }[],
  max = 12,
): CyclePoint[] {
  return [...rows]
    .sort((a, b) => a.mStart.localeCompare(b.mStart))
    .filter((r) => r.cycleLength != null && r.cycleLength > 0)
    .map((r) => ({ start: r.mStart, length: r.cycleLength!, setAside: Boolean(r.isAnomaly) }))
    .slice(-max);
}

export type PhaseKey = "period" | "follicular" | "ovulation" | "luteal" | "late";

export interface PhaseInfo {
  key: PhaseKey;
  label: string;
  /** False only for a logged period; every other phase is a calendar estimate. */
  estimated: boolean;
}

/**
 * Where today probably sits in the cycle. Returns null rather than guess when
 * there is no ovulation estimate (e.g. withheld for PCOS or hormonal
 * contraception), because follicular/luteal would then be meaningless.
 */
export function estimatedPhase(f: {
  status: string;
  ovulation: { earliest: string; latest: string } | null;
  today: string;
}): PhaseInfo | null {
  if (f.status === "on-period") return { key: "period", label: "Period", estimated: false };
  if (f.status === "late" || f.status === "long-gap") return { key: "late", label: "Later than usual", estimated: true };
  if (f.status === "no-data" || !f.ovulation) return null;
  if (f.today < f.ovulation.earliest) return { key: "follicular", label: "Follicular phase", estimated: true };
  if (f.today <= f.ovulation.latest) return { key: "ovulation", label: "Ovulation window", estimated: true };
  return { key: "luteal", label: "Luteal phase", estimated: true };
}
