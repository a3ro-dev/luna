"use client";

import React from "react";
import { motion } from "motion/react";
import QuickLog from "./QuickLog";
import {
  AskLunaCard,
  Calendar,
  Hero,
  Nav,
  OvulationCard,
  PatternCheck,
  RecentCycles,
  RhythmSection,
  TodayCard,
  useEnter,
  card,
  longDate,
  sectionTitle,
  type DashboardProps,
} from "./parts";

/** Premium+: spacious split layout with a cycle timeline. */
export default function PremiumPlusDashboard(props: DashboardProps) {
  const {
    plan,
    userName,
    nextPeriodDate,
    nextPeriodWindow,
    forecastStatus,
    forecastBasis,
    forecastCaveats,
    nextOvulationWindow,
    ovulationNote,
    avgCycleLength,
    avgPeriodLength,
    cyclesTracked,
    consistency,
    calendarMonths,
    ring,
    cycles,
    today,
    openPeriod,
    patternCheck,
  } = props;
  const enterQuickLog = useEnter(0.13);

  const hero = <Hero userName={userName} plan={plan} today={today} />;
  const todayCard = <TodayCard ring={ring} headline={nextPeriodDate} window={nextPeriodWindow} status={forecastStatus} />;
  const quickLog = (
    <motion.div {...enterQuickLog}>
      <QuickLog today={today} openPeriod={openPeriod} />
    </motion.div>
  );
  const ovulation = <OvulationCard window={nextOvulationWindow} note={ovulationNote} />;
  const ask = <AskLunaCard />;
  const calendar = <Calendar months={calendarMonths} today={today} />;
  const rhythm = (
    <RhythmSection avgCycleLength={avgCycleLength} avgPeriodLength={avgPeriodLength} cyclesTracked={cyclesTracked} consistency={consistency} />
  );
  const history = <RecentCycles cycles={cycles} />;
  const pattern = <PatternCheck check={patternCheck} />;
  const explanation = (
    <section className="max-w-3xl px-1" aria-labelledby="basis-heading">
      <h2 id="basis-heading" className="font-serif text-xl italic text-[var(--tier-ink)]">
        How this estimate works
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--tier-ink)]">{forecastBasis}</p>
      {forecastCaveats.slice(0, 2).map((caveat) => (
        <p key={caveat} className="mt-2 text-[13px] leading-relaxed text-[var(--tier-muted)]">
          {caveat}
        </p>
      ))}
    </section>
  );
  const stack = "min-w-0 space-y-5 md:space-y-6";
  const stackWide = "min-w-0 space-y-6 md:space-y-7";
  void stack;
  return (
<div className="mx-auto max-w-[1440px] space-y-6 px-5 pb-8 pt-4 md:space-y-9 md:px-10 md:py-10">
            <Nav plan={plan} />
            <main className="grid min-w-0 gap-6 xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)] xl:grid-rows-[auto_1fr] xl:gap-x-10 xl:gap-y-7">
              <div className={`${stackWide} xl:col-start-1 xl:row-start-1`}>
                {hero}
                {todayCard}
                {quickLog}
                {ovulation}
              </div>
              <div className={`${stackWide} xl:col-start-2 xl:row-span-2 xl:row-start-1`}>
                {calendar}
                {rhythm}
                {pattern}
                <section className={`${card} p-5 sm:p-8`} aria-labelledby="timeline-heading">
                  <h2 id="timeline-heading" className={sectionTitle}>
                    Cycle timeline
                  </h2>
                  <ol className="mt-5 space-y-4 border-l border-[var(--tier-line)] pl-5 text-sm text-[var(--tier-muted)]">
                    {cycles
                      .slice(0, 3)
                      .reverse()
                      .map((cycle) => (
                        <li
                          key={cycle.id}
                          className="relative before:absolute before:-left-[25px] before:top-1 before:size-2 before:rounded-full before:bg-[var(--tier-accent)]"
                        >
                          <span className="font-medium text-[var(--tier-ink)]">
                            {longDate(cycle.mStart, { month: "short", day: "numeric", year: "numeric" })}
                          </span>{" "}
                          · Period logged
                        </li>
                      ))}
                    <li className="relative before:absolute before:-left-[25px] before:top-1 before:size-2 before:rounded-full before:border before:border-dashed before:border-[var(--tier-accent)] before:bg-[var(--tier-surface)]">
                      {nextPeriodWindow ? `${nextPeriodWindow} · estimated` : "Next period estimate is still learning"}
                    </li>
                  </ol>
                </section>
                {explanation}
              </div>
              <div className={`${stackWide} xl:col-start-1 xl:row-start-2`}>
                {ask}
                {history}
              </div>
            </main>
          </div>
  );
}
