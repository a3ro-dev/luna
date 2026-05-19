import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cycles, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { refreshCycleAnalytics } from "@/lib/cycle-tools";
import type { PerimenoStage } from "@/lib/prediction/engine";
import { z } from "zod";

// ─── Supported formats ───────────────────────────────────────────────
// 1. "luna"              — Luna's own JSON export
// 2. "period_calendar"   — "My Calendar" / Period Calendar (Google Play)
// 3. "clue"              — Clue CSV export
// 4. "flo"               — Flo Health CSV/TXT export
// 5. "apple_health"      — Apple Health XML (period records)
// ──────────────────────────────────────────────────────────────────────

interface ParsedCycle {
  mStart: string; // YYYY-MM-DD
  mEnd: string | null;
  ovulationDate?: string | null;
  cycleLength?: number | null;
  periodLength?: number | null;
  notes?: Record<string, unknown>;
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b + "T12:00:00Z").getTime() -
      new Date(a + "T12:00:00Z").getTime()) /
      (1000 * 60 * 60 * 24),
  );
}

/**
 * Parse a date string into YYYY-MM-DD without using `new Date()` which
 * is affected by the server's timezone.  Supports:
 *   - "Jan 28, 2025"   (Period Calendar / My Calendar format)
 *   - "2025-01-28"     (ISO format)
 *   - "2025/01/28"     (slash-separated)
 * Returns null if the date cannot be parsed.
 */
function parseCalendarDate(raw: string): string | null {
  // ISO format: 2025-01-28
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return raw;

  // Slash format: 2025/01/28
  const slashMatch = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (slashMatch) return `${slashMatch[1]}-${slashMatch[2]}-${slashMatch[3]}`;

  // "Mon DD, YYYY" format (e.g. "Jan 28, 2025")
  const monthNames: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  const calMatch = raw.match(/^(\w{3})\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (calMatch) {
    const mon = monthNames[calMatch[1].toLowerCase()];
    if (mon) {
      const day = calMatch[2].padStart(2, "0");
      return `${calMatch[3]}-${mon}-${day}`;
    }
  }

  // Fallback: let Date try, then extract YYYY-MM-DD using UTC noon
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return null;
}

// ─── Parser: Period Calendar (My Calendar) ───────────────────────────
// Format: "Jan 28, 2025\tPeriod Starts" / "Jan 31, 2025\tPeriod Ends"
function parsePeriodCalendar(text: string): ParsedCycle[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const events: {
    date: string;
    type: "start" | "end" | "other";
    raw: string;
  }[] = [];

  for (const line of lines) {
    const [dateStr, eventStr] = line.split("\t").map((s) => s.trim());
    if (!dateStr || !eventStr) continue;

    // Parse the date into YYYY-MM-DD without going through Date to avoid
    // timezone offset shifting the day (e.g. IST midnight → previous day in UTC).
    const iso = parseCalendarDate(dateStr.trim());
    if (!iso) continue;

    if (/period\s+starts/i.test(eventStr)) {
      events.push({ date: iso, type: "start", raw: eventStr });
    } else if (/period\s+ends/i.test(eventStr)) {
      events.push({ date: iso, type: "end", raw: eventStr });
    } else {
      events.push({ date: iso, type: "other", raw: eventStr });
    }
  }

  const cycles: ParsedCycle[] = [];
  const starts = events.filter((e) => e.type === "start");
  const ends = events.filter((e) => e.type === "end");

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    // Find the first end date after this start
    const end = ends.find(
      (e) =>
        e.date > start.date && (!starts[i + 1] || e.date <= starts[i + 1].date),
    );

    const periodLength = end ? daysBetween(start.date, end.date) + 1 : null;
    const cycleLength = starts[i + 1]
      ? daysBetween(start.date, starts[i + 1].date)
      : null;

    // Collect notes (weight, symptoms, etc.) for this period window
    const noteEvents = events.filter(
      (e) =>
        e.type === "other" &&
        e.date >= start.date &&
        (!end || e.date <= end.date),
    );
    const notes: Record<string, string> = {};
    noteEvents.forEach((n) => {
      notes[n.date] = n.raw;
    });

    cycles.push({
      mStart: start.date,
      mEnd: end?.date || null,
      cycleLength,
      periodLength,
      notes: Object.keys(notes).length > 0 ? notes : undefined,
    });
  }

  return cycles;
}

// ─── Parser: Clue CSV ────────────────────────────────────────────────
// Clue exports a CSV with columns like: Date,Period,Pain,Mood,...
// Period values: "light", "medium", "heavy", "spotting"
function parseClue(text: string): ParsedCycle[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const dateIdx = headers.findIndex((h) => h === "date");
  const periodIdx = headers.findIndex((h) => h === "period");

  if (dateIdx === -1 || periodIdx === -1) return [];

  const periodDates: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const dateStr = cols[dateIdx];
    const periodVal = cols[periodIdx]?.toLowerCase();

    if (!dateStr || !periodVal || periodVal === "" || periodVal === "spotting")
      continue;

    const iso = parseCalendarDate(dateStr);
    if (!iso) continue;
    periodDates.push(iso);
  }

  periodDates.sort();

  // Group consecutive dates into cycles
  return groupConsecutiveDates(periodDates);
}

// ─── Parser: Flo ─────────────────────────────────────────────────────
// Flo exports vary but commonly: CSV with "Date", "Period Flow" columns
// or a simple text format similar to Period Calendar
function parseFlo(text: string): ParsedCycle[] {
  // Try CSV first
  if (
    text.includes(",") &&
    text.split(/\r?\n/)[0].toLowerCase().includes("date")
  ) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const dateIdx = headers.findIndex((h) => h.includes("date"));
    const flowIdx = headers.findIndex(
      (h) => h.includes("flow") || h.includes("period"),
    );

    if (dateIdx === -1) return [];

    const periodDates: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const dateStr = cols[dateIdx];
      const flowVal = flowIdx >= 0 ? cols[flowIdx]?.toLowerCase() : "";

      if (!dateStr) continue;
      // If there's a flow column, only include rows with actual flow
      if (flowIdx >= 0 && (!flowVal || flowVal === "none" || flowVal === ""))
        continue;

      const iso = parseCalendarDate(dateStr);
      if (!iso) continue;
      periodDates.push(iso);
    }

    periodDates.sort();
    return groupConsecutiveDates(periodDates);
  }

  // Fallback: try Period Calendar format
  return parsePeriodCalendar(text);
}

// ─── Parser: Apple Health XML ────────────────────────────────────────
// Apple Health exports XML with <Record type="HKCategoryTypeIdentifierMenstrualFlow" ...>
function parseAppleHealth(text: string): ParsedCycle[] {
  const periodDates: string[] = [];
  const regex =
    /<Record[^>]*type="HKCategoryTypeIdentifierMenstrualFlow"[^>]*startDate="([^"]+)"[^>]*\/>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const dateStr = match[1];
    const iso = parseCalendarDate(dateStr.split(" ")[0]); // "2025-01-28 ..." → "2025-01-28"
    if (iso) {
      periodDates.push(iso);
    }
  }

  // Also try the alternate attribute order
  const regex2 =
    /<Record[^>]*startDate="([^"]+)"[^>]*type="HKCategoryTypeIdentifierMenstrualFlow"[^>]*\/>/g;
  while ((match = regex2.exec(text)) !== null) {
    const dateStr = match[1];
    const iso = parseCalendarDate(dateStr.split(" ")[0]);
    if (iso) {
      periodDates.push(iso);
    }
  }

  const unique = [...new Set(periodDates)].sort();
  return groupConsecutiveDates(unique);
}

// ─── Parser: Luna's own JSON ─────────────────────────────────────────

const lunaCycleSchema = z.object({
  mStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  ovulationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  cycleLength: z.number().int().min(1).max(365).nullable().optional(),
  periodLength: z.number().int().min(1).max(60).nullable().optional(),
  notes: z.record(z.unknown()).optional(),
});

function parseLuna(text: string): ParsedCycle[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  const rawCycles = (data as Record<string, unknown>)?.cycles ?? data;
  if (!Array.isArray(rawCycles)) return [];

  const results: ParsedCycle[] = [];
  for (const item of rawCycles) {
    const parsed = lunaCycleSchema.safeParse(item);
    if (!parsed.success) continue; // Skip invalid entries silently
    const c = parsed.data;
    results.push({
      mStart: c.mStart,
      mEnd: c.mEnd ?? null,
      ovulationDate: c.ovulationDate ?? null,
      cycleLength: c.cycleLength ?? null,
      periodLength: c.periodLength ?? null,
      notes: c.notes as Record<string, unknown> | undefined,
    });
  }
  return results;
}

// ─── Utility: group consecutive dates into start/end cycles ──────────
function groupConsecutiveDates(dates: string[]): ParsedCycle[] {
  if (dates.length === 0) return [];

  const cycles: ParsedCycle[] = [];
  let start = dates[0];
  let prev = dates[0];

  for (let i = 1; i < dates.length; i++) {
    const gap = daysBetween(prev, dates[i]);
    if (gap > 2) {
      // End the current cycle, start a new one
      const periodLength = daysBetween(start, prev) + 1;
      cycles.push({
        mStart: start,
        mEnd: prev === start ? null : prev,
        periodLength: periodLength > 0 ? periodLength : null,
      });
      start = dates[i];
    }
    prev = dates[i];
  }

  // Push the last cycle
  const periodLength = daysBetween(start, prev) + 1;
  cycles.push({
    mStart: start,
    mEnd: prev === start ? null : prev,
    periodLength: periodLength > 0 ? periodLength : null,
  });

  // Calculate cycle lengths
  for (let i = 0; i < cycles.length - 1; i++) {
    cycles[i].cycleLength = daysBetween(cycles[i].mStart, cycles[i + 1].mStart);
  }

  return cycles;
}

// ─── Auto-detect format ──────────────────────────────────────────────
function detectFormat(text: string): string {
  const trimmed = text.trim();

  // Luna JSON
  if (
    trimmed.startsWith("{") &&
    trimmed.includes('"format"') &&
    trimmed.includes('"luna"')
  ) {
    return "luna";
  }
  // Generic JSON array
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return "luna";
  }
  // Apple Health XML
  if (
    trimmed.includes("HKCategoryTypeIdentifierMenstrualFlow") ||
    trimmed.includes("<HealthData")
  ) {
    return "apple_health";
  }
  // Period Calendar / My Calendar format
  if (/Period\s+Starts/i.test(trimmed) && /Period\s+Ends/i.test(trimmed)) {
    return "period_calendar";
  }
  // Clue CSV (has "Period" header)
  if (
    trimmed.split(/\r?\n/)[0].toLowerCase().includes("period") &&
    trimmed.includes(",")
  ) {
    return "clue";
  }
  // Flo CSV (has "flow" header)
  if (
    trimmed.split(/\r?\n/)[0].toLowerCase().includes("flow") &&
    trimmed.includes(",")
  ) {
    return "flo";
  }
  // Generic CSV fallback
  if (
    trimmed.includes(",") &&
    trimmed.split(/\r?\n/)[0].toLowerCase().includes("date")
  ) {
    return "clue";
  }

  return "period_calendar"; // fallback
}

// ─── POST handler ────────────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Enforce a 5MB body size limit to prevent DoS via large payloads.
    // Apple Health XML exports can be large, but 5MB covers all realistic cases.
    const contentLength = req.headers.get("content-length");
    const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5MB
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Import file is too large. Maximum size is 5MB." },
        { status: 413 },
      );
    }

    const body = await req.json();
    const { data, format: explicitFormat } = body as {
      data: string;
      format?: string;
    };

    if (!data || typeof data !== "string") {
      return NextResponse.json(
        { error: "Missing 'data' field." },
        { status: 400 },
      );
    }

    // Secondary size check on the parsed string (catches cases where
    // Content-Length header is absent, e.g. chunked transfer encoding)
    if (data.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Import data is too large. Maximum size is 5MB." },
        { status: 413 },
      );
    }

    // Validate explicit format if provided
    const ALLOWED_FORMATS = ["luna", "period_calendar", "clue", "flo", "apple_health"];
    if (explicitFormat && !ALLOWED_FORMATS.includes(explicitFormat)) {
      return NextResponse.json(
        { error: `Unknown format: ${explicitFormat}` },
        { status: 400 },
      );
    }

    const format = explicitFormat || detectFormat(data);
    let parsed: ParsedCycle[] = [];

    switch (format) {
      case "period_calendar":
        parsed = parsePeriodCalendar(data);
        break;
      case "clue":
        parsed = parseClue(data);
        break;
      case "flo":
        parsed = parseFlo(data);
        break;
      case "apple_health":
        parsed = parseAppleHealth(data);
        break;
      case "luna":
        parsed = parseLuna(data);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown format: ${format}` },
          { status: 400 },
        );
    }
    if (parsed.length === 0) {
      return NextResponse.json(
        { error: "No cycle data found in the import." },
        { status: 400 },
      );
    }

    // Insert all cycles
    await db.insert(cycles).values(
      parsed.map((c) => ({
        userId: session.user!.id!,
        mStart: c.mStart,
        mEnd: c.mEnd,
        ovulationDate: c.ovulationDate || null,
        cycleLength: c.cycleLength || null,
        periodLength: c.periodLength || null,
        notes: c.notes || {},
      })),
    );

    // Refresh derived columns and prediction parameters so the
    // prediction engine immediately "sees" the imported data.
    const userRow = await db.query.users.findFirst({
      where: eq(users.id, session.user.id!),
      columns: { conditions: true, perimenoStage: true },
    });
    const conditions: string[] = Array.isArray(userRow?.conditions)
      ? (userRow.conditions as string[])
      : [];
    const perimenoStage =
      (userRow?.perimenoStage as PerimenoStage | undefined) ?? undefined;
    await refreshCycleAnalytics(session.user.id!, conditions, perimenoStage);

    return NextResponse.json(
      {
        success: true,
        format,
        cyclesImported: parsed.length,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json(
      { error: "Failed to parse or import data." },
      { status: 500 },
    );
  }
}
