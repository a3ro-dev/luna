"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import SignOutButton from "@/components/SignOutButton";
import AppTabBar from "@/components/AppTabBar";
import type { UserPlan } from "@/lib/theme/accent";
import QuickLog, { type OpenPeriod } from "./QuickLog";
import CycleRing, { HONEY_LINE, RingSwatch, type CycleRingData } from "./CycleRing";
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

interface CalendarMonth {
  key: string; // YYYY-MM
  name: string;
  firstDayOffset: number;
  days: CalendarDay[];
}

type Consistency = "Learning" | "High" | "Moderate" | "Varied";

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
  consistency: Consistency;
  calendarMonths: CalendarMonth[];
  ring: CycleRingData | null;
  cycles: CycleRow[];
  today: string;
  openPeriod: OpenPeriod | null;
  patternCheck: CycleCheck;
}

/* ─── Shared styles ─── */
const card =
  "rounded-3xl border border-[var(--tier-line)] bg-[var(--tier-surface)] shadow-[0_20px_40px_rgba(255,181,192,0.06)]";
const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--tier-muted)]";
const sectionTitle = "font-serif text-2xl leading-tight text-[var(--tier-ink)] sm:text-[1.75rem]";
const pill =
  "inline-flex min-h-11 items-center rounded-full px-5 text-xs font-semibold uppercase tracking-wide transition-colors duration-150";
const pillIdle = `${pill} border border-[var(--tier-line)] text-[var(--tier-ink)] hover:bg-[var(--tier-tint)]`;
const periodFill = "bg-[color-mix(in_oklch,var(--tier-accent)_65%,var(--tier-surface))]";

const PLAN_LABEL: Record<UserPlan, string> = { free: "Free", premium: "Premium", "premium+": "Premium+" };

const longDate = (iso: string, opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" }) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });

/*
 * Enter: opacity + rise + blur. `initial` must match on server and client, so
 * reduced motion is handled by <MotionConfig reducedMotion="user"> at the root,
 * which drops the rise at animation time without touching SSR markup.
 */
function useEnter(delay = 0) {
  return {
    initial: { opacity: 0, y: 12, filter: "blur(6px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { type: "spring" as const, duration: 0.45, bounce: 0, delay },
  };
}

/* Today's cell breathes and the Ask Luna button shimmers once; nothing else loops. */
const keyframes = `
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}
`;

/* ─── Sub-components ─── */

function Nav({ plan, vertical = false }: { plan: UserPlan; vertical?: boolean }) {
  const enter = useEnter();
  return (
    <motion.nav
      aria-label="Main navigation"
      className={
        vertical
          ? "flex min-w-0 flex-col gap-4 lg:sticky lg:top-10 lg:self-start"
          : "flex min-w-0 flex-wrap items-center justify-between gap-3"
      }
      {...enter}
    >
      <Link
        href="/dashboard"
        className="inline-flex min-h-11 items-center gap-2.5 self-start font-serif text-2xl text-[var(--tier-ink)] transition-opacity duration-150 hover:opacity-70"
      >
        Luna
        <span className="rounded-full bg-[var(--tier-tint)] px-2.5 py-1 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--tier-ink)]">
          {PLAN_LABEL[plan]}
        </span>
      </Link>
      {/* Phones use the bottom tab bar instead. */}
      <div
        className={
          vertical
            ? "hidden flex-wrap gap-2 md:flex lg:flex-col lg:items-start"
            : "hidden min-w-0 flex-wrap items-center justify-end gap-2 md:flex"
        }
      >
        <Link href="/dashboard" aria-current="page" className={`${pill} bg-[var(--tier-ink)] text-[var(--tier-surface)]`}>
          Dashboard
        </Link>
        <Link href="/chat" className={pillIdle}>
          Chat
        </Link>
        <Link href="/settings" className={pillIdle}>
          Settings
        </Link>
        <SignOutButton className={`${pillIdle} cursor-pointer`} />
      </div>
    </motion.nav>
  );
}

function Hero({ userName, plan, today }: { userName: string; plan: UserPlan; today: string }) {
  const enter = useEnter();
  const later = useEnter(0.08);
  return (
    <header className="mb-6 md:mb-10">
      <motion.p className="font-serif text-lg italic text-[var(--tier-muted)]" {...enter}>
        {longDate(today, { weekday: "long", month: "long", day: "numeric" })}
      </motion.p>
      <motion.h1
        className="mt-1 font-serif text-[clamp(2.4rem,9vw,3.5rem)] font-light leading-[1.05] tracking-tight text-[var(--tier-ink)] [overflow-wrap:anywhere]"
        {...enter}
      >
        Hey {userName}
      </motion.h1>
      <motion.p className="mt-3 max-w-[46ch] text-base font-light leading-relaxed text-[var(--tier-muted)]" {...later}>
        {plan === "free"
          ? "Your calendar and the next things to know."
          : plan === "premium"
            ? "A gentle look at your rhythm today."
            : "A little space to see your rhythm, one cycle at a time."}
      </motion.p>
    </header>
  );
}

/** Cycle day and what comes next, in one glance. */
function TodayCard({
  ring,
  headline,
  window,
  status,
}: {
  ring: CycleRingData | null;
  headline: string;
  window: string | null;
  status: string;
}) {
  const enter = useEnter(0.1);
  return (
    <motion.section aria-labelledby="today-heading" className={`${card} p-5 sm:p-7`} {...enter}>
      <div className="flex items-center gap-5 sm:gap-7">
        {ring ? <CycleRing data={ring} className="size-24 shrink-0 min-[360px]:size-[7.5rem] sm:size-36" /> : null}
        <div className="min-w-0 flex-1">
          <h2 id="today-heading" className={eyebrow}>
            Today
          </h2>
          <p className="mt-3 text-sm text-[var(--tier-muted)]">Next period</p>
          <p className="mt-0.5 font-serif text-[1.65rem] leading-tight text-[var(--tier-ink)] sm:text-3xl">{headline}</p>
          {window ? <p className="mt-1.5 text-sm leading-snug text-[var(--tier-muted)]">{window}</p> : null}
        </div>
      </div>
      <div className="mt-5 border-t border-[var(--tier-line)] pt-4">
        <p className="text-sm leading-relaxed text-[var(--tier-ink)]">{status}</p>
        {ring ? (
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[var(--tier-muted)]">
            <li className="flex items-center gap-1.5">
              <RingSwatch kind="logged" /> Logged period
            </li>
            <li className="flex items-center gap-1.5">
              <RingSwatch kind="estimated" /> Likely start, estimated
            </li>
            {ring.ovulation ? (
              <li className="flex items-center gap-1.5">
                <RingSwatch kind="ovulation" /> Ovulation, estimated
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </motion.section>
  );
}

function OvulationCard({ window, note }: { window: string | null; note: string | null }) {
  const enter = useEnter(0.16);
  return (
    <motion.section aria-labelledby="ovulation-heading" className={`${card} p-5 sm:p-7`} {...enter}>
      <h2 id="ovulation-heading" className={`${eyebrow} flex items-center gap-2`}>
        <span aria-hidden className="size-2.5 rounded-full border border-dashed" style={{ borderColor: HONEY_LINE }} />
        {window ? "Estimated ovulation" : "Ovulation"}
      </h2>
      <p className="mt-2 font-serif text-2xl leading-tight text-[var(--tier-ink)]">{window ?? "Not estimated"}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--tier-muted)]">
        {window
          ? "Rough calendar estimate, not confirmed ovulation"
          : (note ?? "There is not enough suitable information for a useful estimate.")}
      </p>
    </motion.section>
  );
}

function AskLunaCard() {
  const enter = useEnter(0.22);
  return (
    <motion.section
      className={`${card} flex items-center justify-between gap-4 p-5 sm:flex-col sm:justify-center sm:p-8 sm:text-center`}
      {...enter}
    >
      <p className="font-serif text-xl text-[var(--tier-ink)]">Have a question?</p>
      <Link
        href="/chat"
        className="relative inline-flex min-h-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--tier-ink)] px-7 text-[11px] font-semibold uppercase tracking-widest text-[var(--tier-surface)] shadow-[0_12px_24px_rgba(109,90,96,0.2)] transition-[background-color,box-shadow] duration-200 hover:bg-[var(--tier-muted)] hover:shadow-[0_14px_28px_rgba(109,90,96,0.25)] active:shadow-[0_8px_16px_rgba(109,90,96,0.15)]"
      >
        {/* Shimmer plays once, then rests off-button */}
        <span
          aria-hidden
          className="absolute inset-0 animate-[shimmer_2s_ease-in-out_0.5s_1_both] motion-reduce:hidden"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)",
            backgroundSize: "200% 100%",
            backgroundRepeat: "no-repeat",
          }}
        />
        <span className="relative">Ask Luna</span>
      </Link>
    </motion.section>
  );
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function Calendar({ months, today }: { months: CalendarMonth[]; today: string }) {
  const reduce = useReducedMotion();
  const enter = useEnter(0.2);
  const current = Math.max(0, months.findIndex((m) => m.key === today.slice(0, 7)));
  const [index, setIndex] = useState(current);
  const month = months[index];
  if (!month) return null;

  const arrow =
    "inline-flex size-11 items-center justify-center rounded-full border border-[var(--tier-line)] text-[var(--tier-ink)] transition-colors duration-150 hover:bg-[var(--tier-tint)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent cursor-pointer";

  return (
    <motion.section aria-labelledby="calendar-heading" className={`${card} p-4 sm:p-7`} {...enter}>
      <div className="mb-4 flex items-center justify-between gap-2 sm:mb-6">
        <h2 id="calendar-heading" aria-live="polite" className={`${sectionTitle} min-w-0 pl-1`}>
          {month.name}
        </h2>
        <div className="flex shrink-0 items-center gap-1.5">
          {index !== current ? (
            <button
              type="button"
              onClick={() => setIndex(current)}
              className="inline-flex min-h-11 items-center rounded-full px-3 text-xs font-semibold uppercase tracking-wide text-[var(--tier-muted)] transition-colors duration-150 hover:text-[var(--tier-ink)] cursor-pointer"
            >
              Today
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Previous month"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
            className={arrow}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next month"
            disabled={index === months.length - 1}
            onClick={() => setIndex(index + 1)}
            className={arrow}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      <div aria-hidden className="grid grid-cols-7 gap-1 pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--tier-muted)] sm:gap-2">
        {WEEKDAYS.map((d) => (
          <span key={d}>
            <span className="sm:hidden">{d[0]}</span>
            <span className="hidden sm:inline">{d.slice(0, 3)}</span>
          </span>
        ))}
      </div>

      <motion.div
        key={month.key}
        className="grid grid-cols-7 gap-1 text-center sm:gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.2 }}
      >
        {Array.from({ length: month.firstDayOffset }, (_, i) => (
          <span key={`pad-${i}`} aria-hidden />
        ))}
        {month.days.map(
          ({ iso, day, isToday, isPeriod, isPredicted, isOvulation, isPredictedOvulation, isFollicular, isLuteal }) => {
            let tone = "text-[var(--tier-muted)]";
            let style: React.CSSProperties | undefined;
            if (isPeriod) tone = `${periodFill} font-medium text-[var(--tier-ink)]`;
            else if (isPredicted) tone = "border-[1.5px] border-dashed border-[var(--tier-accent)] text-[var(--tier-ink)]";
            else if (isOvulation) tone = "bg-[#FBE6B6] text-[var(--tier-ink)]";
            else if (isPredictedOvulation) {
              tone = "border-[1.5px] border-dashed text-[var(--tier-ink)]";
              style = { borderColor: HONEY_LINE };
            } else if (isFollicular) tone = "bg-[#D6CBE3]/25 text-[var(--tier-muted)]";
            else if (isLuteal) tone = "bg-[#FFDDE0]/35 text-[var(--tier-muted)]";

            const state = isPeriod
              ? ", logged period"
              : isPredicted
                ? ", likely start window, estimated"
                : isOvulation
                  ? ", logged ovulation"
                  : isPredictedOvulation
                    ? ", estimated ovulation"
                    : "";

            return (
              <time
                key={iso}
                dateTime={iso}
                style={style}
                className={`flex h-11 items-center justify-center rounded-xl text-sm tabular-nums sm:h-12 sm:rounded-2xl md:h-14 ${tone} ${
                  isToday
                    ? "font-semibold text-[var(--tier-ink)] ring-[1.5px] ring-[color:var(--tier-ink)] ring-offset-2 ring-offset-[color:var(--tier-surface)] motion-safe:animate-[breathe_3s_ease-in-out_infinite]"
                    : ""
                }`}
              >
                <span aria-hidden>{day}</span>
                <span className="sr-only">{`${longDate(iso)}${isToday ? ", today" : ""}${state}`}</span>
              </time>
            );
          },
        )}
      </motion.div>

      <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs text-[var(--tier-muted)] sm:flex sm:flex-wrap sm:gap-x-5">
        <li className="flex items-center gap-2">
          <span aria-hidden className={`size-3 shrink-0 rounded-full ${periodFill}`} /> Period
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-3 shrink-0 rounded-full border-[1.5px] border-dashed border-[var(--tier-accent)]" /> Likely start window
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-3 shrink-0 rounded-full bg-[#FBE6B6]" /> Logged ovulation
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-3 shrink-0 rounded-full border-[1.5px] border-dashed" style={{ borderColor: HONEY_LINE }} /> Estimated ovulation
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-3 shrink-0 rounded-full bg-[#D6CBE3]/40" /> Follicular
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-3 shrink-0 rounded-full bg-[#FFDDE0]/60" /> Luteal
        </li>
      </ul>
    </motion.section>
  );
}

const CONSISTENCY_COLOR: Record<Consistency, string> = {
  Learning: "bg-[#D6CBE3]",
  High: "bg-emerald-400",
  Moderate: "bg-amber-300",
  Varied: "bg-[#FFB5C0]",
};
const CONSISTENCY_WIDTH: Record<Consistency, string> = { Learning: "w-2", High: "w-4", Moderate: "w-3", Varied: "w-2" };

function RhythmSection({
  avgCycleLength,
  avgPeriodLength,
  cyclesTracked,
  consistency,
}: {
  avgCycleLength: number | null;
  avgPeriodLength: number;
  cyclesTracked: number;
  consistency: Consistency;
}) {
  const enter = useEnter(0.26);
  const stats = [
    { label: "Typical cycle", value: avgCycleLength, unit: "days" },
    { label: "Typical period", value: avgPeriodLength, unit: "days" },
    { label: "Cycles tracked", value: cyclesTracked, unit: "" },
  ];

  return (
    <motion.section aria-labelledby="rhythm-heading" className={`${card} p-5 sm:p-8`} {...enter}>
      <h2 id="rhythm-heading" className={sectionTitle}>
        Your rhythm
      </h2>
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <dt className={eyebrow}>{stat.label}</dt>
            <dd className="mt-1 font-serif text-3xl tabular-nums text-[var(--tier-ink)]">
              {stat.value ?? "Learning"}
              {stat.value != null && stat.unit ? (
                <span className="font-sans text-sm text-[var(--tier-muted)]"> {stat.unit}</span>
              ) : null}
            </dd>
          </div>
        ))}
        <div className="min-w-0">
          <dt className={eyebrow}>Consistency</dt>
          <dd className="mt-1 flex items-center gap-2 font-serif text-3xl text-[var(--tier-ink)]">
            {consistency}
            <span aria-hidden className="inline-flex items-center gap-1">
              <span className={`h-2 rounded-full ${CONSISTENCY_WIDTH[consistency]} ${CONSISTENCY_COLOR[consistency]}`} />
              <span className={`h-2 w-1 rounded-full opacity-50 ${CONSISTENCY_COLOR[consistency]}`} />
            </span>
          </dd>
        </div>
      </dl>
    </motion.section>
  );
}

function RecentCycles({ cycles }: { cycles: CycleRow[] }) {
  const enter = useEnter(0.3);

  if (cycles.length === 0) {
    return (
      <motion.section className={`${card} px-6 py-10 text-center sm:p-10`} {...enter}>
        <p className="font-serif text-2xl text-[var(--tier-ink)]">No cycles yet</p>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[var(--tier-muted)]">
          Start tracking by telling Luna about your period. She&apos;ll take it from here.
        </p>
        <Link href="/chat" className="tier-primary-action mt-6">
          Chat with Luna
        </Link>
      </motion.section>
    );
  }

  return (
    <motion.section aria-labelledby="recent-heading" className={`${card} p-5 sm:p-8`} {...enter}>
      <h2 id="recent-heading" className={sectionTitle}>
        Recent cycles
      </h2>
      <ul className="mt-3 divide-y divide-[var(--tier-line)]">
        {cycles.slice(0, 5).map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-serif text-lg text-[var(--tier-ink)]">
                {longDate(c.mStart, { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <p className="text-xs text-[var(--tier-muted)]">
                {[c.periodLength && `${c.periodLength}d period`, c.cycleLength && `${c.cycleLength}d cycle`]
                  .filter(Boolean)
                  .join(" · ") || "Start logged"}
              </p>
            </div>
            {c.isAnomaly ? (
              <span className="shrink-0 rounded-full bg-[var(--tier-tint)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--tier-ink)]">
                Set aside
              </span>
            ) : null}
          </li>
        ))}
      </ul>
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
    <section aria-labelledby="pattern-check-heading" className={`${card} p-5 sm:p-8`}>
      <h2 id="pattern-check-heading" className={sectionTitle}>
        Pattern check
      </h2>
      <p className="mt-2 max-w-[60ch] text-[13px] leading-relaxed text-[var(--tier-muted)]">
        Your last 6 months compared with FIGO&apos;s reference ranges for typical menstrual bleeding. A pattern
        summary, not a diagnosis.
      </p>
      {check.applicable ? (
        <ul className="mt-5 space-y-4">
          {check.items.map((item) => (
            <li key={item.id} className="flex gap-3">
              <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${CHECK_DOT[item.status]}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--tier-ink)]">
                  {item.label}
                  <span className="sr-only">
                    {item.status === "outside"
                      ? " (outside typical range)"
                      : item.status === "typical"
                        ? " (typical)"
                        : " (not enough data)"}
                  </span>
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-[var(--tier-muted)]">{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm leading-relaxed text-[var(--tier-muted)]">{check.reason}</p>
      )}
      {check.worthMentioning ? (
        <p className="mt-5 text-[13px] leading-relaxed text-[var(--tier-muted)]">
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
    calendarMonths,
    ring,
    cycles,
    today,
    openPeriod,
    patternCheck,
  } = props;

  const hero = <Hero userName={userName} plan={plan} today={today} />;
  const todayCard = (
    <TodayCard ring={ring} headline={nextPeriodDate} window={nextPeriodWindow} status={forecastStatus} />
  );
  const quickLog = <QuickLog today={today} openPeriod={openPeriod} />;
  const ovulation = <OvulationCard window={nextOvulationWindow} note={ovulationNote} />;
  const ask = <AskLunaCard />;
  const calendar = <Calendar months={calendarMonths} today={today} />;
  const rhythm = (
    <RhythmSection
      avgCycleLength={avgCycleLength}
      avgPeriodLength={avgPeriodLength}
      cyclesTracked={cyclesTracked}
      consistency={consistency}
    />
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

  /*
   * Each plan keeps its own desktop composition. On phones every layout reads
   * top to bottom as: today, quick log, then calendar and the rest. The first
   * and last stacks share one grid column on wide screens; the middle stack
   * spans both rows beside them.
   */
  const stack = "min-w-0 space-y-5 md:space-y-6";
  const stackWide = "min-w-0 space-y-6 md:space-y-7";

  return (
    <div className="tier-app font-sans pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0" data-plan={plan}>
      <style dangerouslySetInnerHTML={{ __html: keyframes }} />
      <MotionConfig reducedMotion="user">
        {plan === "free" ? (
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
        ) : plan === "premium" ? (
          <div className="mx-auto grid max-w-[1440px] gap-6 px-5 pb-8 pt-4 md:gap-8 md:px-10 md:py-10 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-10">
            <Nav plan={plan} vertical />
            <main className="min-w-0">
              {hero}
              <div className="grid min-w-0 gap-5 md:gap-6 xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1fr)] xl:grid-rows-[auto_1fr]">
                <div className={`${stack} xl:col-start-1 xl:row-start-1`}>
                  {todayCard}
                  {quickLog}
                </div>
                <div className="min-w-0 xl:col-start-2 xl:row-span-2 xl:row-start-1">{calendar}</div>
                <div className={`${stack} xl:col-start-1 xl:row-start-2`}>
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
        ) : (
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
        )}
      </MotionConfig>
      <AppTabBar />
    </div>
  );
}
