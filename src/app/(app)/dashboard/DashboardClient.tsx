"use client";

import React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import SignOutButton from "@/components/SignOutButton";

/* ─── Types ─── */
interface CycleRow {
  id: string;
  mStart: string;
  mEnd: string | null;
  ovulationDate: string | null;
  cycleLength: number | null;
  periodLength: number | null;
  isAnomaly: boolean | null;
}

interface PredictionParam {
  paramName: string;
  smoothedValue: number;
  variance: number;
}

interface CalendarDay {
  day: number;
  isToday: boolean;
  isPeriod: boolean;
  isPredicted: boolean;
  isOvulation: boolean;
  isFollicular: boolean;
  isLuteal: boolean;
}

interface DashboardClientProps {
  userName: string;
  nextPeriodDate: string;
  nextOvulationDate: string;
  daysToNextPeriod: number;
  daysToOvulation: number;
  avgCycleLength: number;
  avgPeriodLength: number;
  cyclesTracked: number;
  consistency: "High" | "Moderate" | "Varied";
  consistencyVariance: number;
  monthName: string;
  calendarDays: CalendarDay[];
  firstDayOffset: number;
  cycles: CycleRow[];
}

/* ─── Animation recipes ─── */
const enterFade = {
  initial: { opacity: 0, y: 12, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { type: "spring" as const, duration: 0.45, bounce: 0 },
};

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.06 },
  },
};

const staggerItem = {
  initial: { opacity: 0, y: 12, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { type: "spring" as const, duration: 0.45, bounce: 0 },
};

/* ─── Shimmer keyframes ─── */
const shimmerKeyframes = `
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}
@keyframes subtlePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.65; }
}
@keyframes predictedPulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 0.45; }
}
`;

/* ─── Sub-components ─── */

function Nav({ userName }: { userName: string }) {
  return (
    <motion.nav
      className="flex items-center justify-between mb-10 md:mb-14"
      {...enterFade}
    >
      <Link
        href="/dashboard"
        className="font-serif text-2xl font-light text-[#6D5A60] hover:opacity-70 transition-opacity duration-150"
      >
        Luna
      </Link>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Link
          href="/dashboard"
          className="h-9 rounded-full px-5 text-[10px] font-semibold uppercase tracking-widest inline-flex items-center transition-all duration-150 bg-[#6D5A60] text-white shadow-[0_4px_12px_rgba(109,90,96,0.15)]"
        >
          Dashboard
        </Link>
        <Link
          href="/chat"
          className="h-9 rounded-full border border-[#FFDDE0]/60 px-5 text-[10px] font-semibold uppercase tracking-widest text-[#6D5A60] transition-all duration-150 hover:bg-[#FFF5F7] hover:border-[#FFDDE0] hover:shadow-[0_2px_8px_rgba(255,181,192,0.1)] inline-flex items-center"
        >
          Chat
        </Link>
        <Link
          href="/settings"
          className="h-9 rounded-full border border-[#FFDDE0]/60 px-5 text-[10px] font-semibold uppercase tracking-widest text-[#6D5A60] transition-all duration-150 hover:bg-[#FFF5F7] hover:border-[#FFDDE0] hover:shadow-[0_2px_8px_rgba(255,181,192,0.1)] inline-flex items-center"
        >
          Settings
        </Link>
        <SignOutButton className="h-9 rounded-full border border-[#FFDDE0]/60 px-5 text-[10px] font-semibold uppercase tracking-widest text-[#6D5A60] transition-all duration-150 hover:bg-[#FFF5F7] hover:border-[#FFDDE0] hover:shadow-[0_2px_8px_rgba(255,181,192,0.1)] inline-flex items-center" />
      </div>
    </motion.nav>
  );
}

function Hero({ userName }: { userName: string }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <header className="mb-12 md:mb-16">
      <motion.h1
        className="font-serif text-[clamp(2.5rem,5vw,3.5rem)] font-light text-[#6D5A60] tracking-tight"
        initial={
          shouldReduceMotion
            ? { opacity: 0 }
            : { opacity: 0, y: 12, filter: "blur(6px)" }
        }
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ type: "spring", duration: 0.45, bounce: 0, delay: 0 }}
      >
        Hey {userName}
      </motion.h1>
      <motion.p
        className="mt-2 text-base font-light text-[#8E7D82]"
        initial={
          shouldReduceMotion
            ? { opacity: 0 }
            : { opacity: 0, y: 8, filter: "blur(4px)" }
        }
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ type: "spring", duration: 0.45, bounce: 0, delay: 0.08 }}
      >
        Here&apos;s what&apos;s coming up for you.
      </motion.p>
    </header>
  );
}

function PredictionCard({
  label,
  labelColor,
  date,
  subtitle,
  index,
}: {
  label: string;
  labelColor: string;
  date: string;
  subtitle: string;
  index: number;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="rounded-3xl border border-white/60 bg-white/50 p-8 shadow-[0_20px_40px_rgba(255,181,192,0.06)] backdrop-blur-xl group cursor-default will-change-transform"
      initial={
        shouldReduceMotion
          ? { opacity: 0 }
          : { opacity: 0, y: 12, filter: "blur(6px)" }
      }
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        type: "spring",
        duration: 0.45,
        bounce: 0,
        delay: 0.15 + index * 0.08,
      }}
      whileHover={
        shouldReduceMotion
          ? {}
          : { y: -2, boxShadow: "0 24px 48px rgba(255,181,192,0.1)" }
      }
      whileTap={
        shouldReduceMotion
          ? {}
          : { y: 0, boxShadow: "0 12px 24px rgba(255,181,192,0.06)" }
      }
    >
      <p
        className={`text-[10px] font-semibold uppercase tracking-widest ${labelColor}`}
      >
        {label}
      </p>
      <p className="mt-3 font-serif text-[clamp(1.5rem,3vw,2rem)] font-light text-[#6D5A60]">
        {date}
      </p>
      <p className="mt-2 text-sm font-light text-[#8E7D82]">{subtitle}</p>
    </motion.div>
  );
}

function AskLunaCard({ index }: { index: number }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="rounded-3xl border border-white/60 bg-white/50 p-8 shadow-[0_20px_40px_rgba(255,181,192,0.06)] backdrop-blur-xl flex flex-col items-center justify-center text-center will-change-transform"
      initial={
        shouldReduceMotion
          ? { opacity: 0 }
          : { opacity: 0, y: 12, filter: "blur(6px)" }
      }
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        type: "spring",
        duration: 0.45,
        bounce: 0,
        delay: 0.15 + index * 0.08,
      }}
      whileHover={
        shouldReduceMotion
          ? {}
          : { y: -2, boxShadow: "0 24px 48px rgba(255,181,192,0.1)" }
      }
      whileTap={
        shouldReduceMotion
          ? {}
          : { y: 0, boxShadow: "0 12px 24px rgba(255,181,192,0.06)" }
      }
    >
      <p className="font-serif text-lg font-light text-[#6D5A60] mb-5">
        Have a question?
      </p>
      <Link
        href="/chat"
        className="relative inline-flex h-12 items-center justify-center rounded-full bg-[#6D5A60] px-8 text-[10px] font-semibold uppercase tracking-widest text-white shadow-[0_12px_24px_rgba(109,90,96,0.2)] transition-all duration-200 hover:bg-[#8E7D82] hover:shadow-[0_14px_28px_rgba(109,90,96,0.25)] active:shadow-[0_8px_16px_rgba(109,90,96,0.15)] overflow-hidden will-change-transform"
      >
        {/* Shimmer effect — plays once then stops */}
        <span
          className="absolute inset-0 opacity-0 animate-[shimmer_2s_ease-in-out_0.5s_1_forwards]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
            backgroundSize: "200% 100%",
          }}
        />
        <span className="relative z-10">Ask Luna</span>
      </Link>
    </motion.div>
  );
}

function Calendar({
  monthName,
  calendarDays,
  firstDayOffset,
}: {
  monthName: string;
  calendarDays: CalendarDay[];
  firstDayOffset: number;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      className="rounded-3xl border border-white/60 bg-white/50 p-6 sm:p-8 shadow-[0_20px_40px_rgba(255,181,192,0.06)] backdrop-blur-xl mb-14"
      {...enterFade}
      transition={{ ...enterFade.transition, delay: 0.3 }}
    >
      <h2 className="font-serif text-2xl font-light text-[#6D5A60] mb-6">
        {monthName}
      </h2>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="text-[9px] font-semibold uppercase tracking-widest text-[#8E7D82]/50 pb-3"
          >
            {d}
          </div>
        ))}
        {Array.from({ length: firstDayOffset + calendarDays.length }).map(
          (_, i) => {
            const dayIndex = i - firstDayOffset;
            if (dayIndex < 0) return <div key={i} />;

            const dayData = calendarDays[dayIndex];
            if (!dayData) return <div key={i} />;

            const {
              day,
              isToday,
              isPeriod,
              isPredicted,
              isOvulation,
              isFollicular,
              isLuteal,
            } = dayData;

            let bg = "hover:bg-[#FFDDE0]/10";
            let text = "text-[#8E7D82]";
            let extra = "";
            let predictedStyle = "";

            if (isPeriod) {
              bg = "bg-[#FFB5C0]";
              text = "text-white";
            } else if (isPredicted) {
              bg = "bg-transparent";
              text = "text-[#FFB5C0]";
              predictedStyle = "border border-dashed border-[#FFB5C0]";
              if (!shouldReduceMotion) {
                predictedStyle +=
                  " animate-[predictedPulse_3s_ease-in-out_infinite]";
              }
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
                "ring-2 ring-[#6D5A60]/30 ring-offset-2 ring-offset-white/50";
              if (!shouldReduceMotion) {
                extra += " animate-[breathe_3s_ease-in-out_infinite]";
              }
            }

            return (
              <div
                key={i}
                className={`h-12 md:h-16 rounded-2xl flex items-center justify-center text-sm font-light transition-colors cursor-default ${bg} ${text} ${extra} ${predictedStyle}`}
              >
                {day}
              </div>
            );
          },
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-4 sm:gap-5 text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82]/60">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#FFB5C0]" /> Period
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border border-dashed border-[#FFB5C0]" />{" "}
          Predicted
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#FBE6B6]/60" /> Ovulation
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#D6CBE3]/20" /> Follicular
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#FFDDE0]/20" /> Luteal
        </span>
      </div>
    </motion.section>
  );
}

function ConsistencyIndicator({
  level,
}: {
  level: "High" | "Moderate" | "Varied";
}) {
  const colors = {
    High: "bg-emerald-400",
    Moderate: "bg-amber-300",
    Varied: "bg-[#FFB5C0]",
  };

  const barWidths = {
    High: "w-4",
    Moderate: "w-3",
    Varied: "w-2",
  };

  return (
    <span className="inline-flex items-center gap-1.5 ml-2 align-middle">
      <span
        className={`inline-block h-2 ${barWidths[level]} rounded-full ${colors[level]}`}
      />
      <span
        className={`inline-block h-2 w-1 rounded-full ${colors[level]} opacity-50`}
      />
    </span>
  );
}

function RhythmSection({
  avgCycleLength,
  avgPeriodLength,
  cyclesTracked,
  consistency,
}: {
  avgCycleLength: number;
  avgPeriodLength: number;
  cyclesTracked: number;
  consistency: "High" | "Moderate" | "Varied";
}) {
  const shouldReduceMotion = useReducedMotion();

  const stats = [
    {
      label: "Avg Cycle",
      value: avgCycleLength,
      suffix: "days",
      labelColor: "text-[#FFB5C0]",
    },
    {
      label: "Avg Period",
      value: avgPeriodLength,
      suffix: "days",
      labelColor: "text-[#FFB5C0]",
    },
    {
      label: "Cycles Tracked",
      value: cyclesTracked,
      suffix: "",
      labelColor: "text-[#D6CBE3]",
    },
    {
      label: "Consistency",
      value: null,
      suffix: consistency,
      labelColor: "text-[#FBE6B6]",
      isConsistency: true,
    },
  ];

  return (
    <motion.section
      className="rounded-3xl border border-white/60 bg-white/50 p-6 sm:p-8 shadow-[0_20px_40px_rgba(255,181,192,0.06)] backdrop-blur-xl mb-14"
      {...enterFade}
      transition={{ ...enterFade.transition, delay: 0.38 }}
    >
      <h2 className="font-serif text-2xl font-light text-[#6D5A60] mb-6">
        Your rhythm
      </h2>
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-6"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            variants={staggerItem}
            transition={{ ...staggerItem.transition, delay: 0.4 + i * 0.06 }}
          >
            <p
              className={`text-[10px] font-semibold uppercase tracking-widest ${stat.labelColor} mb-1`}
            >
              {stat.label}
            </p>
            {stat.isConsistency ? (
              <p className="font-serif text-3xl font-light text-[#6D5A60] tabular-nums">
                {stat.suffix}
                <ConsistencyIndicator level={consistency} />
              </p>
            ) : (
              <p className="font-serif text-3xl font-light text-[#6D5A60] tabular-nums">
                {stat.value}
                <span className="text-base text-[#8E7D82]"> {stat.suffix}</span>
              </p>
            )}
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}

function RecentCycles({ cycles }: { cycles: CycleRow[] }) {
  const shouldReduceMotion = useReducedMotion();

  if (cycles.length === 0) {
    return (
      <motion.section
        className="rounded-3xl border border-white/60 bg-white/50 p-8 sm:p-10 shadow-[0_20px_40px_rgba(255,181,192,0.06)] backdrop-blur-xl text-center"
        {...enterFade}
        transition={{ ...enterFade.transition, delay: 0.46 }}
      >
        <div className="py-8">
          <p className="font-serif text-2xl font-light text-[#6D5A60] mb-2">
            No cycles yet
          </p>
          <p className="text-sm font-light text-[#8E7D82] mb-6 max-w-xs mx-auto">
            Start tracking by telling Luna about your period. She&apos;ll take
            it from here.
          </p>
          <Link
            href="/chat"
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#6D5A60] px-8 text-[10px] font-semibold uppercase tracking-widest text-white shadow-[0_12px_24px_rgba(109,90,96,0.2)] transition-all duration-200 hover:bg-[#8E7D82] hover:shadow-[0_14px_28px_rgba(109,90,96,0.25)] active:shadow-[0_8px_16px_rgba(109,90,96,0.15)] will-change-transform"
          >
            Chat with Luna
          </Link>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      className="rounded-3xl border border-white/60 bg-white/50 p-6 sm:p-8 shadow-[0_20px_40px_rgba(255,181,192,0.06)] backdrop-blur-xl"
      {...enterFade}
      transition={{ ...enterFade.transition, delay: 0.46 }}
    >
      <h2 className="font-serif text-2xl font-light text-[#6D5A60] mb-6">
        Recent cycles
      </h2>
      <motion.div
        className="space-y-1"
        variants={{
          animate: { transition: { staggerChildren: 0.04 } },
        }}
        initial="initial"
        animate="animate"
      >
        {cycles.slice(0, 5).map((c) => (
          <motion.div
            key={c.id}
            variants={staggerItem}
            transition={{ ...staggerItem.transition }}
            className="flex items-center justify-between rounded-2xl px-4 py-3 -mx-1 transition-colors duration-150 hover:bg-[#FFF5F7]"
          >
            <div>
              <p className="font-serif text-lg font-light text-[#6D5A60]">
                {new Date(c.mStart + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-xs font-light text-[#8E7D82]">
                {c.periodLength ? `${c.periodLength}d period` : ""}
                {c.cycleLength ? ` · ${c.cycleLength}d cycle` : ""}
              </p>
            </div>
            <div>
              {c.isAnomaly && (
                <span className="text-[9px] font-semibold uppercase tracking-widest text-[#FFB5C0] bg-[#FFB5C0]/10 px-3 py-1 rounded-full animate-[subtlePulse_2s_ease-in-out_infinite]">
                  Unusual
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}

/* ─── Main component ─── */

export default function DashboardClient(props: DashboardClientProps) {
  const {
    userName,
    nextPeriodDate,
    nextOvulationDate,
    daysToNextPeriod,
    daysToOvulation,
    avgCycleLength,
    avgPeriodLength,
    cyclesTracked,
    consistency,
    monthName,
    calendarDays,
    firstDayOffset,
    cycles,
  } = props;

  const formatSubtext = (
    days: number,
    dueLabel: string,
    tomorrowLabel: string,
  ) => {
    if (days <= 0) return dueLabel;
    if (days === 1) return tomorrowLabel;
    return `In ${days} days`;
  };

  return (
    <div className="min-h-screen bg-[#FFF9F9] text-[#8E7D82] font-sans selection:bg-[#FFDDE0] selection:text-[#6D5A60]">
      {/* Inject keyframes for CSS animations */}
      <style dangerouslySetInnerHTML={{ __html: shimmerKeyframes }} />

      <div className="mx-auto max-w-5xl px-5 py-8 md:px-12 md:py-12">
        <Nav userName={userName} />
        <Hero userName={userName} />

        {/* Prediction cards */}
        <div className="grid gap-5 md:grid-cols-3 mb-14">
          <PredictionCard
            label="Next Period"
            labelColor="text-[#FFB5C0]"
            date={nextPeriodDate}
            subtitle={formatSubtext(daysToNextPeriod, "Due now", "Tomorrow")}
            index={0}
          />
          <PredictionCard
            label="Estimated Ovulation"
            labelColor="text-[#FBE6B6]"
            date={nextOvulationDate}
            subtitle={formatSubtext(daysToOvulation, "Passed", "Tomorrow")}
            index={1}
          />
          <AskLunaCard index={2} />
        </div>

        <Calendar
          monthName={monthName}
          calendarDays={calendarDays}
          firstDayOffset={firstDayOffset}
        />

        <RhythmSection
          avgCycleLength={avgCycleLength}
          avgPeriodLength={avgPeriodLength}
          cyclesTracked={cyclesTracked}
          consistency={consistency}
        />

        <RecentCycles cycles={cycles} />
      </div>
    </div>
  );
}
