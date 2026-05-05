import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { cycles, predictionParams } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
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

  // Fetch latest cycles
  const userCycles = await db.query.cycles.findMany({
    where: eq(cycles.userId, session.user.id!),
    orderBy: [desc(cycles.mStart)],
    limit: 6,
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
  const lastPeriodStart = lastCycle
    ? new Date(lastCycle.mStart + "T00:00:00")
    : new Date();

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
  for (const c of userCycles) {
    if (!c.mStart) continue;
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
    const follStart = addDays(new Date(lastCycle.mEnd + "T00:00:00"), 1);
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

  const monthName = today.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#FFF9F9] text-[#8E7D82] font-sans selection:bg-[#FFDDE0] selection:text-[#6D5A60]">
      <div className="mx-auto max-w-5xl px-5 py-10 md:px-12 md:py-16">
        {/* ── Navigation ── */}
        <nav className="mb-8 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="font-serif text-2xl font-light text-[#6D5A60]"
          >
            Luna
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/chat"
              className="h-9 rounded-full border border-[#FFDDE0]/60 px-5 text-[10px] font-semibold uppercase tracking-widest text-[#6D5A60] transition hover:bg-[#FFF5F7] inline-flex items-center"
            >
              Chat
            </Link>
            <Link
              href="/settings"
              className="h-9 rounded-full border border-[#FFDDE0]/60 px-5 text-[10px] font-semibold uppercase tracking-widest text-[#6D5A60] transition hover:bg-[#FFF5F7] inline-flex items-center"
            >
              Settings
            </Link>
            <SignOutButton className="h-9 rounded-full border border-[#FFDDE0]/60 px-5 text-[10px] font-semibold uppercase tracking-widest text-[#6D5A60] transition hover:bg-[#FFF5F7]" />
          </div>
        </nav>

        <header className="mb-14">
          <h1 className="font-serif text-[clamp(2.5rem,5vw,3.5rem)] font-light text-[#6D5A60] tracking-tight">
            Welcome back,{" "}
            {session.user.name || session.user.email?.split("@")[0] || "lovely"}
          </h1>
          <p className="mt-2 text-base font-light text-[#8E7D82]">
            Here is your cycle overview for the coming weeks.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-3 mb-14">
          <div className="rounded-[2.5rem] border border-white/60 bg-white/50 p-8 shadow-[0_20px_40px_rgba(255,181,192,0.06)] backdrop-blur-xl">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#FFB5C0]">
              Next Period
            </p>
            <p className="mt-3 font-serif text-[clamp(1.5rem,3vw,2rem)] font-light text-[#6D5A60]">
              {formatDate(nextPeriodDate)}
            </p>
            <p className="mt-2 text-sm font-light text-[#8E7D82]">
              {daysToNextPeriod <= 0
                ? "Due now"
                : daysToNextPeriod === 1
                  ? "Tomorrow"
                  : `In ${daysToNextPeriod} days`}
            </p>
          </div>

          <div className="rounded-[2.5rem] border border-white/60 bg-white/50 p-8 shadow-[0_20px_40px_rgba(255,181,192,0.06)] backdrop-blur-xl">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#FBE6B6]">
              Estimated Ovulation
            </p>
            <p className="mt-3 font-serif text-[clamp(1.5rem,3vw,2rem)] font-light text-[#6D5A60]">
              {formatDate(nextOvulationDate)}
            </p>
            <p className="mt-2 text-sm font-light text-[#8E7D82]">
              {daysToOvulation <= 0
                ? "Passed"
                : daysToOvulation === 1
                  ? "Tomorrow"
                  : `In ${daysToOvulation} days`}
            </p>
          </div>

          <div className="rounded-[2.5rem] border border-white/60 bg-white/50 p-8 shadow-[0_20px_40px_rgba(255,181,192,0.06)] backdrop-blur-xl flex flex-col items-center justify-center text-center">
            <p className="font-serif text-lg font-light text-[#6D5A60] mb-5">
              Have a question?
            </p>
            <Link
              href="/chat"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#6D5A60] px-8 text-[10px] font-semibold uppercase tracking-widest text-white shadow-[0_12px_24px_rgba(109,90,96,0.2)] transition duration-300 hover:bg-[#8E7D82]"
            >
              Ask Luna
            </Link>
          </div>
        </div>

        <section className="rounded-[2.5rem] border border-white/60 bg-white/50 p-8 shadow-[0_20px_40px_rgba(255,181,192,0.06)] backdrop-blur-xl mb-14">
          <h2 className="font-serif text-2xl font-light text-[#6D5A60] mb-8">
            {monthName}
          </h2>
          <div className="grid grid-cols-7 gap-2 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="text-[9px] font-semibold uppercase tracking-widest text-[#8E7D82]/50 pb-3"
              >
                {d}
              </div>
            ))}
            {Array.from({ length: firstDay + daysInMonth }).map((_, i) => {
              const day = i - firstDay + 1;
              if (day < 1) return <div key={i} />;

              const isToday = day === today.getDate();
              const isPeriod = periodDays.has(day);
              const isPredicted = predictedPeriodDays.has(day);
              const isOvulation = ovulationDays.has(day);
              const isFollicular = follicularDays.has(day);
              const isLuteal = lutealDays.has(day);

              let bg = "hover:bg-[#FFDDE0]/10";
              let text = "text-[#8E7D82]";
              let extra = "";

              if (isPeriod) {
                bg = "bg-[#FFB5C0]";
                text = "text-white";
              } else if (isPredicted) {
                bg = "bg-transparent border border-dashed border-[#FFB5C0]";
                text = "text-[#FFB5C0]";
              } else if (isOvulation) {
                bg = "bg-[#FBE6B6]/60";
                text = "text-[#6D5A60]";
              } else if (isFollicular) {
                bg = "bg-[#D6CBE3]/15";
              } else if (isLuteal) {
                bg = "bg-[#FFDDE0]/15";
              }

              if (isToday) {
                extra =
                  "ring-2 ring-[#6D5A60]/30 ring-offset-2 ring-offset-[#FFF9F9]";
              }

              return (
                <div
                  key={i}
                  className={`h-12 md:h-16 rounded-2xl flex items-center justify-center text-sm font-light transition-colors cursor-default ${bg} ${text} ${extra}`}
                >
                  {day}
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap gap-5 text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82]/60">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#FFB5C0]" /> Period
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border border-dashed border-[#FFB5C0]" />{" "}
              Predicted
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#FBE6B6]/60" />{" "}
              Ovulation
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#D6CBE3]/20" />{" "}
              Follicular
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#FFDDE0]/20" /> Luteal
            </span>
          </div>
        </section>

        <section className="rounded-[2.5rem] border border-white/60 bg-white/50 p-8 shadow-[0_20px_40px_rgba(255,181,192,0.06)] backdrop-blur-xl mb-14">
          <h2 className="font-serif text-2xl font-light text-[#6D5A60] mb-6">
            Your rhythm
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#FFB5C0] mb-1">
                Avg Cycle
              </p>
              <p className="font-serif text-3xl font-light text-[#6D5A60]">
                {avgCycleLength}
                <span className="text-base text-[#8E7D82]"> days</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#FFB5C0] mb-1">
                Avg Period
              </p>
              <p className="font-serif text-3xl font-light text-[#6D5A60]">
                {avgPeriodLength}
                <span className="text-base text-[#8E7D82]"> days</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#FFB5C0] mb-1">
                Cycles Tracked
              </p>
              <p className="font-serif text-3xl font-light text-[#6D5A60]">
                {userCycles.length < 6
                  ? userCycles.length
                  : `${userCycles.length}+`}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#FFB5C0] mb-1">
                Consistency
              </p>
              <p className="font-serif text-3xl font-light text-[#6D5A60]">
                {cycleLengthParam && cycleLengthParam.variance < 3
                  ? "High"
                  : cycleLengthParam && cycleLengthParam.variance < 8
                    ? "Moderate"
                    : "Varied"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2.5rem] border border-white/60 bg-white/50 p-8 shadow-[0_20px_40px_rgba(255,181,192,0.06)] backdrop-blur-xl">
          <h2 className="font-serif text-2xl font-light text-[#6D5A60] mb-6">
            Recent cycles
          </h2>
          <div className="space-y-4">
            {userCycles.slice(0, 5).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between border-b border-[#FFDDE0]/20 pb-4 last:border-none"
              >
                <div>
                  <p className="font-serif text-lg font-light text-[#6D5A60]">
                    {new Date(c.mStart + "T00:00:00").toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" },
                    )}
                  </p>
                  <p className="text-xs font-light text-[#8E7D82]">
                    {c.periodLength ? `${c.periodLength}d period` : ""}
                    {c.cycleLength ? ` · ${c.cycleLength}d cycle` : ""}
                  </p>
                </div>
                <div className="text-right">
                  {c.isAnomaly && (
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-[#FFB5C0] bg-[#FFB5C0]/10 px-3 py-1 rounded-full">
                      Unusual
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
