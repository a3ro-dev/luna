"use client";

import React from "react";
import { AskLunaCard, Calendar, Hero, Nav, PatternCheck, RecentCycles, RhythmSection, type DashboardProps } from "./parts";
import { Spread } from "./premium-plus/Pages";

/**
 * Premium+: softest, holds space. An open journal (dial and one sentence on
 * the left, this cycle's notes and what's ahead on the right), then the
 * pattern check, calendar and history. DOM order is the phone order.
 */
export default function PremiumPlusDashboard(props: DashboardProps) {
  const { plan, userName, today } = props;
  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-10 md:px-6 md:pb-14">
      <Nav plan={plan} />
      <main className="min-w-0">
        <Hero userName={userName} plan={plan} today={today} />
        <div className="mt-4">
          <Spread {...props} />
        </div>
        <div className="mt-9 grid min-w-0 gap-9 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start lg:gap-x-6">
          <div className="min-w-0 lg:col-start-2 lg:row-start-1">
            <PatternCheck check={props.patternCheck} />
          </div>
          <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <Calendar months={props.calendarMonths} today={today} />
          </div>
          <div className="min-w-0 space-y-9 lg:col-start-2 lg:row-start-2">
            <RecentCycles cycles={props.cycles} />
            <AskLunaCard />
          </div>
        </div>
        <div className="mt-9">
          <RhythmSection
            avgCycleLength={props.avgCycleLength}
            avgPeriodLength={props.avgPeriodLength}
            cyclesTracked={props.cyclesTracked}
            consistency={props.consistency}
          />
        </div>
      </main>
    </div>
  );
}
