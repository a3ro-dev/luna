import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { cycles, predictionParams, users } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import {
  predictNextCycle,
  resolveEffectivePrior,
} from "@/lib/prediction/engine";
import DashboardClient from "./DashboardClient";

// Prevent Next.js from caching the Neon HTTP fetch responses
export const dynamic = "force-dynamic";

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

  // Fetch user record (for conditions)
  const [userRow] = await db
    .select({
      conditions: users.conditions,
    })
    .from(users)
    .where(eq(users.id, session.user.id!))
    .limit(1);

  const conditions: string[] = Array.isArray(userRow?.conditions)
    ? userRow.conditions
    : [];
  const onHormonalBC = conditions.includes("hormonal_bc");

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

  // Fetch ALL cycles for prediction engine + calendar
  const allCycles = await db.query.cycles.findMany({
    where: eq(cycles.userId, session.user.id!),
    orderBy: [desc(cycles.mStart)],
  });

  // Fetch prediction params
  const params = await db.query.predictionParams.findMany({
    where: eq(predictionParams.userId, session.user.id!),
  });

  const cycleLengthParam = params.find((p) => p.paramName === "cycle_length");
  const periodLengthParam = params.find((p) => p.paramName === "period_length");

  // ── Build observation arrays for predictNextCycle ────────────────
  const cycleLengths: number[] = [];
  const periodLengths: number[] = [];
  const lutealLengths: number[] = [];

  for (const c of allCycles) {
    if (c.cycleLength != null) cycleLengths.push(c.cycleLength);
    if (c.periodLength != null) periodLengths.push(c.periodLength);
    if (c.lutealLength != null) lutealLengths.push(c.lutealLength);
  }

  // ── Condition-aware predictions using predictNextCycle ───────────
  const cyclePrediction = predictNextCycle(
    cycleLengths,
    "cycleLength",
    conditions,
  );
  const periodPrediction = predictNextCycle(
    periodLengths,
    "periodLength",
    conditions,
  );
  const lutealPrediction = predictNextCycle(
    lutealLengths,
    "lutealLength",
    conditions,
  );

  const avgCycleLength = Math.round(cyclePrediction.predicted);
  const avgPeriodLength = Math.round(periodPrediction.predicted);
  const lutealLength = lutealPrediction.predicted;

  // Compute predictions from the most recent cycle
  const lastCycle = userCycles[0];
  // mStart is now always a "YYYY-MM-DD" string (pgDate custom type)
  const lastPeriodStart = lastCycle
    ? new Date(lastCycle.mStart + "T00:00:00")
    : new Date();

  const nextPeriodDate = addDays(lastPeriodStart, avgCycleLength);

  // Bug 1 fix: ovulation = next period - luteal length (not hardcoded -14)
  // For hormonal BC users, ovulation is suppressed
  let nextOvulationDate: Date | null = null;
  let daysToOvulation: number | null = null;
  let nextOvulationDateStr: string | null = null;

  if (!onHormonalBC) {
    nextOvulationDate = addDays(
      nextPeriodDate,
      -Math.round(lutealLength || 14),
    );
    daysToOvulation = daysUntil(nextOvulationDate);
    nextOvulationDateStr = formatDate(nextOvulationDate);
  }

  const daysToNextPeriod = daysUntil(nextPeriodDate);

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

  // Sort cycles chronologically for phase computation
  const sortedCycles = [...allCycles]
    .filter((c) => c.mStart)
    .sort((a, b) => a.mStart.localeCompare(b.mStart));

  // Check actual cycle data for this month and compute phases from data
  for (let ci = 0; ci < sortedCycles.length; ci++) {
    const c = sortedCycles[ci];
    const next = sortedCycles[ci + 1]; // chronologically next cycle
    const start = new Date(c.mStart + "T00:00:00");
    const end = c.mEnd
      ? new Date(c.mEnd + "T00:00:00")
      : addDays(start, avgPeriodLength);

    // Mark period days
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        periodDays.add(d.getDate());
      }
    }

    // Mark ovulation day
    if (c.ovulationDate) {
      const ov = new Date(c.ovulationDate + "T00:00:00");
      if (ov.getMonth() === currentMonth && ov.getFullYear() === currentYear) {
        ovulationDays.add(ov.getDate());
      }

      // Follicular phase: period end → ovulation
      if (c.mEnd) {
        const follStart = addDays(end, 1);
        for (let d = new Date(follStart); d < ov; d = addDays(d, 1)) {
          if (
            d.getMonth() === currentMonth &&
            d.getFullYear() === currentYear
          ) {
            follicularDays.add(d.getDate());
          }
        }
      }

      // Luteal phase: ovulation → next period start (if known)
      if (next) {
        const nextStart = new Date(next.mStart + "T00:00:00");
        for (let d = addDays(ov, 1); d < nextStart; d = addDays(d, 1)) {
          if (
            d.getMonth() === currentMonth &&
            d.getFullYear() === currentYear
          ) {
            lutealDays.add(d.getDate());
          }
        }
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

  // Mark predicted ovulation (only if not on hormonal BC)
  if (
    nextOvulationDate &&
    nextOvulationDate.getMonth() === currentMonth &&
    nextOvulationDate.getFullYear() === currentYear
  ) {
    ovulationDays.add(nextOvulationDate.getDate());
  }

  // Fill predicted phases only for the gap after the last known cycle
  // up to the predicted next period. This avoids overlap with actual
  // phases already computed from real cycle data above.
  if (lastCycle?.mEnd && nextOvulationDate && !onHormonalBC) {
    const lastEnd = new Date(lastCycle.mEnd + "T00:00:00");
    // Follicular: last period end → predicted ovulation
    // Only fill days NOT already assigned to a phase
    for (
      let d = addDays(lastEnd, 1);
      d < nextOvulationDate;
      d = addDays(d, 1)
    ) {
      if (
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear &&
        !periodDays.has(d.getDate()) &&
        !ovulationDays.has(d.getDate()) &&
        !follicularDays.has(d.getDate()) &&
        !lutealDays.has(d.getDate())
      ) {
        follicularDays.add(d.getDate());
      }
    }
    // Luteal: predicted ovulation → predicted next period
    for (
      let d = addDays(nextOvulationDate, 1);
      d < nextPeriodDate;
      d = addDays(d, 1)
    ) {
      if (
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear &&
        !periodDays.has(d.getDate()) &&
        !ovulationDays.has(d.getDate()) &&
        !follicularDays.has(d.getDate()) &&
        !lutealDays.has(d.getDate())
      ) {
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

  // Bug 3 fix: Condition-aware consistency thresholds
  // Use resolveEffectivePrior to get the baseline variance for the user's conditions.
  // < 0.5× prior variance → "High", < 1.5× → "Moderate", else "Varied"
  const consistencyVariance = cycleLengthParam?.variance ?? 999;
  const priorCycleVariance =
    resolveEffectivePrior(conditions).cycleLength.variance;
  const consistency: "High" | "Moderate" | "Varied" =
    cycleLengthParam && consistencyVariance < 0.5 * priorCycleVariance
      ? "High"
      : cycleLengthParam && consistencyVariance < 1.5 * priorCycleVariance
        ? "Moderate"
        : "Varied";

  // Map cycles for client component
  const cyclesForClient = userCycles.map((c) => ({
    id: c.id,
    mStart: c.mStart,
    mEnd: c.mEnd,
    ovulationDate: c.ovulationDate,
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
      nextOvulationDate={nextOvulationDateStr}
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
