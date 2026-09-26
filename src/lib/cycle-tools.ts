import { db } from "@/lib/db";
import { cycles, predictionParams, users } from "@/lib/db/schema";
import type { PerimenoStage } from "@/lib/prediction/engine";
import {
  CYCLE_SCALE,
  INTERVAL_LEVEL,
  describeForecast,
  forecast,
  predictMetric,
  resolveForecastPrior,
  usableMask,
  type Forecast,
} from "@/lib/prediction/forecast";
import { and, asc, eq } from "drizzle-orm";
import { ageOn, cycleCheck } from "@/lib/prediction/cycle-check";
import { findCloseStart, missedLogSuggestion, type MissedLogSuggestion } from "@/lib/prediction/log-nudges";

const DAY_MS = 86_400_000;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Longest bleed we accept as one logged period. */
export const MAX_PERIOD_DAYS = 15;
const MONTHS: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
  may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7,
  september: 8, sep: 8, sept: 8, october: 9, oct: 9, november: 10, nov: 10,
  december: 11, dec: 11,
};

export type CycleNotes = Record<string, string[]>;

export type CycleSummary = {
  id: string;
  mStart: string;
  mEnd: string | null;
  ovulationDate: string | null;
  cycleLength: number | null;
  periodLength: number | null;
  isAnomaly: boolean | null;
  notes: CycleNotes;
};

type CycleRow = {
  id: string;
  mStart: string; // YYYY-MM-DD (pgDate custom type ensures strings)
  mEnd: string | null;
  ovulationDate: string | null;
  cycleLength: number | null;
  periodLength: number | null;
  follicularLength: number | null;
  lutealLength: number | null;
  isAnomaly: boolean | null;
  notes: unknown;
};

type ParsedDate = {
  isoDate: string | null;
  reason?: string;
};

// ─── Dates ───────────────────────────────────────────────────────
const toUtcDate = (isoDate: string) => new Date(`${isoDate}T12:00:00.000Z`);

const formatIsoDate = (year: number, monthIndex: number, day: number) =>
  `${String(year).padStart(4, "0")}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export function sanitizeTimeZone(
  timeZone: string | null | undefined,
  fallback = "UTC",
): string {
  const candidate = typeof timeZone === "string" ? timeZone.trim() : "";
  const resolved = candidate.length > 0 ? candidate : fallback;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: resolved }).format(new Date());
    return resolved;
  } catch {
    return fallback;
  }
}

export async function resolveUserTimeZone(
  userId: string,
  fallback = "UTC",
): Promise<string> {
  const rows = await db
    .select({ timeZone: users.timezone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return sanitizeTimeZone(rows[0]?.timeZone, fallback);
}

function getDatePartsInTimeZone(reference: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(reference);
  const get = (type: string, fallback: number) =>
    Number(parts.find((part) => part.type === type)?.value ?? fallback);
  return {
    year: get("year", reference.getUTCFullYear()),
    month: get("month", reference.getUTCMonth() + 1),
    day: get("day", reference.getUTCDate()),
  };
}

export function getCurrentIsoDate(
  timeZone: string,
  reference: Date = new Date(),
): string {
  const parts = getDatePartsInTimeZone(reference, sanitizeTimeZone(timeZone));
  return formatIsoDate(parts.year, parts.month - 1, parts.day);
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const date = toUtcDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function diffInDays(startIso: string, endIso: string): number {
  return Math.round(
    (toUtcDate(endIso).getTime() - toUtcDate(startIso).getTime()) / DAY_MS,
  );
}

function isValidCalendarDate(year: number, monthIndex: number, day: number) {
  const date = new Date(Date.UTC(year, monthIndex, day, 12, 0, 0));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === monthIndex &&
    date.getUTCDate() === day
  );
}

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return isValidCalendarDate(year, month - 1, day);
}

/**
 * Resolve a user-supplied date to YYYY-MM-DD in the user's timezone.
 *
 * Deliberately conservative: numeric dates where day and month could be
 * swapped (e.g. 05/09) are reported as ambiguous instead of guessed, and a
 * month-day without a year that would land in the future is read as last
 * year (people log past periods, not future ones).
 */
export function normalizeDateInput(
  input: string | null | undefined,
  timeZone: string,
  reference: Date = new Date(),
): ParsedDate {
  if (typeof input !== "string" || input.trim().length === 0) {
    return { isoDate: null, reason: "missing-date" };
  }

  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  const resolvedTimeZone = sanitizeTimeZone(timeZone);
  const today = getCurrentIsoDate(resolvedTimeZone, reference);
  const currentYear = Number(today.slice(0, 4));

  if (ISO_DATE_RE.test(trimmed)) {
    const [y, m, d] = trimmed.split("-").map(Number);
    return isValidCalendarDate(y, m - 1, d)
      ? { isoDate: trimmed }
      : { isoDate: null, reason: "unparseable-date" };
  }

  if (lower === "today" || lower === "now") return { isoDate: today };
  if (lower === "yesterday") return { isoDate: addDaysToIsoDate(today, -1) };
  if (lower === "day before yesterday") return { isoDate: addDaysToIsoDate(today, -2) };

  const agoMatch = lower.match(/^(\d{1,3}) days? ago$/);
  if (agoMatch) return { isoDate: addDaysToIsoDate(today, -Number(agoMatch[1])) };

  const monthMatch =
    trimmed.match(/^(?<month>[A-Za-z]+)\.?\s+(?<day>\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(?<year>\d{4}))?$/) ??
    trimmed.match(/^(?<day>\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(?<month>[A-Za-z]+)\.?(?:,?\s*(?<year>\d{4}))?$/);
  if (monthMatch?.groups) {
    const monthIndex = MONTHS[monthMatch.groups.month.toLowerCase()];
    const day = Number(monthMatch.groups.day);
    const explicitYear = monthMatch.groups.year;
    let year = Number(explicitYear ?? currentYear);
    if (Number.isInteger(monthIndex) && isValidCalendarDate(year, monthIndex, day)) {
      if (!explicitYear && formatIsoDate(year, monthIndex, day) > today) year -= 1;
      if (isValidCalendarDate(year, monthIndex, day)) {
        return { isoDate: formatIsoDate(year, monthIndex, day) };
      }
    }
  }

  const slashMatch = trimmed.match(
    /^(?<a>\d{1,2})[/.-](?<b>\d{1,2})(?:[/.-](?<year>\d{2}|\d{4}))?$/,
  );
  if (slashMatch?.groups) {
    const a = Number(slashMatch.groups.a);
    const b = Number(slashMatch.groups.b);
    if (a <= 12 && b <= 12 && a !== b) {
      return { isoDate: null, reason: "ambiguous-date" };
    }
    // Whichever part can only be a day is the day.
    const [monthIndex, day] = a > 12 ? [b - 1, a] : [a - 1, b];
    const rawYear = slashMatch.groups.year;
    const year = rawYear
      ? rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear)
      : currentYear;
    if (isValidCalendarDate(year, monthIndex, day)) {
      return { isoDate: formatIsoDate(year, monthIndex, day) };
    }
  }

  return { isoDate: null, reason: "unparseable-date" };
}

const DATE_QUESTIONS: Record<string, string> = {
  "ambiguous-date":
    "just to be sure, is that day/month or month/day? could you tell me the month by name?",
  "future-date": "that date is in the future. which past date did you mean?",
};

function clarify(question: string, extra: Record<string, unknown> = {}) {
  return {
    ok: false as const,
    responseMode: "plain" as const,
    kind: "clarification" as const,
    needsClarification: true,
    question,
    ...extra,
  };
}

/** Parse a date for a log entry; returns the ISO date or a clarification. */
function parseLogDate(input: string | undefined, timeZone: string, what: string) {
  const parsed = normalizeDateInput(input, timeZone);
  if (!parsed.isoDate) {
    return {
      error: clarify(
        DATE_QUESTIONS[parsed.reason ?? ""] ?? `I need a clear ${what} date before I can log that. What date should I use?`,
        { reason: parsed.reason },
      ),
    };
  }
  if (parsed.isoDate > getCurrentIsoDate(timeZone)) {
    return { error: clarify(DATE_QUESTIONS["future-date"], { reason: "future-date", date: parsed.isoDate }) };
  }
  return { isoDate: parsed.isoDate };
}

// ─── Notes ───────────────────────────────────────────────────────
export function normalizeCycleNotes(notes: unknown): CycleNotes {
  if (!notes || typeof notes !== "object" || Array.isArray(notes)) {
    return {};
  }

  const normalized: CycleNotes = {};
  const clean = (items: unknown[]) =>
    items
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

  for (const [dateKey, value] of Object.entries(notes as Record<string, unknown>)) {
    const entries: string[] = [];
    if (Array.isArray(value)) {
      entries.push(...clean(value));
    } else if (typeof value === "string") {
      entries.push(...clean([value]));
    } else if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (Array.isArray(record.entries)) entries.push(...clean(record.entries));
      entries.push(...clean([record.note, record.text]));
      const [symptom] = clean([record.symptom]);
      if (symptom) entries.push(`symptom: ${symptom}`);
      if (Array.isArray(record.symptoms)) {
        const symptoms = clean(record.symptoms);
        if (symptoms.length > 0) entries.push(`symptoms: ${symptoms.join(", ")}`);
      }
    }
    if (entries.length > 0) normalized[dateKey] = Array.from(new Set(entries));
  }

  return normalized;
}

function mergeNoteEntries(notes: unknown, dateKey: string, entries: string[]): CycleNotes {
  const normalized = normalizeCycleNotes(notes);
  const nextEntries = entries.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  if (nextEntries.length === 0) return normalized;
  normalized[dateKey] = Array.from(new Set([...(normalized[dateKey] ?? []), ...nextEntries]));
  return normalized;
}

function summarizeCycle(row: CycleRow): CycleSummary {
  return {
    id: row.id,
    mStart: row.mStart,
    mEnd: row.mEnd,
    ovulationDate: row.ovulationDate,
    cycleLength: row.cycleLength,
    periodLength: row.periodLength,
    isAnomaly: row.isAnomaly,
    notes: normalizeCycleNotes(row.notes),
  };
}

// ─── Profile + reads ─────────────────────────────────────────────
export interface CycleProfile {
  conditions: string[];
  perimenoStage: PerimenoStage | null;
  timeZone: string;
  dateOfBirth: string | null;
}

/** Conditions and stage always come from the DB row, never from callers. */
export async function loadCycleProfile(userId: string, fallbackTimeZone = "UTC"): Promise<CycleProfile> {
  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { conditions: true, perimenoStage: true, timezone: true, dateOfBirth: true },
  });
  const conditions = Array.isArray(row?.conditions) ? (row.conditions as string[]) : [];
  const hasPerimeno = conditions.some((condition) =>
    ["perimenopause", "perimenopause_early", "perimenopause_late"].includes(condition),
  );
  return {
    conditions,
    perimenoStage: hasPerimeno ? ((row?.perimenoStage as PerimenoStage | null) ?? null) : null,
    timeZone: sanitizeTimeZone(row?.timezone, fallbackTimeZone),
    dateOfBirth: row?.dateOfBirth ?? null,
  };
}

async function loadCycles(userId: string): Promise<CycleRow[]> {
  return (await db
    .select()
    .from(cycles)
    .where(eq(cycles.userId, userId))
    .orderBy(asc(cycles.mStart))) as CycleRow[];
}

/** The single forecast used by the dashboard, the chat tools and the system prompt. */
export async function getUserForecast(userId: string, fallbackTimeZone = "UTC") {
  const [profile, rows] = await Promise.all([loadCycleProfile(userId, fallbackTimeZone), loadCycles(userId)]);
  const today = getCurrentIsoDate(profile.timeZone);
  const result = forecast(rows, { conditions: profile.conditions, perimenoStage: profile.perimenoStage, today });
  return { forecast: result, text: describeForecast(result), profile, rows, today };
}

/** Compact, model-facing snapshot. Numbers come from the engine, not the LLM. */
export function forecastForModel(f: Forecast) {
  const text = describeForecast(f);
  return {
    asOf: f.asOf,
    modelVersion: f.modelVersion,
    status: f.status,
    lastPeriodStart: f.lastStart,
    dayOfCycle: f.dayOfCycle != null ? f.dayOfCycle + 1 : null,
    nextPeriod: f.nextStart
      ? { mostLikely: f.nextStart.date, likelyWindow: [f.nextStart.earliest, f.nextStart.latest], windowCoverage: `${INTERVAL_LEVEL * 100}%` }
      : null,
    ifNotStartedYet: f.ifNotStartedYet,
    typicalCycleDays: f.cycleLength ? Math.round(f.cycleLength.mean) : null,
    typicalPeriodDays: Math.round(f.periodLength.mean),
    basis: f.basis,
    observedCycleRange: f.observedRange,
    ovulationEstimate: f.ovulation
      ? { window: [f.ovulation.earliest, f.ovulation.latest], note: "calendar estimate only, not confirmed ovulation" }
      : null,
    ovulationWithheldBecause: f.ovulationWithheld,
    text,
  };
}

// ─── Derived columns ─────────────────────────────────────────────
/**
 * Recompute derived columns, anomaly flags and prediction_params from the
 * user's rows. Called after every cycle write (and on profile changes),
 * never on reads. Anomaly flags use the same usableMask as the forecast, so
 * "Unusual" in the UI means exactly "set aside by the forecast".
 */
export async function refreshCycleAnalytics(userId: string) {
  const [profile, rows] = await Promise.all([loadCycleProfile(userId), loadCycles(userId)]);
  const prior = resolveForecastPrior(profile.conditions, profile.perimenoStage);

  const intervals = rows.slice(1).map((row, i) => diffInDays(rows[i].mStart, row.mStart));
  const usable = usableMask(intervals, prior.gate);

  const updates = rows.flatMap((current, index) => {
    const next = rows[index + 1];
    const derived = {
      cycleLength: index > 0 ? intervals[index - 1] : null,
      periodLength: current.mEnd ? diffInDays(current.mStart, current.mEnd) + 1 : null,
      follicularLength:
        current.mEnd && current.ovulationDate ? diffInDays(current.mEnd, current.ovulationDate) : null,
      lutealLength: current.ovulationDate && next ? diffInDays(current.ovulationDate, next.mStart) : null,
      isAnomaly: index > 0 ? !usable[index - 1] : false,
    };
    const changed = (Object.keys(derived) as (keyof typeof derived)[]).some(
      (k) => current[k] !== derived[k],
    );
    rows[index] = { ...current, ...derived };
    return changed
      ? [db.update(cycles).set(derived).where(and(eq(cycles.id, current.id), eq(cycles.userId, userId)))]
      : [];
  });

  const periods = rows
    .map((r) => r.periodLength)
    .filter((d): d is number => d != null && d > 0 && d <= MAX_PERIOD_DAYS);
  const cycleF = predictMetric(intervals, prior.cycle, prior.gate, INTERVAL_LEVEL, CYCLE_SCALE);
  const periodF = predictMetric(periods, prior.period);
  const upsert = (paramName: string, m: typeof cycleF) =>
    db
      .insert(predictionParams)
      .values({ userId, paramName, smoothedValue: m.mean, variance: m.sd ** 2, sampleCount: m.nUsed, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [predictionParams.userId, predictionParams.paramName],
        set: { smoothedValue: m.mean, variance: m.sd ** 2, sampleCount: m.nUsed, updatedAt: new Date() },
      });

  // One HTTP round trip, one transaction.
  await db.batch([upsert("cycle_length", cycleF), upsert("period_length", periodF), ...updates]);
  return { cycles: rows, profile };
}

// ─── Validated writes (shared by chat tools and /api/cycles) ─────
export interface CycleDraft {
  mStart: string;
  mEnd: string | null;
}

/** Hard validation errors (plain-language), or null when the draft is valid. */
export function validateCycleDraft(draft: CycleDraft, others: CycleDraft[], today: string): string | null {
  if (!isValidIsoDate(draft.mStart)) return "the start date isn't a valid date.";
  if (draft.mStart > today) return "the start date is in the future.";
  if (draft.mEnd) {
    if (!isValidIsoDate(draft.mEnd)) return "the end date isn't a valid date.";
    if (draft.mEnd > today) return "the end date is in the future.";
    if (draft.mEnd < draft.mStart) return "the end date is before the start date.";
    const len = diffInDays(draft.mStart, draft.mEnd) + 1;
    if (len > MAX_PERIOD_DAYS) return `that would be a ${len}-day period, and longer than ${MAX_PERIOD_DAYS} days usually means a date is off.`;
  }
  for (const o of others) {
    if (o.mStart === draft.mStart) return `there's already a period starting on ${o.mStart}.`;
    const lastDay = (c: CycleDraft) => c.mEnd ?? c.mStart;
    if (o.mStart < draft.mStart && lastDay(o) >= draft.mStart) return `it overlaps the period that started on ${o.mStart}.`;
    if (draft.mStart < o.mStart && lastDay(draft) >= o.mStart) return `it overlaps the period that started on ${o.mStart}.`;
  }
  return null;
}

type WriteResult =
  | { ok: true; cycle: CycleSummary; forecast: Forecast; missedLog: MissedLogSuggestion | null }
  | { ok: false; error: string };

async function afterWrite(userId: string, id: string): Promise<WriteResult> {
  const { cycles: rows } = await refreshCycleAnalytics(userId);
  const { forecast: f } = await getUserForecast(userId);
  const index = rows.findIndex((r) => r.id === id);
  if (index < 0) return { ok: false, error: "the log could not be found after saving." };
  const row = rows[index];
  // A long gap the forecast set aside before this start: maybe a period went unlogged.
  const missedLog =
    index > 0 && f.cycleLength ? missedLogSuggestion(rows[index - 1].mStart, row.mStart, f.cycleLength.mean, row.isAnomaly) : null;
  return { ok: true, cycle: summarizeCycle(row), forecast: f, missedLog };
}

/** An existing start within CLOSE_START_DAYS of `iso`: probably the same period, spotting or a corrected date. */
export async function closeStartFor(userId: string, iso: string): Promise<string | null> {
  return findCloseStart(await loadCycles(userId), iso)?.mStart ?? null;
}

export async function createCycle(userId: string, draft: CycleDraft, notes: CycleNotes = {}): Promise<WriteResult> {
  const [profile, rows] = await Promise.all([loadCycleProfile(userId), loadCycles(userId)]);
  const error = validateCycleDraft(draft, rows, getCurrentIsoDate(profile.timeZone));
  if (error) return { ok: false, error };
  const [inserted] = await db.insert(cycles).values({ userId, mStart: draft.mStart, mEnd: draft.mEnd, notes }).returning({ id: cycles.id });
  return afterWrite(userId, inserted.id);
}

export async function updateCycle(userId: string, id: string, patch: Partial<CycleDraft>): Promise<WriteResult> {
  const [profile, rows] = await Promise.all([loadCycleProfile(userId), loadCycles(userId)]);
  const current = rows.find((r) => r.id === id);
  if (!current) return { ok: false, error: "that log wasn't found." };
  const draft = { mStart: patch.mStart ?? current.mStart, mEnd: patch.mEnd === undefined ? current.mEnd : patch.mEnd };
  const error = validateCycleDraft(draft, rows.filter((r) => r.id !== id), getCurrentIsoDate(profile.timeZone));
  if (error) return { ok: false, error };
  // An ovulation date outside the edited cycle's span would become meaningless.
  // A cycle ends at the next logged start, not at the last bleeding day.
  const nextStart = rows
    .filter((row) => row.id !== id && row.mStart > draft.mStart)
    .map((row) => row.mStart)
    .sort()[0];
  const ovulationDate =
    current.ovulationDate &&
    current.ovulationDate > draft.mStart &&
    (!nextStart || current.ovulationDate < nextStart)
      ? current.ovulationDate
      : null;
  await db.update(cycles).set({ ...draft, ovulationDate }).where(and(eq(cycles.id, id), eq(cycles.userId, userId)));
  return afterWrite(userId, id);
}

export async function deleteCycle(userId: string, id: string): Promise<{ ok: boolean; error?: string }> {
  const deleted = await db
    .delete(cycles)
    .where(and(eq(cycles.id, id), eq(cycles.userId, userId)))
    .returning({ id: cycles.id });
  if (deleted.length === 0) return { ok: false, error: "that log wasn't found." };
  await refreshCycleAnalytics(userId);
  return { ok: true };
}

/** The cycle a given date belongs to: the latest start on or before it. */
function cycleContaining(rows: CycleRow[], isoDate: string) {
  const index = rows.findLastIndex((r) => r.mStart <= isoDate);
  return index >= 0 ? { row: rows[index], next: rows[index + 1] ?? null } : null;
}

function confirmation(message: string, result: WriteResult) {
  if ("error" in result) return clarify(`I couldn't save that: ${result.error}`, { reason: "invalid" });
  return {
    ok: true as const,
    responseMode: "plain" as const,
    kind: "confirmation" as const,
    message,
    cycle: result.cycle,
    forecast: forecastForModel(result.forecast),
  };
}

// ─── Chat tool entries ───────────────────────────────────────────
export async function logPeriodStartEntry(args: {
  userId: string;
  date: string;
  timeZone: string;
  notes?: string;
  confirmedSeparatePeriod?: boolean;
}) {
  const parsed = parseLogDate(args.date, args.timeZone, "start");
  if (parsed.error) return parsed.error;
  const iso = parsed.isoDate;
  const rows = await loadCycles(args.userId);
  const noteText = args.notes?.trim() ?? "";

  const existing = rows.find((row) => row.mStart === iso);
  if (existing) {
    // Idempotent: a retried or repeated log of the same start is not a new cycle.
    if (noteText) {
      await db
        .update(cycles)
        .set({ notes: mergeNoteEntries(existing.notes, iso, [noteText]) })
        .where(and(eq(cycles.id, existing.id), eq(cycles.userId, args.userId)));
    }
    const { forecast: f } = await getUserForecast(args.userId);
    return {
      ok: true as const,
      responseMode: "plain" as const,
      kind: "confirmation" as const,
      message: noteText ? `your period start on ${iso} was already logged, so I added the note.` : `your period start on ${iso} was already logged.`,
      cycle: summarizeCycle(existing),
      forecast: forecastForModel(f),
    };
  }

  const close = findCloseStart(rows, iso);
  if (close && !args.confirmedSeparatePeriod) {
    return clarify(
      `you already have a period logged starting ${close.mStart} (${Math.abs(diffInDays(close.mStart, iso))} days apart). is this the same period with a corrected date, or a separate new period?`,
      { reason: "close-to-existing", existingStart: close.mStart, requestedStart: iso },
    );
  }

  const notes = noteText ? mergeNoteEntries({}, iso, [noteText]) : {};
  const result = await createCycle(args.userId, { mStart: iso, mEnd: null }, notes);
  const logged = noteText ? `logged your period start for ${iso} and saved the note.` : `logged your period start for ${iso}.`;
  const missed = "missedLog" in result ? result.missedLog : null;
  if (!missed) return confirmation(logged, result);
  return {
    ...confirmation(
      `${logged} it's been ${missed.gapDays} days since the period before it, longer than usual for you. ` +
        `if you had a period in between that didn't get logged, tell me roughly when (maybe around ${missed.suggestedStart}) and i'll add it, so your forecast stays accurate.`,
      result,
    ),
    missedLog: missed,
  };
}

export async function logPeriodEndEntry(args: {
  userId: string;
  date: string;
  timeZone: string;
  notes?: string;
}) {
  const parsed = parseLogDate(args.date, args.timeZone, "end");
  if (parsed.error) return parsed.error;
  const iso = parsed.isoDate;
  const rows = await loadCycles(args.userId);
  const target = cycleContaining(rows, iso)?.row;
  if (!target) {
    return clarify("I couldn't find a period start on or before that date. When did this period start?", { date: iso });
  }
  const length = diffInDays(target.mStart, iso) + 1;
  if (length > MAX_PERIOD_DAYS) {
    return clarify(
      `the closest period start I have is ${target.mStart}, which would make this a ${length}-day period. when did this period start?`,
      { reason: "too-long", date: iso, closestStart: target.mStart },
    );
  }
  const noteText = args.notes?.trim() ?? "";
  if (noteText) {
    await db
      .update(cycles)
      .set({ notes: mergeNoteEntries(target.notes, iso, [noteText]) })
      .where(and(eq(cycles.id, target.id), eq(cycles.userId, args.userId)));
  }
  return confirmation(
    `logged your period end for ${iso} (a ${length}-day period starting ${target.mStart}).`,
    await updateCycle(args.userId, target.id, { mEnd: iso }),
  );
}

export async function logOvulationEntry(args: {
  userId: string;
  date: string;
  timeZone: string;
  notes?: string;
}) {
  const parsed = parseLogDate(args.date, args.timeZone, "ovulation");
  if (parsed.error) return parsed.error;
  const iso = parsed.isoDate;
  const rows = await loadCycles(args.userId);
  const found = cycleContaining(rows, iso);
  if (!found || found.row.mStart === iso) {
    return clarify(
      "I need the period that came before this ovulation. When did that period start?",
      { date: iso },
    );
  }
  const target = found.row;
  const noteText = args.notes?.trim() ?? "";
  await db
    .update(cycles)
    .set({
      ovulationDate: iso,
      notes: noteText ? mergeNoteEntries(target.notes, iso, [noteText]) : normalizeCycleNotes(target.notes),
    })
    .where(and(eq(cycles.id, target.id), eq(cycles.userId, args.userId)));
  return confirmation(
    `logged ovulation for ${iso} in the cycle that started ${target.mStart}.`,
    await afterWrite(args.userId, target.id),
  );
}

export async function addCycleNoteEntry(args: {
  userId: string;
  timeZone: string;
  note: string;
  date?: string;
  symptoms?: string[];
}) {
  const noteText = args.note.trim();
  const symptoms = (args.symptoms ?? []).map((item) => item.trim()).filter((item) => item.length > 0);
  if (noteText.length === 0 && symptoms.length === 0) {
    return clarify("What note or symptom should I add?");
  }

  const parsed = parseLogDate(args.date ?? getCurrentIsoDate(args.timeZone), args.timeZone, "note");
  if (parsed.error) return parsed.error;
  const iso = parsed.isoDate;
  const rows = await loadCycles(args.userId);
  const target = cycleContaining(rows, iso)?.row;
  if (!target) {
    return clarify(
      rows.length === 0
        ? "I need at least one logged period to attach that note to. When did your most recent period start?"
        : `that date is before your first logged period (${rows[0].mStart}). When did the period before it start?`,
    );
  }

  const entries = [noteText || null, symptoms.length > 0 ? `symptoms: ${symptoms.join(", ")}` : null].filter(
    (item): item is string => typeof item === "string",
  );
  await db
    .update(cycles)
    .set({ notes: mergeNoteEntries(target.notes, iso, entries) })
    .where(and(eq(cycles.id, target.id), eq(cycles.userId, args.userId)));
  return {
    ok: true as const,
    responseMode: "plain" as const,
    kind: "confirmation" as const,
    message: `added your note for ${iso} to the cycle that started on ${target.mStart}.`,
  };
}

export async function editPeriodLogEntry(args: {
  userId: string;
  timeZone: string;
  periodStart: string;
  newStart?: string;
  newEnd?: string;
  clearEnd?: boolean;
}) {
  const key = parseLogDate(args.periodStart, args.timeZone, "period start");
  if (key.error) return key.error;
  const rows = await loadCycles(args.userId);
  const target = rows.find((r) => r.mStart === key.isoDate);
  if (!target) {
    return clarify(
      `I don't have a period starting on ${key.isoDate}. ${rows.length ? `Your logged starts are: ${rows.slice(-6).map((r) => r.mStart).join(", ")}.` : ""} Which one should I change?`,
    );
  }
  const patch: Partial<CycleDraft> = {};
  if (args.newStart) {
    const s = parseLogDate(args.newStart, args.timeZone, "new start");
    if (s.error) return s.error;
    patch.mStart = s.isoDate;
  }
  if (args.clearEnd) patch.mEnd = null;
  else if (args.newEnd) {
    const e = parseLogDate(args.newEnd, args.timeZone, "new end");
    if (e.error) return e.error;
    patch.mEnd = e.isoDate;
  }
  if (Object.keys(patch).length === 0) return clarify("What should I change: the start date or the end date?");
  return confirmation(`updated the period that started ${target.mStart}.`, await updateCycle(args.userId, target.id, patch));
}

export async function deletePeriodLogEntry(args: {
  userId: string;
  timeZone: string;
  periodStart: string;
  userConfirmed: boolean;
}) {
  const key = parseLogDate(args.periodStart, args.timeZone, "period start");
  if (key.error) return key.error;
  const rows = await loadCycles(args.userId);
  const target = rows.find((r) => r.mStart === key.isoDate);
  if (!target) return clarify(`I don't have a period starting on ${key.isoDate}. Which one should I remove?`);
  if (!args.userConfirmed) {
    return clarify(`just checking: remove the period that started ${target.mStart}, including its notes? this can't be undone.`, {
      reason: "confirm-delete",
    });
  }
  const result = await deleteCycle(args.userId, target.id);
  if (!result.ok) return clarify(`I couldn't remove that: ${result.error}`);
  const { forecast: f } = await getUserForecast(args.userId);
  return {
    ok: true as const,
    responseMode: "plain" as const,
    kind: "confirmation" as const,
    message: `removed the period that started ${target.mStart}.`,
    forecast: forecastForModel(f),
  };
}

export async function fetchRecentCyclesEntry(args: { userId: string; limit: number }) {
  const recentCycles = (await loadCycles(args.userId)).slice(-args.limit).reverse().map(summarizeCycle);

  if (recentCycles.length === 0) {
    return {
      responseMode: "plain" as const,
      kind: "empty" as const,
      message: "I do not have any cycle logs yet.",
      cycles: recentCycles,
    };
  }

  return {
    responseMode: "openui" as const,
    kind: "table" as const,
    title: `last ${recentCycles.length} cycles`,
    note: "cycleLength on a row is the gap from the previous start to this start. isAnomaly = set aside by the forecast as a possible missed or extra log.",
    cycles: recentCycles,
  };
}

export async function getCycleInsightsEntry(args: {
  userId: string;
  timeZone: string;
  mode: "stats" | "prediction";
}) {
  const { forecast: f, rows, profile, today } = await getUserForecast(args.userId, args.timeZone);
  const snapshot = forecastForModel(f);
  const patternCheck = cycleCheck(rows, { today, conditions: profile.conditions, age: ageOn(profile.dateOfBirth, today) });
  const recentCycles = rows.slice(-3).reverse().map(summarizeCycle);

  if (rows.length === 0) {
    return {
      responseMode: "plain" as const,
      kind: args.mode,
      message: "I do not have any cycle data yet. Log a period start first and I can build predictions and stats.",
      forecast: snapshot,
      cycleCount: 0,
    };
  }

  return {
    responseMode: "openui" as const,
    kind: args.mode,
    title: args.mode === "prediction" ? "next period forecast" : "cycle stats",
    cycleCount: rows.length,
    recentCycles,
    forecast: snapshot,
    patternCheck,
  };
}
