"use client";

import React from "react";
import QuickLog from "./QuickLog";
import { RingSwatch } from "./CycleRing";
import {
  AskLunaCard,
  Calendar,
  EstimateNote,
  Hero,
  Nav,
  PatternCheck,
  RecentCycles,
  RhythmSection,
  TodayCard,
  type DashboardProps,
} from "./parts";
import { GroupedRow, GroupedSection } from "@/components/apple/Grouped";
import { CirclingBack } from "./premium/CirclingBack";
import { CycleLengthCard } from "./premium/CycleLengthCard";

/**
 * Premium: warm, remembers, circles back. A Health-style Summary beside a
 * navigation rail. DOM order is the phone order (today, logging, what you
 * noted before, what's ahead, your rhythm, pattern check, then the month and
 * history); from xl the Summary is the left column and the month, history and
 * pattern check the right.
 */
export default function PremiumDashboard(props: DashboardProps) {
  const { plan, userName, today, ring, insights } = props;
  // The ovulation estimate is dated from this cycle's start, so once luteal or late it is behind us, not ahead.
  const ovulationPast = props.nextOvulationWindow != null && (insights.phase?.key === "luteal" || insights.phase?.key === "late");
  return (
    <div className="mx-auto max-w-[1280px] lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:pl-6">
      <div className="px-6 lg:px-0">
        <Nav plan={plan} vertical />
      </div>
      {/* Hero's compact bar bleeds by exactly this padding. */}
      <main className="min-w-0 px-4 pb-10 md:px-6 md:pb-14">
        <Hero userName={userName} plan={plan} today={today} />
        <div className="mt-4 grid min-w-0 gap-9 xl:grid-cols-2 xl:items-start xl:gap-6">
          <div className="min-w-0 space-y-9">
            <div className="space-y-4">
              <TodayCard
                ring={ring}
                headline={props.nextPeriodDate}
                window={props.nextPeriodWindow}
                status={props.forecastStatus}
                phase={insights.phase}
                dayOfCycle={insights.dayOfCycle}
              />
              <QuickLog today={today} openPeriod={props.openPeriod} />
            </div>
            <CirclingBack notes={insights.circleBack} dayOfCycle={insights.dayOfCycle} today={today} />
            <GroupedSection header="What's ahead">
              <GroupedRow
                icon={<RingSwatch kind="estimated" />}
                label="Next period, estimated"
                detail={props.nextPeriodWindow ?? props.nextPeriodDate}
              />
              {ovulationPast ? null : (
                <GroupedRow
                  icon={<RingSwatch kind="ovulation" />}
                  label={props.nextOvulationWindow ? "Ovulation, estimated" : "Ovulation"}
                  detail={
                    props.nextOvulationWindow
                      ? `${props.nextOvulationWindow}. A rough calendar estimate, not confirmed ovulation.`
                      : (props.ovulationNote ?? "Not estimated. There is not enough suitable information for a useful estimate.")
                  }
                />
              )}
            </GroupedSection>
            {/* Four tiles are too narrow in a half-width column: 2 x 2 there, like Health. ponytail: reaches into
                RhythmSection's markup; swap for a columns prop on RhythmSection when parts.tsx grows one. */}
            <div className="space-y-4 xl:[&>section>dl]:grid-cols-2">
              <RhythmSection
                avgCycleLength={props.avgCycleLength}
                avgPeriodLength={props.avgPeriodLength}
                cyclesTracked={props.cyclesTracked}
                consistency={props.consistency}
              />
              <CycleLengthCard lengths={insights.lengths} />
            </div>
          </div>
          {/* Phones read pattern check, calendar, history; wide screens lift the month to the top of this column.
              Known trade-off: on xl the reading order keeps pattern check first (it has nothing focusable). */}
          <div className="flex min-w-0 flex-col gap-9">
            <PatternCheck check={props.patternCheck} />
            <div className="space-y-9 xl:order-first">
              <Calendar months={props.calendarMonths} today={today} />
              <RecentCycles cycles={props.cycles} />
            </div>
            <EstimateNote basis={props.forecastBasis} caveats={props.forecastCaveats} />
            <AskLunaCard />
          </div>
        </div>
      </main>
    </div>
  );
}
