/**
 * Input-time nudges for logging artifacts. A missed period merges two cycles
 * into one long gap; a second start a few days after a real one splits a
 * cycle. No estimator can repair a forecast target that is itself an artifact,
 * but a question at logging time can: in simulation, users confirming half of
 * their missed periods cut the forecast's interval score by 17%, and half of
 * the double logs by 7% (autoresearch R4-1).
 */
import { addDays, diffDays } from "./forecast";

/** Starts closer than this are probably the same period, spotting, or a corrected date. */
export const CLOSE_START_DAYS = 15;

/** An existing start within CLOSE_START_DAYS of `iso` (not on the same day). */
export function findCloseStart<T extends { mStart: string }>(rows: T[], iso: string): T | undefined {
  return rows.find((r) => r.mStart !== iso && Math.abs(diffDays(r.mStart, iso)) < CLOSE_START_DAYS);
}

export interface MissedLogSuggestion {
  /** Days between the previous logged start and this one. */
  gapDays: number;
  /** How many periods probably went unlogged in the gap. */
  missed: number;
  /** Most likely start of the first unlogged period. */
  suggestedStart: string;
  /** Date-picker bounds that keep a backfilled start clear of both neighbours. */
  earliest: string;
  latest: string;
}

/**
 * For a gap the forecast set aside as too long, estimate when the unlogged
 * period started from the person's typical cycle. Null when the gap fits
 * their pattern (not set aside) or is not clearly longer than usual.
 */
export function missedLogSuggestion(
  prevStart: string,
  start: string,
  typical: number,
  setAside: boolean,
): MissedLogSuggestion | null {
  const gapDays = diffDays(prevStart, start);
  if (!setAside || !(typical > 0) || gapDays < 1.5 * typical) return null;
  const k = Math.max(2, Math.round(gapDays / typical));
  const earliest = addDays(prevStart, CLOSE_START_DAYS);
  const latest = addDays(start, -CLOSE_START_DAYS);
  if (earliest > latest) return null;
  const guess = addDays(prevStart, Math.round(gapDays / k));
  const suggestedStart = guess < earliest ? earliest : guess > latest ? latest : guess;
  return { gapDays, missed: k - 1, suggestedStart, earliest, latest };
}
