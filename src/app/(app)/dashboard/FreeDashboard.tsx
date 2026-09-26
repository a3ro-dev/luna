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
  type DashboardProps,
} from "./parts";

/** Free: focused and calendar-first. */
export default function FreeDashboard(props: DashboardProps) {
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
  void stackWide;
  return (

          <div className="mx-auto max-w-[1360px] space-y-6 px-5 pb-8 pt-4 md:space-y-8 md:px-10 md:py-10">
            <Nav plan={plan} />
            <main className="min-w-0">
              {hero}
              <div className="grid min-w-0 gap-5 md:gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)] xl:grid-rows-[auto_1fr]">
                <div className={`${stack} xl:col-start-2 xl:row-start-1`}>
                  {todayCard}
                  {quickLog}
                </div>
                <div className="min-w-0 xl:col-start-1 xl:row-span-2 xl:row-start-1">{calendar}</div>
                <div className={`${stack} xl:col-start-2 xl:row-start-2`}>
                  {ovulation}
                  {history}
                  {ask}
                </div>
              </div>
              <div className="mt-8 space-y-6">
                {explanation}
                {rhythm}
                {pattern}
              </div>
            </main>
          </div>
  );
}
