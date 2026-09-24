import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { addDaysToIsoDate, getUserForecast } from "@/lib/cycle-tools";
import { formatRange, resolveForecastPrior } from "@/lib/prediction/forecast";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

const eachDay = (start: string, end: string) => {
  const dates: string[] = [];
  for (let value = start; value <= end; value = addDaysToIsoDate(value, 1)) {
    dates.push(value);
  }
  return dates;
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { forecast, text, profile, rows, today } = await getUserForecast(
    session.user.id,
  );

  const [year, month] = today.split("-").map(Number);
  const firstOfMonth = `${today.slice(0, 8)}01`;
  const firstDayOffset = new Date(`${firstOfMonth}T12:00:00Z`).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const periodDays = new Set<string>();
  const observedOvulationDays = new Set<string>();
  const predictedOvulationDays = new Set<string>();
  const predictedStartDays = new Set<string>();
  const follicularDays = new Set<string>();
  const lutealDays = new Set<string>();

  for (let index = 0; index < rows.length; index++) {
    const current = rows[index];
    const next = rows[index + 1];
    const observedEnd =
      current.mEnd && current.mEnd >= current.mStart
        ? current.mEnd
        : current.mStart;
    eachDay(current.mStart, observedEnd).forEach((date) =>
      periodDays.add(date),
    );

    if (!current.ovulationDate) continue;
    observedOvulationDays.add(current.ovulationDate);
    if (current.mEnd && current.mEnd < current.ovulationDate) {
      eachDay(
        addDaysToIsoDate(current.mEnd, 1),
        addDaysToIsoDate(current.ovulationDate, -1),
      ).forEach((date) => follicularDays.add(date));
    }
    if (next && current.ovulationDate < next.mStart) {
      eachDay(
        addDaysToIsoDate(current.ovulationDate, 1),
        addDaysToIsoDate(next.mStart, -1),
      ).forEach((date) => lutealDays.add(date));
    }
  }

  if (forecast.nextStart) {
    eachDay(forecast.nextStart.earliest, forecast.nextStart.latest).forEach(
      (date) => predictedStartDays.add(date),
    );
  }
  if (forecast.ovulation) predictedOvulationDays.add(forecast.ovulation.date);

  const calendarDays = Array.from({ length: daysInMonth }, (_, index) => {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(
      index + 1,
    ).padStart(2, "0")}`;
    return {
      day: index + 1,
      isToday: iso === today,
      isPeriod: periodDays.has(iso),
      isPredicted: predictedStartDays.has(iso),
      isOvulation: observedOvulationDays.has(iso),
      isPredictedOvulation: predictedOvulationDays.has(iso),
      isFollicular: follicularDays.has(iso),
      isLuteal: lutealDays.has(iso),
    };
  });

  const prior = resolveForecastPrior(profile.conditions, profile.perimenoStage);
  const consistency =
    !forecast.cycleLength || forecast.basis.intervalsUsed < 3
      ? "Learning"
      : forecast.cycleLength.withinSd <= prior.cycle.withinSd * 0.8
        ? "High"
        : forecast.cycleLength.withinSd <= prior.cycle.withinSd * 1.5
          ? "Moderate"
          : "Varied";

  const cyclesForClient = rows
    .slice(-6)
    .reverse()
    .map((cycle) => ({
      id: cycle.id,
      mStart: cycle.mStart,
      mEnd: cycle.mEnd,
      ovulationDate: cycle.ovulationDate,
      cycleLength: cycle.cycleLength,
      periodLength: cycle.periodLength,
      isAnomaly: cycle.isAnomaly,
    }));

  return (
    <DashboardClient
      userName={
        session.user.name || session.user.email?.split("@")[0] || "lovely"
      }
      nextPeriodDate={text.headline ?? "No estimate yet"}
      nextPeriodWindow={text.window}
      forecastStatus={text.status}
      forecastBasis={text.basis}
      forecastCaveats={text.caveats}
      nextOvulationWindow={
        forecast.ovulation
          ? formatRange(forecast.ovulation.earliest, forecast.ovulation.latest)
          : null
      }
      ovulationNote={text.ovulation}
      avgCycleLength={
        forecast.cycleLength ? Math.round(forecast.cycleLength.mean) : null
      }
      avgPeriodLength={Math.round(forecast.periodLength.mean)}
      cyclesTracked={rows.length}
      consistency={consistency}
      monthName={formatDate(firstOfMonth).replace(" 1,", "")}
      calendarDays={calendarDays}
      firstDayOffset={firstDayOffset}
      cycles={cyclesForClient}
    />
  );
}
