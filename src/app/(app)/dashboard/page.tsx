import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  addDaysToIsoDate,
  diffInDays,
  getUserForecast,
  MAX_PERIOD_DAYS,
} from "@/lib/cycle-tools";
import { formatRange, resolveForecastPrior } from "@/lib/prediction/forecast";
import { ageOn, cycleCheck } from "@/lib/prediction/cycle-check";
import DashboardClient from "./DashboardClient";
import { getUserPlan } from "@/lib/theme/server-plan";

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
  const plan = await getUserPlan(session.user.id);

  const [year, month] = today.split("-").map(Number);

  // A period with no logged end, recent enough that it may still be ongoing
  const last = rows.at(-1);
  const bleedDay = last ? diffInDays(last.mStart, today) + 1 : 0;
  const openPeriod =
    last && !last.mEnd && bleedDay <= MAX_PERIOD_DAYS
      ? { id: last.id, mStart: last.mStart, day: bleedDay }
      : null;

  const periodDays = new Set<string>();
  const observedOvulationDays = new Set<string>();
  const predictedOvulationDays = new Set<string>();
  const predictedStartDays = new Set<string>();
  const follicularDays = new Set<string>();
  const lutealDays = new Set<string>();

  for (let index = 0; index < rows.length; index++) {
    const current = rows[index];
    const next = rows[index + 1];
    // An open period counts as logged from its start through today.
    const observedEnd =
      current.mEnd && current.mEnd >= current.mStart
        ? current.mEnd
        : openPeriod?.id === current.id && today > current.mStart
          ? today
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

  // Three months back through two ahead: enough to see recent logs and the
  // whole likely window, which can spill into the following month.
  const calendarMonths = [-3, -2, -1, 0, 1, 2].map((offset) => {
    const first = new Date(Date.UTC(year, month - 1 + offset, 1))
      .toISOString()
      .slice(0, 10);
    const nextFirst = new Date(Date.UTC(year, month + offset, 1))
      .toISOString()
      .slice(0, 10);
    return {
      key: first.slice(0, 7),
      name: formatDate(first).replace(" 1,", ""),
      firstDayOffset: new Date(`${first}T12:00:00Z`).getUTCDay(),
      days: eachDay(first, addDaysToIsoDate(nextFirst, -1)).map((iso) => ({
        iso,
        day: Number(iso.slice(8)),
        isToday: iso === today,
        isPeriod: periodDays.has(iso),
        isPredicted: predictedStartDays.has(iso),
        isOvulation: observedOvulationDays.has(iso),
        isPredictedOvulation: predictedOvulationDays.has(iso),
        isFollicular: follicularDays.has(iso),
        isLuteal: lutealDays.has(iso),
      })),
    };
  });

  // Where today sits in the current cycle, as day offsets from the last start.
  const { lastStart, nextStart, dayOfCycle } = forecast;
  const lastRow = rows.find((row) => row.mStart === lastStart);
  const at = (iso: string) => Math.max(0, diffInDays(lastStart ?? today, iso));
  const ring =
    lastStart && nextStart && dayOfCycle != null
      ? {
          day: dayOfCycle + 1,
          length: Math.max(at(nextStart.latest), dayOfCycle) + 1,
          periodDays:
            lastRow?.mEnd && lastRow.mEnd >= lastRow.mStart
              ? at(lastRow.mEnd) + 1
              : openPeriod && openPeriod.id === lastRow?.id
                ? dayOfCycle + 1
                : 1,
          window: { start: at(nextStart.earliest), end: at(nextStart.latest) },
          ovulation: forecast.ovulation
            ? {
                start: at(forecast.ovulation.earliest),
                end: at(forecast.ovulation.latest),
              }
            : null,
        }
      : null;

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
      plan={plan}
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
      calendarMonths={calendarMonths}
      ring={ring}
      cycles={cyclesForClient}
      today={today}
      openPeriod={openPeriod}
      patternCheck={cycleCheck(rows, {
        today,
        conditions: profile.conditions,
        age: ageOn(profile.dateOfBirth, today),
      })}
    />
  );
}
