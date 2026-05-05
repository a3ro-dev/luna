import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { cycles, predictionParams } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import DashboardClient from "./DashboardClient";

// Prevent Next.js from caching the Neon HTTP fetch responses
export const dynamic = "force-dynamic";

/**
 * Normalise a value that may be a Date object (Neon driver) or a
 * YYYY-MM-DD string into a local-midnight Date for safe day arithmetic.
 *
 * The Neon serverless driver returns `date` columns as JavaScript Date
 * objects.  Neon creates `new Date("2025-01-28T00:00:00")` (no Z),
 * which JS parses in the server's local timezone.  In IST this gives
 * `2025-01-27T18:30:00.000Z`.  We read the *local* date parts to
 * recover the original date and build a stable local-midnight Date.
 */
function toDate(val: Date | string): Date {
  if (val instanceof Date) {
    // The Date object holds the correct local date; extract it.
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return new Date(`${y}-${m}-${d}T00:00:00`);
  }
  return new Date(val + "T00:00:00");
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - now.getTime()) / 86400000);
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Count total cycles
  const [{ count: totalCycles }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(cycles)
    .where(eq(cycles.userId, session.user.id!));

  // Fetch latest cycles (for recent cycles list)
  const userCycles = await db.query.cycles.findMany({
    where: eq(cycles.userId, session.user.id!),
    orderBy: [desc(cycles.mStart)],
    limit: 6,
  });

  // Fetch all cycles for calendar (slim columns)
  const allCyclesForCalendar = await db.query.cycles.findMany({
    where: eq(cycles.userId, session.user.id!),
    orderBy: [desc(cycles.mStart)],
    columns: { mStart: true, mEnd: true, ovulationDate: true },
  });

  // Fetch prediction params
  const params = await db.query.predictionParams.findMany({
    where: eq(predictionParams.userId, session.user.id!),
  });

  const cycleLengthParam = params.find((p) => p.paramName === "cycle_length");
  const periodLengthParam = params.find((p) => p.paramName === "period_length");

  const avgCycleLength = cycleLengthParam
    ? Math.round(cycleLengthParam.smoothedValue)
    : 28;
  const avgPeriodLength = periodLengthParam
    ? Math.round(periodLengthParam.smoothedValue)
    : 5;

  // Compute predictions from the most recent cycle
  const lastCycle = userCycles[0];
  const lastPeriodStart = lastCycle ? toDate(lastCycle.mStart) : new Date();

  const nextPeriodDate = addDays(lastPeriodStart, avgCycleLength);
  const nextOvulationDate = addDays(lastPeriodStart, avgCycleLength - 14);

  const daysToNextPeriod = daysUntil(nextPeriodDate);
  const daysToOvulation = daysUntil(nextOvulationDate);

  // Build calendar for current month
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Collect all period days and predicted days for this month
  const periodDays = new Set<number>();
  const ovulationDays = new Set<number>();
  const predictedPeriodDays = new Set<number>();
  const follicularDays = new Set<number>();
  const lutealDays = new Set<number>();

  // Check actual cycle data for this month
  for (const c of allCyclesForCalendar) {
    if (!c.mStart) continue;
    const start = toDate(c.mStart);
    const end = c.mEnd ? toDate(c.mEnd) : addDays(start, avgPeriodLength);

    // Mark period days
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        periodDays.add(d.getDate());
      }
    }

    // Mark ovulation day
    if (c.ovulationDate) {
      const ov = toDate(c.ovulationDate);
      if (ov.getMonth() === currentMonth && ov.getFullYear() === currentYear) {
        ovulationDays.add(ov.getDate());
      }
    }
  }

  // Mark predicted period days
  const predStart = nextPeriodDate;
  const predEnd = addDays(predStart, avgPeriodLength);
  for (let d = new Date(predStart); d <= predEnd; d = addDays(d, 1)) {
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      predictedPeriodDays.add(d.getDate());
    }
  }

  // Mark predicted ovulation
  if (
    nextOvulationDate.getMonth() === currentMonth &&
    nextOvulationDate.getFullYear() === currentYear
  ) {
    ovulationDays.add(nextOvulationDate.getDate());
  }

  // Follicular: period end to ovulation
  // Luteal: ovulation to next period
  if (lastCycle?.mEnd) {
    const follStart = addDays(toDate(lastCycle.mEnd), 1);
    for (
      let d = new Date(follStart);
      d < nextOvulationDate;
      d = addDays(d, 1)
    ) {
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        follicularDays.add(d.getDate());
      }
    }
    for (
      let d = addDays(nextOvulationDate, 1);
      d < nextPeriodDate;
      d = addDays(d, 1)
    ) {
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        lutealDays.add(d.getDate());
      }
    }
  }

  // Build calendar day data array
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return {
      day,
      isToday: day === today.getDate(),
      isPeriod: periodDays.has(day),
      isPredicted: predictedPeriodDays.has(day),
      isOvulation: ovulationDays.has(day),
      isFollicular: follicularDays.has(day),
      isLuteal: lutealDays.has(day),
    };
  });

  const monthName = today.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Compute consistency
  const consistencyVariance = cycleLengthParam?.variance ?? 999;
  const consistency: "High" | "Moderate" | "Varied" =
    cycleLengthParam && consistencyVariance < 3
      ? "High"
      : cycleLengthParam && consistencyVariance < 8
        ? "Moderate"
        : "Varied";

  // Map cycles for client component
  // Serialise Date objects to YYYY-MM-DD strings so the client
  // component receives a stable, timezone-safe representation.
  // (The Neon driver returns Date objects at runtime even though the
  // Drizzle column type says string.)
  const serialise = (v: Date | string | null): string | null => {
    if (v == null) return null;
    if (v instanceof Date) {
      const y = v.getFullYear();
      const m = String(v.getMonth() + 1).padStart(2, "0");
      const d = String(v.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return v;
  };

  const cyclesForClient = userCycles.map((c) => ({
    id: c.id,
    mStart: serialise(c.mStart as unknown as Date | string) as string,
    mEnd: serialise(c.mEnd as unknown as Date | string | null),
    ovulationDate: serialise(
      c.ovulationDate as unknown as Date | string | null,
    ),
    cycleLength: c.cycleLength,
    periodLength: c.periodLength,
    isAnomaly: c.isAnomaly,
  }));

  return (
    <DashboardClient
      userName={
        session.user.name || session.user.email?.split("@")[0] || "lovely"
      }
      nextPeriodDate={formatDate(nextPeriodDate)}
      nextOvulationDate={formatDate(nextOvulationDate)}
      daysToNextPeriod={daysToNextPeriod}
      daysToOvulation={daysToOvulation}
      avgCycleLength={avgCycleLength}
      avgPeriodLength={avgPeriodLength}
      cyclesTracked={totalCycles}
      consistency={consistency}
      consistencyVariance={consistencyVariance}
      monthName={monthName}
      calendarDays={calendarDays}
      firstDayOffset={firstDay}
      cycles={cyclesForClient}
    />
  );
}
