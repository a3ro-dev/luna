"use client";

import React from "react";
import QuickLog from "./QuickLog";
import {
  AskLunaCard,
  Calendar,
  EstimateNote,
  Hero,
  Nav,
  OvulationCard,
  PatternCheck,
  RecentCycles,
  RhythmSection,
  TodayCard,
  type DashboardProps,
} from "./parts";

/**
 * Free: practical, to the point. Calendar-first like iOS Calendar. DOM order
 * is the phone order (today, the month, then logging and details); from lg the
 * month and ovulation take the left column and today, logging and chat the
 * right, so both columns end together.
 */
export default function FreeDashboard(props: DashboardProps) {
  const { plan, userName, today, ring, insights } = props;
  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-10 md:px-6 md:pb-14">
      <Nav plan={plan} />
      <main className="min-w-0">
        <Hero userName={userName} plan={plan} today={today} />
        <div className="mt-4 grid min-w-0 gap-4 md:gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)] lg:items-start lg:gap-6">
          <div className="min-w-0 lg:col-start-2 lg:row-start-1">
            <TodayCard
              ring={ring}
              headline={props.nextPeriodDate}
              window={props.nextPeriodWindow}
              status={props.forecastStatus}
              phase={insights.phase}
              dayOfCycle={insights.dayOfCycle}
            />
          </div>
          <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <Calendar months={props.calendarMonths} today={today} />
          </div>
          <div className="min-w-0 lg:col-start-2 lg:row-start-2">
            <QuickLog today={today} openPeriod={props.openPeriod} />
          </div>
          <div className="min-w-0 lg:col-start-1 lg:row-start-3">
            <OvulationCard window={props.nextOvulationWindow} note={props.ovulationNote} />
          </div>
          <div className="min-w-0 lg:col-start-2 lg:row-start-3">
            <AskLunaCard />
          </div>
        </div>
        <div className="mt-9 space-y-9">
          <RhythmSection
            avgCycleLength={props.avgCycleLength}
            avgPeriodLength={props.avgPeriodLength}
            cyclesTracked={props.cyclesTracked}
            consistency={props.consistency}
          />
          <div className="grid gap-9 lg:grid-cols-2 lg:items-start lg:gap-6">
            <RecentCycles cycles={props.cycles} />
            <PatternCheck check={props.patternCheck} />
          </div>
          <EstimateNote basis={props.forecastBasis} caveats={props.forecastCaveats} />
        </div>
      </main>
    </div>
  );
}
