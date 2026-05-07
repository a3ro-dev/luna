import { db } from "@/lib/db";
import { cycles, predictionParams, users } from "@/lib/db/schema";
import {
  blendWithPrior,
  predictNextCycle,
  exponentialSmooth,
  resolveEffectivePrior,
  skipGate,
  computeAdaptiveAlpha,
  type PerimenoStage,
} from "@/lib/prediction/engine";
import { asc, eq, and } from "drizzle-orm";

const DAY_MS = 86_400_000;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const PARAM_TO_METRIC = {
  cycle_length: "cycleLength",
  period_length: "periodLength",
  follicular: "follicularLength",
  luteal: "lutealLength",
} as const;

export type PredictionParamName = keyof typeof PARAM_TO_METRIC;

export type CycleNotes = Record<string, string[]>;

export type CycleSummary = {
  id: string;
  mStart: string;
  mEnd: string | null;
  ovulationDate: string | null;
  cycleLength: number | null;
  periodLength: number | null;
  follicularLength: number | null;
  lutealLength: number | null;
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

type PredictionParamRow = {
  paramName: PredictionParamName;
  smoothedValue: number;
  variance: number;
  sampleCount: number;
};

type ParsedDate = {
  isoDate: string | null;
  reason?: string;
};

type AnalyticsResult = {
  cycles: CycleRow[];
  cycleLengths: number[];
  periodLengths: number[];
  follicularLengths: number[];
  lutealLengths: number[];
};

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

  const year = Number(
    parts.find((part) => part.type === "year")?.value ??
      reference.getUTCFullYear(),
  );
  const month = Number(
    parts.find((part) => part.type === "month")?.value ??
      reference.getUTCMonth() + 1,
  );
  const day = Number(
    parts.find((part) => part.type === "day")?.value ?? reference.getUTCDate(),
  );

  return { year, month, day };
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

  if (ISO_DATE_RE.test(trimmed)) {
    return { isoDate: trimmed };
  }

  if (lower === "today" || lower === "now") {
    return { isoDate: getCurrentIsoDate(resolvedTimeZone, reference) };
  }

  if (lower === "yesterday") {
    return {
      isoDate: addDaysToIsoDate(
        getCurrentIsoDate(resolvedTimeZone, reference),
        -1,
      ),
    };
  }

  const monthMatch = trimmed.match(
    /^(?<month>[A-Za-z]+)\s+(?<day>\d{1,2})(?:st|nd|rd|th)?(?:,\s*(?<year>\d{4}))?$/,
  );
  if (monthMatch?.groups) {
    const monthIndex = MONTHS[monthMatch.groups.month.toLowerCase()];
    const day = Number(monthMatch.groups.day);
    const year = Number(
      monthMatch.groups.year ??
        getDatePartsInTimeZone(reference, resolvedTimeZone).year,
    );

    if (
      Number.isInteger(monthIndex) &&
      isValidCalendarDate(year, monthIndex, day)
    ) {
      return { isoDate: formatIsoDate(year, monthIndex, day) };
    }
  }

  const slashMatch = trimmed.match(
    /^(?<month>\d{1,2})\/(?<day>\d{1,2})(?:\/(?<year>\d{2,4}))?$/,
  );
  if (slashMatch?.groups) {
    const monthIndex = Number(slashMatch.groups.month) - 1;
    const day = Number(slashMatch.groups.day);
    const rawYear = slashMatch.groups.year;
    const year = rawYear
      ? rawYear.length === 2
        ? Number(`20${rawYear}`)
        : Number(rawYear)
      : getDatePartsInTimeZone(reference, resolvedTimeZone).year;

    if (
      Number.isInteger(monthIndex) &&
      isValidCalendarDate(year, monthIndex, day)
    ) {
      return { isoDate: formatIsoDate(year, monthIndex, day) };
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const parts = getDatePartsInTimeZone(parsed, resolvedTimeZone);
    return { isoDate: formatIsoDate(parts.year, parts.month - 1, parts.day) };
  }

  return { isoDate: null, reason: "unparseable-date" };
}

export function normalizeCycleNotes(notes: unknown): CycleNotes {
  if (!notes || typeof notes !== "object" || Array.isArray(notes)) {
    return {};
  }

  const normalized: CycleNotes = {};

  for (const [dateKey, value] of Object.entries(
    notes as Record<string, unknown>,
  )) {
    if (Array.isArray(value)) {
      const entries = value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      if (entries.length > 0) {
        normalized[dateKey] = Array.from(new Set(entries));
      }
      continue;
    }

    if (typeof value === "string") {
      const entry = value.trim();
      if (entry.length > 0) {
        normalized[dateKey] = [entry];
      }
      continue;
    }

    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      const entries: string[] = [];

      if (Array.isArray(record.entries)) {
        entries.push(
          ...record.entries
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter((item) => item.length > 0),
        );
      }

      if (typeof record.note === "string" && record.note.trim().length > 0) {
        entries.push(record.note.trim());
      }

      if (typeof record.text === "string" && record.text.trim().length > 0) {
        entries.push(record.text.trim());
      }

      if (
        typeof record.symptom === "string" &&
        record.symptom.trim().length > 0
      ) {
        entries.push(`symptom: ${record.symptom.trim()}`);
      }

      if (Array.isArray(record.symptoms)) {
        const symptoms = record.symptoms
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter((item) => item.length > 0);

        if (symptoms.length > 0) {
          entries.push(`symptoms: ${symptoms.join(", ")}`);
        }
      }

      if (entries.length > 0) {
        normalized[dateKey] = Array.from(new Set(entries));
      }
    }
  }

  return normalized;
}

function mergeNoteEntries(
  notes: unknown,
  dateKey: string,
  entries: string[],
): CycleNotes {
  const normalized = normalizeCycleNotes(notes);
  const nextEntries = entries
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (nextEntries.length === 0) return normalized;

  const existing = normalized[dateKey] ?? [];
  normalized[dateKey] = Array.from(new Set([...existing, ...nextEntries]));
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
    follicularLength: row.follicularLength,
    lutealLength: row.lutealLength,
    isAnomaly: row.isAnomaly,
    notes: normalizeCycleNotes(row.notes),
  };
}

async function refreshPredictionParam(
  userId: string,
  paramName: PredictionParamName,
  observations: number[],
  conditions: string[] = [],
) {
  if (observations.length === 0) return;

  const metricName = PARAM_TO_METRIC[paramName];
  const { smoothed, variance } = exponentialSmooth(observations, conditions);
  const blended = blendWithPrior(
    smoothed,
    variance,
    observations.length,
    metricName,
    conditions,
  );

  const existing = await db
    .select()
    .from(predictionParams)
    .where(
      and(
        eq(predictionParams.userId, userId),
        eq(predictionParams.paramName, paramName),
      ),
    )
    .limit(1);

  const nextValues = {
    userId,
    paramName,
    smoothedValue: blended.mean,
    variance: blended.variance,
    sampleCount: observations.length,
    updatedAt: new Date(),
  };

  if (existing.length > 0) {
    await db
      .update(predictionParams)
      .set(nextValues)
      .where(eq(predictionParams.id, existing[0].id));
  } else {
    await db.insert(predictionParams).values(nextValues);
  }
}

export async function refreshCycleAnalytics(
  userId: string,
  conditions: string[] = [],
  perimenoStage?: PerimenoStage,
): Promise<AnalyticsResult> {
  const rows = (await db
    .select()
    .from(cycles)
    .where(eq(cycles.userId, userId))
    .orderBy(asc(cycles.mStart))) as CycleRow[];

  if (rows.length === 0) {
    return {
      cycles: [],
      cycleLengths: [],
      periodLengths: [],
      follicularLengths: [],
      lutealLengths: [],
    };
  }

  const cycleLengths: number[] = [];
  const periodLengths: number[] = [];
  const follicularLengths: number[] = [];
  const lutealLengths: number[] = [];

  const updates: Array<{
    id: string;
    changes: {
      cycleLength?: number | null;
      periodLength?: number | null;
      follicularLength?: number | null;
      lutealLength?: number | null;
      isAnomaly?: boolean;
    };
  }> = [];

  for (let index = 0; index < rows.length; index += 1) {
    const current = rows[index];
    const previous = rows[index - 1];
    const next = rows[index + 1];

    const nextCycleLength = previous
      ? diffInDays(previous.mStart, current.mStart)
      : null;
    const nextPeriodLength = current.mEnd
      ? diffInDays(current.mStart, current.mEnd) + 1
      : null;
    const nextFollicularLength =
      current.mEnd && current.ovulationDate
        ? diffInDays(current.mEnd, current.ovulationDate)
        : null;
    const nextLutealLength =
      current.ovulationDate && next
        ? diffInDays(current.ovulationDate, next.mStart)
        : null;

    // Anomaly detection is deferred to the second pass below, which uses
    // the prediction engine's skipGate() as the single source of truth.
    // The first pass computes derived columns only.
    rows[index] = {
      ...current,
      cycleLength: nextCycleLength,
      periodLength: nextPeriodLength,
      follicularLength: nextFollicularLength,
      lutealLength: nextLutealLength,
      isAnomaly: false, // will be set by skipGate() in second pass
    };

    if (typeof nextCycleLength === "number") cycleLengths.push(nextCycleLength);
    if (typeof nextPeriodLength === "number")
      periodLengths.push(nextPeriodLength);
    if (typeof nextFollicularLength === "number")
      follicularLengths.push(nextFollicularLength);
    if (typeof nextLutealLength === "number")
      lutealLengths.push(nextLutealLength);

    const changes: {
      cycleLength?: number | null;
      periodLength?: number | null;
      follicularLength?: number | null;
      lutealLength?: number | null;
      isAnomaly?: boolean;
    } = {};

    if (current.cycleLength !== nextCycleLength)
      changes.cycleLength = nextCycleLength;
    if (current.periodLength !== nextPeriodLength)
      changes.periodLength = nextPeriodLength;
    if (current.follicularLength !== nextFollicularLength)
      changes.follicularLength = nextFollicularLength;
    if (current.lutealLength !== nextLutealLength)
      changes.lutealLength = nextLutealLength;
    // Note: isAnomaly change is handled by the second pass below.

    if (Object.keys(changes).length > 0) {
      updates.push({ id: current.id, changes });
    }
  }

  // Second pass: use the prediction engine's skipGate() as the SOLE anomaly
  // detector. skipGate() is the single source of truth for what counts as
  // anomalous — it uses running variance from exponential smoothing, which
  // may flag different observations than a simple sample-mean ± kσ approach.
  //
  // We run skipGate() over cycles in chronological order, feeding each cycle's
  // length through the gate with the running smoothed value and variance from
  // the engine's exponentialSmooth. This ensures the DB isAnomaly flags match
  // exactly what the prediction engine used when computing smoothed values.
  if (cycleLengths.length >= 2) {
    let smoothed = cycleLengths[0];
    let variance = 0;
    const residuals: number[] = [];
    let cycleIdx = 0;

    for (let i = 0; i < rows.length; i++) {
      const cl = rows[i].cycleLength;
      if (typeof cl !== "number") continue;

      if (cycleIdx === 0) {
        // First cycle -- no previous to compare against, just seed
        cycleIdx++;
        continue;
      }

      // Run the same skip gate the prediction engine uses
      const { isAnomaly } = skipGate(
        cl,
        smoothed,
        variance,
        conditions,
        perimenoStage,
      );

      // Update anomaly flag: set if skipGate says so, clear if it doesn't
      const prevAnomaly = rows[i].isAnomaly;
      rows[i] = { ...rows[i], isAnomaly };

      if (prevAnomaly !== isAnomaly) {
        const existing = updates.find((u) => u.id === rows[i].id);
        if (existing) {
          existing.changes.isAnomaly = isAnomaly;
        } else {
          updates.push({ id: rows[i].id, changes: { isAnomaly } });
        }
      }

      // Mirror exponentialSmooth's update logic so smoothed/variance stay in sync
      const alpha = computeAdaptiveAlpha(residuals.slice(-5));
      const { value: gatedVal, isAnomaly: wasAnomaly } = skipGate(
        cl,
        smoothed,
        variance,
        conditions,
        perimenoStage,
      );
      const diff = gatedVal - smoothed;
      variance = (1 - alpha) * (variance + alpha * diff * diff);
      smoothed = smoothed + alpha * diff;
      if (!wasAnomaly) {
        residuals.push(diff);
      }
      cycleIdx++;
    }
  }

  if (updates.length > 0) {
    await Promise.all(
      updates.map((update) =>
        db.update(cycles).set(update.changes).where(eq(cycles.id, update.id)),
      ),
    );
  }

  await Promise.all([
    refreshPredictionParam(userId, "cycle_length", cycleLengths, conditions),
    refreshPredictionParam(userId, "period_length", periodLengths, conditions),
    refreshPredictionParam(userId, "follicular", follicularLengths, conditions),
    refreshPredictionParam(userId, "luteal", lutealLengths, conditions),
  ]);

  return {
    cycles: rows,
    cycleLengths,
    periodLengths,
    follicularLengths,
    lutealLengths,
  };
}

async function getPredictionParamMap(userId: string) {
  const rows = (await db
    .select()
    .from(predictionParams)
    .where(eq(predictionParams.userId, userId))) as PredictionParamRow[];

  return rows.reduce<Partial<Record<PredictionParamName, PredictionParamRow>>>(
    (acc, row) => {
      acc[row.paramName] = row;
      return acc;
    },
    {},
  );
}

function buildPredictionPayload(
  analytics: AnalyticsResult,
  conditions: string[] = [],
  perimenoStage?: "early" | "late" | "unknown",
) {
  const cyclePrediction = predictNextCycle(
    analytics.cycleLengths,
    "cycleLength",
    conditions,
    perimenoStage,
  );
  const periodPrediction = predictNextCycle(
    analytics.periodLengths,
    "periodLength",
    conditions,
    perimenoStage,
  );
  const lutealPrediction = predictNextCycle(
    analytics.lutealLengths,
    "lutealLength",
    conditions,
    perimenoStage,
  );

  // For hormonal BC users, don't predict ovulation (it's suppressed)
  const effectivePrior = resolveEffectivePrior({ conditions, perimenoStage });
  const ovulationSuppressed =
    effectivePrior.anovulatoryCommon && conditions.includes("hormonal_bc");

  const lastCycle = analytics.cycles.at(-1);
  const nextPeriodStart = lastCycle
    ? addDaysToIsoDate(lastCycle.mStart, Math.round(cyclePrediction.predicted))
    : null;
  const nextPeriodEnd = nextPeriodStart
    ? addDaysToIsoDate(
        nextPeriodStart,
        Math.max(0, Math.round(periodPrediction.predicted)),
      )
    : null;
  const nextOvulationDate = ovulationSuppressed
    ? null // No ovulation on hormonal BC
    : nextPeriodStart
      ? addDaysToIsoDate(
          nextPeriodStart,
          -Math.max(1, Math.round(lutealPrediction.predicted || 14)),
        )
      : null;

  return {
    cycleLength: cyclePrediction,
    periodLength: periodPrediction,
    lutealLength: lutealPrediction,
    nextPeriodStart,
    nextPeriodEnd,
    nextOvulationDate,
  };
}

function buildAveragesFromParams(
  paramMap: Partial<Record<PredictionParamName, PredictionParamRow>>,
  analytics: AnalyticsResult,
  conditions: string[] = [],
  perimenoStage?: "early" | "late" | "unknown",
) {
  return {
    cycleLength:
      paramMap.cycle_length?.smoothedValue ??
      predictNextCycle(
        analytics.cycleLengths,
        "cycleLength",
        conditions,
        perimenoStage,
      ).predicted,
    periodLength:
      paramMap.period_length?.smoothedValue ??
      predictNextCycle(
        analytics.periodLengths,
        "periodLength",
        conditions,
        perimenoStage,
      ).predicted,
    follicularLength:
      paramMap.follicular?.smoothedValue ??
      predictNextCycle(
        analytics.follicularLengths,
        "follicularLength",
        conditions,
        perimenoStage,
      ).predicted,
    lutealLength:
      paramMap.luteal?.smoothedValue ??
      predictNextCycle(
        analytics.lutealLengths,
        "lutealLength",
        conditions,
        perimenoStage,
      ).predicted,
  };
}

export async function logPeriodStartEntry(args: {
  userId: string;
  date: string;
  timeZone: string;
  notes?: string;
  conditions?: string[];
  perimenoStage?: PerimenoStage;
}) {
  const normalized = normalizeDateInput(args.date, args.timeZone);
  if (!normalized.isoDate) {
    return {
      responseMode: "plain" as const,
      kind: "clarification" as const,
      needsClarification: true,
      question:
        "I need a clear start date before I can log that period. What date should I use?",
      reason: normalized.reason,
    };
  }

  const analytics = await refreshCycleAnalytics(
    args.userId,
    args.conditions ?? [],
    args.perimenoStage,
  );
  const existing = analytics.cycles.find(
    (row) => row.mStart === normalized.isoDate,
  );
  const noteText = typeof args.notes === "string" ? args.notes.trim() : "";

  if (existing) {
    const mergedNotes =
      noteText.length > 0
        ? mergeNoteEntries(existing.notes, normalized.isoDate, [noteText])
        : existing.notes;

    await db
      .update(cycles)
      .set({ notes: mergedNotes })
      .where(eq(cycles.id, existing.id));

    const refreshed = await refreshCycleAnalytics(
      args.userId,
      args.conditions ?? [],
      args.perimenoStage,
    );
    const cycle =
      refreshed.cycles.find((row) => row.id === existing.id) ?? existing;

    return {
      responseMode: "plain" as const,
      kind: "confirmation" as const,
      message:
        noteText.length > 0
          ? `updated your period start for ${normalized.isoDate} and added the note.`
          : `updated your period start for ${normalized.isoDate}.`,
      cycle: summarizeCycle(cycle),
    };
  }

  const notes =
    noteText.length > 0
      ? mergeNoteEntries({}, normalized.isoDate, [noteText])
      : {};

  const inserted = await db
    .insert(cycles)
    .values({
      userId: args.userId,
      mStart: normalized.isoDate,
      notes,
    })
    .returning();

  const refreshed = await refreshCycleAnalytics(
    args.userId,
    args.conditions ?? [],
    args.perimenoStage,
  );
  const cycle =
    refreshed.cycles.find((row) => row.id === inserted[0].id) ??
    refreshed.cycles.find((row) => row.mStart === normalized.isoDate) ??
    inserted[0];

  return {
    responseMode: "plain" as const,
    kind: "confirmation" as const,
    message:
      noteText.length > 0
        ? `logged your period start for ${normalized.isoDate} and saved the note.`
        : `logged your period start for ${normalized.isoDate}.`,
    cycle: summarizeCycle(cycle as CycleRow),
  };
}

export async function logPeriodEndEntry(args: {
  userId: string;
  date: string;
  timeZone: string;
  notes?: string;
  conditions?: string[];
  perimenoStage?: PerimenoStage;
}) {
  const normalized = normalizeDateInput(args.date, args.timeZone);
  if (!normalized.isoDate) {
    return {
      responseMode: "plain" as const,
      kind: "clarification" as const,
      needsClarification: true,
      question:
        "I need a clear end date before I can log that period. What date should I use?",
      reason: normalized.reason,
    };
  }

  const analytics = await refreshCycleAnalytics(
    args.userId,
    args.conditions ?? [],
    args.perimenoStage,
  );
  const target = analytics.cycles
    .slice()
    .reverse()
    .find(
      (row) =>
        row.mStart <= normalized.isoDate &&
        (!row.mEnd || row.mEnd >= normalized.isoDate),
    );

  if (!target) {
    return {
      responseMode: "plain" as const,
      kind: "clarification" as const,
      needsClarification: true,
      question:
        "I could not find an open period to close. What start date should I attach this end date to?",
      date: normalized.isoDate,
    };
  }

  const noteText = typeof args.notes === "string" ? args.notes.trim() : "";
  const mergedNotes =
    noteText.length > 0
      ? mergeNoteEntries(target.notes, normalized.isoDate, [noteText])
      : target.notes;

  await db
    .update(cycles)
    .set({
      mEnd: normalized.isoDate,
      notes: mergedNotes,
    })
    .where(eq(cycles.id, target.id));

  const refreshed = await refreshCycleAnalytics(
    args.userId,
    args.conditions ?? [],
    args.perimenoStage,
  );
  const cycle = refreshed.cycles.find((row) => row.id === target.id) ?? target;

  return {
    responseMode: "plain" as const,
    kind: "confirmation" as const,
    message:
      noteText.length > 0
        ? `logged your period end for ${normalized.isoDate} and added the note.`
        : `logged your period end for ${normalized.isoDate}.`,
    cycle: summarizeCycle(cycle),
  };
}

export async function logOvulationEntry(args: {
  userId: string;
  date: string;
  timeZone: string;
  notes?: string;
  conditions?: string[];
  perimenoStage?: PerimenoStage;
}) {
  const normalized = normalizeDateInput(args.date, args.timeZone);
  if (!normalized.isoDate) {
    return {
      responseMode: "plain" as const,
      kind: "clarification" as const,
      needsClarification: true,
      question:
        "I need a clear ovulation date before I can log it. What date should I use?",
      reason: normalized.reason,
    };
  }

  const analytics = await refreshCycleAnalytics(
    args.userId,
    args.conditions ?? [],
    args.perimenoStage,
  );
  const target = analytics.cycles
    .slice()
    .reverse()
    .find(
      (row) =>
        row.mStart <= normalized.isoDate &&
        (!row.mEnd || row.mEnd >= normalized.isoDate),
    );

  if (!target) {
    return {
      responseMode: "plain" as const,
      kind: "clarification" as const,
      needsClarification: true,
      question:
        "I could not find a cycle to attach that ovulation date to. What period start date should I use?",
      date: normalized.isoDate,
    };
  }

  const noteText = typeof args.notes === "string" ? args.notes.trim() : "";
  const mergedNotes =
    noteText.length > 0
      ? mergeNoteEntries(target.notes, normalized.isoDate, [noteText])
      : target.notes;

  await db
    .update(cycles)
    .set({
      ovulationDate: normalized.isoDate,
      notes: mergedNotes,
    })
    .where(eq(cycles.id, target.id));

  const refreshed = await refreshCycleAnalytics(
    args.userId,
    args.conditions ?? [],
    args.perimenoStage,
  );
  const cycle = refreshed.cycles.find((row) => row.id === target.id) ?? target;

  return {
    responseMode: "plain" as const,
    kind: "confirmation" as const,
    message:
      noteText.length > 0
        ? `logged ovulation for ${normalized.isoDate} and added the note.`
        : `logged ovulation for ${normalized.isoDate}.`,
    cycle: summarizeCycle(cycle),
  };
}

export async function addCycleNoteEntry(args: {
  userId: string;
  timeZone: string;
  note: string;
  date?: string;
  symptoms?: string[];
  conditions?: string[];
  perimenoStage?: PerimenoStage;
}) {
  const noteText = args.note.trim();
  const symptoms = (args.symptoms ?? [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (noteText.length === 0 && symptoms.length === 0) {
    return {
      responseMode: "plain" as const,
      kind: "clarification" as const,
      needsClarification: true,
      question: "What note or symptom should I add?",
    };
  }

  const resolvedDate = normalizeDateInput(
    args.date ?? getCurrentIsoDate(args.timeZone),
    args.timeZone,
  );
  if (!resolvedDate.isoDate) {
    return {
      responseMode: "plain" as const,
      kind: "clarification" as const,
      needsClarification: true,
      question:
        "I could not resolve the note date. What date should I attach it to?",
      reason: resolvedDate.reason,
    };
  }

  const analytics = await refreshCycleAnalytics(
    args.userId,
    args.conditions ?? [],
    args.perimenoStage,
  );
  const target =
    analytics.cycles
      .slice()
      .reverse()
      .find(
        (row) =>
          row.mStart <= resolvedDate.isoDate! &&
          (!row.mEnd || row.mEnd >= resolvedDate.isoDate!),
      ) ?? analytics.cycles.at(-1);

  if (!target) {
    return {
      responseMode: "plain" as const,
      kind: "clarification" as const,
      needsClarification: true,
      question:
        "I need at least one logged cycle to attach that note. Would you like to log a period start first?",
    };
  }

  const entries = [
    noteText.length > 0 ? noteText : null,
    symptoms.length > 0 ? `symptoms: ${symptoms.join(", ")}` : null,
  ].filter((item): item is string => typeof item === "string");

  const mergedNotes = mergeNoteEntries(
    target.notes,
    resolvedDate.isoDate,
    entries,
  );

  await db
    .update(cycles)
    .set({ notes: mergedNotes })
    .where(eq(cycles.id, target.id));

  const refreshed = await refreshCycleAnalytics(
    args.userId,
    args.conditions ?? [],
    args.perimenoStage,
  );
  const cycle = refreshed.cycles.find((row) => row.id === target.id) ?? target;

  return {
    responseMode: "plain" as const,
    kind: "confirmation" as const,
    message: `added your note to the cycle that started on ${target.mStart}.`,
    cycle: summarizeCycle(cycle),
  };
}

export async function fetchRecentCyclesEntry(args: {
  userId: string;
  limit: number;
  conditions?: string[];
  perimenoStage?: PerimenoStage;
}) {
  const analytics = await refreshCycleAnalytics(
    args.userId,
    args.conditions ?? [],
    args.perimenoStage,
  );
  const recentCycles = analytics.cycles
    .slice(-args.limit)
    .reverse()
    .map(summarizeCycle);

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
    cycles: recentCycles,
  };
}

export async function getCycleInsightsEntry(args: {
  userId: string;
  timeZone: string;
  mode: "stats" | "prediction";
  conditions?: string[];
  perimenoStage?: PerimenoStage;
}) {
  const analytics = await refreshCycleAnalytics(
    args.userId,
    args.conditions ?? [],
    args.perimenoStage,
  );
  const paramMap = await getPredictionParamMap(args.userId);
  const hasCycles = analytics.cycles.length > 0;
  const recentCycles = analytics.cycles.slice(-3).reverse().map(summarizeCycle);
  const lastCycle = analytics.cycles.at(-1)
    ? summarizeCycle(analytics.cycles.at(-1) as CycleRow)
    : null;

  const predictions = buildPredictionPayload(
    analytics,
    args.conditions ?? [],
    args.perimenoStage,
  );
  const averages = buildAveragesFromParams(
    paramMap,
    analytics,
    args.conditions ?? [],
    args.perimenoStage,
  );

  if (!hasCycles) {
    return {
      responseMode: "plain" as const,
      kind: args.mode,
      message:
        "I do not have enough cycle data yet. Log a period start first and I can build predictions and stats.",
      recentCycles,
      lastCycle,
      averages,
      predictions,
      cycleCount: 0,
    };
  }

  return {
    responseMode: "openui" as const,
    kind: args.mode,
    title: args.mode === "prediction" ? "next period forecast" : "cycle stats",
    summary: `Based on ${analytics.cycles.length} logged cycle${analytics.cycles.length === 1 ? "" : "s"}.`,
    cycleCount: analytics.cycles.length,
    recentCycles,
    lastCycle,
    averages,
    predictions,
  };
}
