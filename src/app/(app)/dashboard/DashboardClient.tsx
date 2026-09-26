"use client";

import React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import SignOutButton from "@/components/SignOutButton";
import type { UserPlan } from "@/lib/theme/accent";
import QuickLog, { type OpenPeriod } from "./QuickLog";
import type { CycleCheck } from "@/lib/prediction/cycle-check";

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

interface CalendarDay {
  iso: string;
  day: number;
  isToday: boolean;
  isPeriod: boolean;
  isPredicted: boolean;
  isOvulation: boolean;
  isPredictedOvulation: boolean;
  isFollicular: boolean;
  isLuteal: boolean;
}

interface DashboardClientProps {
  plan: UserPlan;
  userName: string;
  nextPeriodDate: string;
  nextPeriodWindow: string | null;
  forecastStatus: string;
  forecastBasis: string;
  forecastCaveats: string[];
  nextOvulationWindow: string | null;
  ovulationNote: string | null;
  avgCycleLength: number | null;
  avgPeriodLength: number;
  cyclesTracked: number;
  consistency: "Learning" | "High" | "Moderate" | "Varied";
  monthName: string;
  calendarDays: CalendarDay[];
  firstDayOffset: number;
  cycles: CycleRow[];
  today: string;
  openPeriod: OpenPeriod | null;
  patternCheck: CycleCheck;
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

function Nav({ plan, vertical = false }: { plan: UserPlan; vertical?: boolean }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.nav
      aria-label="Main navigation"
      className={vertical ? "flex min-w-0 flex-col gap-4 lg:sticky lg:top-10" : "flex min-w-0 flex-wrap items-center justify-between gap-3"}
      {...(shouldReduceMotion ? {} : enterFade)}
    >
      <Link
        href="/dashboard"
        className="font-serif text-2xl font-light text-[var(--tier-ink)] hover:opacity-70 transition-opacity duration-150"
      >
        Luna <span className="ml-2 font-sans text-xs font-medium uppercase tracking-widest">{plan === "free" ? "Free" : plan === "premium" ? "Premium" : "Premium+"}</span>
      </Link>
      <div className={vertical ? "flex flex-wrap gap-2 lg:flex-col lg:items-start" : "flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2"}>
        <Link
          href="/dashboard"
          aria-current="page"
          className="min-h-11 rounded-full px-4 sm:px-5 text-xs font-semibold uppercase tracking-wide inline-flex items-center transition-colors duration-150 bg-[var(--tier-ink)] text-[var(--tier-surface)]"
        >
          Dashboard
        </Link>
        <Link
          href="/chat"
          className="min-h-11 rounded-full border border-[var(--tier-line)] px-5 text-xs font-semibold uppercase tracking-wide text-[var(--tier-ink)] transition-colors duration-150 hover:bg-[var(--tier-tint)] inline-flex items-center"
        >
          Chat
        </Link>
        <Link
          href="/settings"
          className="min-h-11 rounded-full border border-[var(--tier-line)] px-5 text-xs font-semibold uppercase tracking-wide text-[var(--tier-ink)] transition-colors duration-150 hover:bg-[var(--tier-tint)] inline-flex items-center"
        >
          Settings
        </Link>
        <SignOutButton className="min-h-11 rounded-full border border-[var(--tier-line)] px-5 text-xs font-semibold uppercase tracking-wide text-[var(--tier-ink)] transition-colors duration-150 hover:bg-[var(--tier-tint)] inline-flex items-center" />
      </div>
    </motion.nav>
  );
}

function Hero({ userName, plan }: { userName: string; plan: UserPlan }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <header className="mb-8 md:mb-10">
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
        {plan === "free" ? "Your calendar and the next things to know." : plan === "premium" ? "A gentle look at your rhythm today." : "A little space to see your rhythm, one cycle at a time."}
      </motion.p>
    </header>
  );
}

function PredictionCard({
  label,
  labelColor,
  date,
  subtitle,
  detail,
  index,
}: {
  label: string;
  labelColor: string;
  date: string;
  subtitle: string;
  detail?: string;
  index: number;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="rounded-3xl border border-[var(--tier-line)] bg-[var(--tier-surface)] p-8 group cursor-default"
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
    >
      <p
        className={`text-[10px] font-semibold uppercase tracking-widest ${labelColor}`}
      >
        {label}
      </p>
      <p className="mt-3 font-serif text-[clamp(1.5rem,3vw,2rem)] font-light text-[var(--tier-ink)]">
        {date}
      </p>
      <p className="mt-2 text-sm font-light text-[#8E7D82]">{subtitle}</p>
      {detail ? (
        <p className="mt-3 max-w-[42ch] text-xs font-light leading-relaxed text-[#8E7D82]/80">
          {detail}
        </p>
      ) : null}
    </motion.div>
  );
}

function AskLunaCard({ index }: { index: number }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="rounded-3xl border border-[var(--tier-line)] bg-[var(--tier-surface)] p-8 flex flex-col items-center justify-center text-center"
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
    >
      <p className="font-serif text-lg font-light text-[var(--tier-ink)] mb-5">
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
      className="rounded-3xl border border-[var(--tier-line)] bg-[var(--tier-surface)] p-6 sm:p-8"
      {...(shouldReduceMotion ? {} : enterFade)}
      transition={shouldReduceMotion ? undefined : { ...enterFade.transition, delay: 0.3 }}
    >
      <h2 className="font-serif text-2xl font-light text-[var(--tier-ink)] mb-6">
        {monthName}
      </h2>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="text-xs font-semibold uppercase tracking-wide text-[var(--tier-muted)] pb-3"
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
              iso,
              day,
              isToday,
              isPeriod,
              isPredicted,
              isOvulation,
              isPredictedOvulation,
              isFollicular,
              isLuteal,
            } = dayData;

            let bg = "hover:bg-[var(--tier-tint)]";
            let text = "text-[var(--tier-muted)]";
            let extra = "";
            let predictedStyle = "";

            if (isPeriod) {
              bg = "bg-[var(--tier-accent)]";
              text = "text-[var(--tier-ink)]";
            } else if (isPredicted) {
              bg = "bg-transparent";
              text = "text-[var(--tier-ink)]";
              predictedStyle = "border border-dashed border-[var(--tier-accent)]";
              if (!shouldReduceMotion) {
                predictedStyle +=
                  " animate-[predictedPulse_3s_ease-in-out_infinite]";
              }
            } else if (isOvulation) {
              bg = "bg-[#FBE6B6]/60";
              text = "text-[#6D5A60]";
            } else if (isPredictedOvulation) {
              bg = "bg-transparent";
              text = "text-[#6D5A60]";
              predictedStyle = "border border-dashed border-[#E4C979]";
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
              <time
                key={i}
                dateTime={iso}
                aria-label={`${new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}${isToday ? ", today" : ""}${isPeriod ? ", logged period" : isPredicted ? ", likely start window" : isOvulation ? ", logged ovulation" : isPredictedOvulation ? ", estimated ovulation" : ""}`}
                className={`h-12 md:h-16 rounded-2xl flex items-center justify-center text-sm font-light transition-colors cursor-default ${bg} ${text} ${extra} ${predictedStyle}`}
              >
                {day}
              </time>
            );
          },
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-4 sm:gap-5 text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82]/60">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[var(--tier-accent)]" /> Period
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border border-dashed border-[var(--tier-accent)]" />{" "}
          Likely start window
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#FBE6B6]/60" /> Logged ovulation
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border border-dashed border-[#E4C979]" /> Estimated ovulation
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
  level: "Learning" | "High" | "Moderate" | "Varied";
}) {
  const colors = {
    Learning: "bg-[#D6CBE3]",
    High: "bg-emerald-400",
    Moderate: "bg-amber-300",
    Varied: "bg-[#FFB5C0]",
  };

  const barWidths = {
    Learning: "w-2",
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
  avgCycleLength: number | null;
  avgPeriodLength: number;
  cyclesTracked: number;
  consistency: "Learning" | "High" | "Moderate" | "Varied";
}) {
  const stats = [
    {
      label: "Typical Cycle",
      value: avgCycleLength,
      suffix: "days",
      labelColor: "text-[#FFB5C0]",
    },
    {
      label: "Typical Period",
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
      className="rounded-3xl border border-white/60 bg-white/50 p-6 sm:p-8 shadow-[0_20px_40px_rgba(255,181,192,0.06)] backdrop-blur-xl"
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
                {stat.value ?? "Learning"}
                {stat.value != null ? (
                  <span className="text-base text-[#8E7D82]"> {stat.suffix}</span>
                ) : null}
              </p>
            )}
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}

function RecentCycles({ cycles }: { cycles: CycleRow[] }) {
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
                <span className="text-[9px] font-semibold uppercase tracking-widest text-[#FFB5C0] bg-[#FFB5C0]/10 px-3 py-1 rounded-full">
                  Set aside
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}

const CHECK_DOT = {
  typical: "bg-emerald-400",
  outside: "bg-amber-400",
  unknown: "bg-[var(--tier-line)]",
} as const;

function PatternCheck({ check }: { check: CycleCheck }) {
  return (
    <section
      aria-labelledby="pattern-check-heading"
      className="rounded-3xl border border-[var(--tier-line)] bg-[var(--tier-surface)] p-6 sm:p-8"
    >
      <h2 id="pattern-check-heading" className="font-serif text-2xl font-light text-[var(--tier-ink)]">
        Pattern check
      </h2>
      <p className="mt-2 max-w-[60ch] text-xs font-light leading-relaxed text-[var(--tier-muted)]">
        Your last 6 months compared with FIGO&apos;s reference ranges for typical menstrual bleeding. A pattern
        summary, not a diagnosis.
      </p>
      {check.applicable ? (
        <ul className="mt-5 space-y-4">
          {check.items.map((item) => (
            <li key={item.id} className="flex gap-3">
              <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${CHECK_DOT[item.status]}`} />
              <div>
                <p className="text-sm font-medium text-[var(--tier-ink)]">
                  {item.label}
                  <span className="sr-only">
                    {item.status === "outside" ? " (outside typical range)" : item.status === "typical" ? " (typical)" : " (not enough data)"}
                  </span>
                </p>
                <p className="mt-0.5 text-sm font-light leading-relaxed text-[var(--tier-muted)]">{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm font-light leading-relaxed text-[var(--tier-muted)]">{check.reason}</p>
      )}
      {check.worthMentioning ? (
        <p className="mt-5 text-xs font-light leading-relaxed text-[var(--tier-muted)]">
          One unusual cycle is common. If a pattern keeps showing up, it&apos;s worth mentioning to a clinician.
        </p>
      ) : null}
    </section>
  );
}

/* ─── Main component ─── */

export default function DashboardClient(props: DashboardClientProps) {
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
    monthName,
    calendarDays,
    firstDayOffset,
    cycles,
    today,
    openPeriod,
    patternCheck,
  } = props;

  const pattern = <PatternCheck check={patternCheck} />;

  const quickLog = <QuickLog today={today} openPeriod={openPeriod} />;

  const nextPeriod = (
    <PredictionCard
      label="Next period"
      labelColor="text-[#B45A75]"
      date={nextPeriodDate}
      subtitle={nextPeriodWindow ?? forecastStatus}
      detail={nextPeriodWindow ? forecastStatus : forecastBasis}
      index={0}
    />
  );
  const ovulation = nextOvulationWindow != null ? (
    <PredictionCard
      label="Estimated ovulation"
      labelColor="text-[#8A6B25]"
      date={nextOvulationWindow}
      subtitle="Rough calendar estimate, not confirmed ovulation"
      index={1}
    />
  ) : (
    <PredictionCard
      label="Ovulation"
      labelColor="text-[#8A6B25]"
      date="Not estimated"
      subtitle={ovulationNote ?? "There is not enough suitable information for a useful estimate."}
      index={1}
    />
  );
  const ask = <AskLunaCard index={2} />;
  const calendar = <Calendar monthName={monthName} calendarDays={calendarDays} firstDayOffset={firstDayOffset} />;
  const rhythm = <RhythmSection avgCycleLength={avgCycleLength} avgPeriodLength={avgPeriodLength} cyclesTracked={cyclesTracked} consistency={consistency} />;
  const history = <RecentCycles cycles={cycles} />;
  const explanation = (
    <section className="max-w-3xl" aria-label="How this forecast was made">
      <p className="text-sm font-light leading-relaxed text-[#6D5A60]">{forecastBasis}</p>
      {forecastCaveats.slice(0, 2).map((caveat) => (
        <p key={caveat} className="mt-2 text-xs font-light leading-relaxed text-[#6D5A60]">{caveat}</p>
      ))}
    </section>
  );

  return (
    <div className="tier-app font-sans" data-plan={plan}>
      {/* Inject keyframes for CSS animations */}
      <style dangerouslySetInnerHTML={{ __html: shimmerKeyframes }} />
      {plan === "free" ? (
        <div className="mx-auto max-w-[1360px] space-y-8 px-5 py-8 md:px-10 md:py-10">
          <Nav plan={plan} />
          <main>
            <Hero userName={userName} plan={plan} />
            <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(290px,0.85fr)]">
              {calendar}
              <div className="space-y-6">{quickLog}{nextPeriod}{ovulation}{history}{ask}</div>
            </div>
            <div className="mt-8 space-y-6">{explanation}{rhythm}{pattern}</div>
          </main>
        </div>
      ) : plan === "premium" ? (
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-8 md:px-10 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-10 lg:py-10">
          <Nav plan={plan} vertical />
          <main className="min-w-0">
            <Hero userName={userName} plan={plan} />
            <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(290px,0.72fr)_minmax(0,1fr)]">
              <div className="space-y-6">
                <section className="border-b border-[var(--tier-line)] pb-5">
                  <h2 className="font-serif text-2xl text-[var(--tier-ink)]">Today</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--tier-muted)]">Your forecast, calendar, and recent logs are together below.</p>
                </section>
                {quickLog}{nextPeriod}{ovulation}{history}{ask}
              </div>
              {calendar}
            </div>
            <div className="mt-8 space-y-6">{explanation}{rhythm}{pattern}</div>
          </main>
        </div>
      ) : (
        <div className="mx-auto max-w-[1440px] space-y-9 px-5 py-8 md:px-10 md:py-10">
          <Nav plan={plan} />
          <main className="grid min-w-0 gap-8 xl:grid-cols-[minmax(300px,0.72fr)_minmax(0,1.28fr)] xl:gap-10">
            <div className="space-y-7">
              <Hero userName={userName} plan={plan} />
              {quickLog}{nextPeriod}{ovulation}{ask}{history}
            </div>
            <div className="space-y-7">
              {calendar}{rhythm}{pattern}
              <section className="rounded-3xl border border-[var(--tier-line)] bg-[var(--tier-surface)] p-6 sm:p-8" aria-labelledby="timeline-heading">
                <h2 id="timeline-heading" className="font-serif text-2xl text-[var(--tier-ink)]">Cycle timeline</h2>
                <ol className="mt-5 space-y-4 border-l border-[var(--tier-line)] pl-5 text-sm text-[var(--tier-muted)]">
                  {cycles.slice(0, 3).reverse().map((cycle) => (
                    <li key={cycle.id} className="relative before:absolute before:-left-[25px] before:top-1 before:size-2 before:rounded-full before:bg-[var(--tier-accent)]">
                      <span className="font-medium text-[var(--tier-ink)]">{new Date(`${cycle.mStart}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</span> · Period logged
                    </li>
                  ))}
                  <li className="relative before:absolute before:-left-[25px] before:top-1 before:size-2 before:rounded-full before:border before:border-[var(--tier-accent)] before:bg-[var(--tier-surface)]">
                    {nextPeriodWindow ?? "Next period estimate is still learning"}
                  </li>
                </ol>
              </section>
              {explanation}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
