"use client";

/* Shared dashboard pieces. Each plan composes them in its own layout file. */

import React, { useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { LargeTitle } from "@/components/apple/LargeTitle";
import { GroupedRow, GroupedSection, RowIcon } from "@/components/apple/Grouped";
import { spring } from "@/lib/motion";
import type { UserPlan } from "@/lib/theme/accent";
import type { OpenPeriod } from "./QuickLog";
import CycleRing, { RingSwatch, rounded, type CycleRingData } from "./CycleRing";
import type { CycleCheck } from "@/lib/prediction/cycle-check";
import type { CyclePoint, NoteEntry, PhaseInfo } from "@/lib/dashboard/insights";

/** Presentation-only extras derived from the same data every plan has. */
export interface DashboardInsights {
  phase: PhaseInfo | null;
  dayOfCycle: number | null;
  circleBack: NoteEntry[];
  cycleNotes: NoteEntry[];
  lengths: CyclePoint[];
}

/* ─── Types ─── */
export interface CycleRow {
  id: string;
  mStart: string;
  mEnd: string | null;
  ovulationDate: string | null;
  cycleLength: number | null;
  periodLength: number | null;
  isAnomaly: boolean | null;
}

export interface CalendarDay {
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

export interface CalendarMonth {
  key: string; // YYYY-MM
  name: string;
  firstDayOffset: number;
  days: CalendarDay[];
}

export type Consistency = "Learning" | "High" | "Moderate" | "Varied";

export interface DashboardProps {
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
  insights: DashboardInsights;
}

/* ─── Shared styles ─── */
export { rounded };
/** Card surface: the same `.grouped` surface as grouped lists (radius, fill, --shadow-card), so stacked edges match. */
export const card = "grouped";
/** iOS small section header (13px caps), matching GroupedSection. Add `px-4 pb-1.5` above a card. */
export const eyebrow = "text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--label-tertiary)]";
/** iOS title 2. */
export const sectionTitle =
  "font-display text-[22px] font-semibold leading-tight tracking-[-0.02em] text-[var(--tier-ink)]";
export const pill =
  "inline-flex min-h-11 items-center rounded-full px-4 text-[15px] font-medium transition-colors duration-150";
export const pillIdle = `${pill} cursor-pointer text-[var(--label-secondary)] hover:bg-[var(--fill-tertiary)] hover:text-[var(--tier-ink)]`;
/* Solid tint: tint text on a light tint wash drops below 4.5:1, surface text on tint stays above. */
const pillActive = `${pill} bg-[var(--tint)] font-semibold text-[var(--tier-surface)]`;
/** iOS prominent button, filled with the plan tint. */
export const primaryButton =
  "inline-flex min-h-[50px] cursor-pointer items-center justify-center rounded-full bg-[var(--tint)] px-6 text-[17px] font-semibold tracking-[-0.01em] text-[var(--tier-surface)] transition-colors duration-150 hover:bg-[color-mix(in_oklch,var(--tint)_85%,var(--tier-ink))] active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50";
/** iOS plain button: tint text, no chrome until hovered. */
export const plainButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-4 text-[17px] text-[var(--tint)] transition-colors duration-150 hover:bg-[var(--fill-tertiary)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";
export const periodFill = "bg-[color-mix(in_oklch,var(--tier-accent)_55%,var(--tier-surface))]";
/* Dashed means estimated, everywhere. Pulled toward ink so the outline reads at >= 3:1. */
const estimateLine =
  "border-[1.5px] border-dashed border-[color-mix(in_oklch,var(--tier-accent)_55%,var(--tier-ink))]";
/* --honey, --positive and --caution are .tier-app tokens in globals.css. */
const honeyLine = "border-[1.5px] border-dashed border-[var(--honey)]";

const PLAN_LABEL: Record<UserPlan, string> = { free: "Free", premium: "Premium", "premium+": "Premium+" };

export const longDate = (iso: string, opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" }) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });

/**
 * Product screens don't choreograph page loads, so this is a no-op kept for
 * layouts that still spread it onto motion elements.
 */
export function useEnter(delay = 0) {
  void delay;
  return { initial: false as const };
}

/* ─── Sub-components ─── */

const LINKS = [
  { href: "/dashboard", label: "Today" },
  { href: "/chat", label: "Chat" },
  { href: "/settings", label: "Settings" },
] as const;

/**
 * Desktop chrome: a top bar, or a source list with `vertical`. Phones use
 * AppTabBar instead, so the whole nav is hidden below md. Sign out lives in
 * Settings, as in Apple apps.
 */
export function Nav({ plan, vertical = false }: { plan: UserPlan; vertical?: boolean }) {
  return (
    <nav
      aria-label="Main navigation"
      className={
        vertical
          ? "hidden min-w-0 flex-col gap-4 pt-4 md:flex lg:sticky lg:top-4 lg:self-start"
          : "hidden min-h-16 min-w-0 items-center justify-between gap-4 md:flex"
      }
    >
      <Link
        href="/dashboard"
        className={`inline-flex min-h-11 items-center gap-2 font-serif text-[1.625rem] leading-none text-[var(--tier-ink)] transition-opacity duration-150 hover:opacity-70 ${vertical ? "self-start" : ""}`}
      >
        Luna
        <span className="rounded-full bg-[var(--fill-tertiary)] px-2 py-0.5 font-sans text-[12px] font-semibold text-[var(--label-secondary)]">
          {PLAN_LABEL[plan]}
        </span>
      </Link>
      <div className={vertical ? "flex flex-wrap gap-1 lg:flex-col lg:items-stretch" : "flex items-center gap-1"}>
        {LINKS.map((l) =>
          l.href === "/dashboard" ? (
            <Link key={l.href} href={l.href} aria-current="page" className={pillActive}>
              {l.label}
            </Link>
          ) : (
            <Link key={l.href} href={l.href} className={pillIdle}>
              {l.label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}

const PLAN_LINE: Record<UserPlan, string> = {
  free: "Your calendar and what's next.",
  premium: "A gentle look at your rhythm today.",
  "premium+": "A little space to see your rhythm, one cycle at a time.",
};

/** iOS large title. Its parent must be padded `px-4 md:px-6`: the compact bar bleeds by exactly that. */
export function Hero({ userName, plan, today }: { userName: string; plan: UserPlan; today: string }) {
  return (
    <LargeTitle
      title="Today"
      eyebrow={longDate(today, { weekday: "long", month: "long", day: "numeric" })}
      subtitle={<span className="[overflow-wrap:anywhere]">{`Hey ${userName}. ${PLAN_LINE[plan]}`}</span>}
    />
  );
}

/** Estimated phases wear a dashed outline, like estimated days (so "estimated" is only spoken); a logged period is a soft fill. */
export function PhaseChip({ phase }: { phase: PhaseInfo }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center whitespace-nowrap rounded-full px-2.5 text-[13px] font-medium text-[var(--tier-ink)] ${
        phase.estimated ? estimateLine : periodFill
      }`}
    >
      {phase.label}
      {phase.estimated ? <span className="ml-1 font-normal text-[var(--label-secondary)]">estimated</span> : null}
    </span>
  );
}

/** Cycle day and what comes next, in one glance. */
export function TodayCard({
  ring,
  headline,
  window,
  status,
  phase = null,
  dayOfCycle = null,
}: {
  ring: CycleRingData | null;
  headline: string;
  window: string | null;
  status: string;
  phase?: PhaseInfo | null;
  dayOfCycle?: number | null;
}) {
  return (
    <section aria-labelledby="today-heading" className={`${card} p-5 sm:p-6`}>
      <div className="flex items-center gap-5">
        {ring ? <CycleRing data={ring} className="size-28 shrink-0 sm:size-32" /> : null}
        <div className="min-w-0 flex-1">
          {!ring && dayOfCycle != null ? (
            <p className="text-[13px] font-medium text-[var(--label-secondary)]">Cycle day {dayOfCycle}</p>
          ) : null}
          <h2 id="today-heading" className="text-[15px] font-semibold text-[var(--tint)]">
            Next period
          </h2>
          <p className="mt-1 text-balance font-serif text-[1.625rem] leading-[1.1] tracking-[-0.01em] text-[var(--tier-ink)] sm:text-[1.75rem]">{headline}</p>
          {window ? <p className="mt-1 text-[15px] leading-snug text-[var(--label-secondary)]">{window}</p> : null}
          {/* When late, the headline already says so. */}
          {phase && phase.key !== "late" ? (
            <p className="mt-3">
              <PhaseChip phase={phase} />
            </p>
          ) : null}
        </div>
      </div>
      <div className="hairline-t mt-5 pt-4">
        <p className="text-[15px] leading-relaxed text-[var(--tier-ink)]">{status}</p>
        {ring ? (
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[var(--label-secondary)]">
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
    </section>
  );
}

export function OvulationCard({ window, note }: { window: string | null; note: string | null }) {
  return (
    <section aria-labelledby="ovulation-heading" className={`${card} p-5`}>
      <h2 id="ovulation-heading" className="flex items-center gap-2 text-[15px] font-semibold text-[var(--tier-ink)]">
        <span aria-hidden className={`size-2.5 rounded-full ${honeyLine}`} />
        {window ? "Estimated ovulation" : "Ovulation"}
      </h2>
      <p className="mt-1.5 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-[var(--tier-ink)]">
        {window ?? "Not estimated"}
      </p>
      <p className="mt-1 text-[13px] leading-snug text-[var(--label-secondary)]">
        {window
          ? "Rough calendar estimate, not confirmed ovulation"
          : (note ?? "There is not enough suitable information for a useful estimate.")}
      </p>
    </section>
  );
}

/** A quiet grouped row into chat. */
export function AskLunaCard() {
  return (
    <GroupedSection>
      <GroupedRow
        href="/chat"
        icon={
          <RowIcon color="var(--tint)">
            {/* Surface-coloured glyph so it flips with the tint in dark mode (RowIcon defaults to white). */}
            <svg aria-hidden viewBox="0 0 24 24" className="size-4 text-[var(--tier-surface)]" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinejoin="round">
              <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L4 20l1-4.3A8.5 8.5 0 1 1 21 11.5Z" />
            </svg>
          </RowIcon>
        }
        label="Ask Luna"
        detail="Questions about your cycle, any time"
      />
    </GroupedSection>
  );
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const Chevron = ({ d }: { d: string }) => (
  <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

/**
 * Day states in priority order. One list drives each cell's tone, its spoken
 * state and the legend, which shows only states in the visible month.
 */
const DAY_STATES = [
  { key: "isPeriod", label: "Period", spoken: "logged period", tone: `${periodFill} font-medium` },
  { key: "isPredicted", label: "Likely start window", spoken: "likely start window, estimated", tone: estimateLine },
  {
    key: "isOvulation",
    label: "Logged ovulation",
    spoken: "logged ovulation",
    tone: "bg-[color-mix(in_oklab,var(--honey)_40%,var(--tier-surface))]",
  },
  // The calendar marks the single most likely day; the card and ring show the wider window.
  { key: "isPredictedOvulation", label: "Likely ovulation day", spoken: "likely ovulation day, estimated", tone: honeyLine },
  {
    key: "isFollicular",
    label: "Follicular",
    spoken: "follicular phase",
    tone: "bg-[color-mix(in_oklch,var(--tint)_12%,var(--tier-surface))]",
  },
  {
    key: "isLuteal",
    label: "Luteal",
    spoken: "luteal phase",
    tone: "bg-[color-mix(in_oklab,var(--honey)_16%,var(--tier-surface))]",
  },
] as const satisfies readonly { key: keyof CalendarDay; label: string; spoken: string; tone: string }[];

/**
 * iOS Calendar month view. Logged days are soft fills, estimates dashed. Today
 * is a filled tint circle on a plain day; on a day with a state it keeps that
 * state and gains a tint ring, so today never hides a period.
 */
export function Calendar({ months, today }: { months: CalendarMonth[]; today: string }) {
  const current = Math.max(0, months.findIndex((m) => m.key === today.slice(0, 7)));
  const [index, setIndex] = useState(current);
  // Fade only after the user pages, so the server-rendered month is never hidden.
  const [paged, setPaged] = useState(false);
  const month = months[index];
  if (!month) return null;
  const go = (i: number) => {
    setIndex(i);
    setPaged(true);
  };
  const [, monthName = month.name, year] = /^(.*) (\d{4})$/.exec(month.name) ?? [];
  const legend = DAY_STATES.filter((st) => month.days.some((d) => d[st.key]));
  const chevron =
    "inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-[var(--tint)] transition-colors duration-150 hover:bg-[var(--fill-tertiary)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <section aria-labelledby="calendar-heading" className={`${card} px-3 pb-4 pt-3 sm:px-5 sm:pb-5`}>
      <div className="flex items-center justify-between gap-2 pl-2">
        <h2
          id="calendar-heading"
          aria-live="polite"
          className="min-w-0 truncate font-display text-[22px] font-bold tracking-[-0.022em] text-[var(--tier-ink)]"
        >
          {monthName}
          {year ? <span className="font-semibold text-[var(--label-secondary)]"> {year}</span> : null}
        </h2>
        <div className="flex shrink-0 items-center">
          {/* Compact on phones so "September 2026" keeps its full width. */}
          <button
            type="button"
            disabled={index === current}
            onClick={() => go(current)}
            className={`${plainButton} max-sm:px-2.5 max-sm:text-[15px]`}
          >
            Today
          </button>
          <button type="button" aria-label="Previous month" disabled={index === 0} onClick={() => go(index - 1)} className={chevron}>
            <Chevron d="m15 6-6 6 6 6" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            disabled={index === months.length - 1}
            onClick={() => go(index + 1)}
            className={chevron}
          >
            <Chevron d="m9 6 6 6-6 6" />
          </button>
        </div>
      </div>

      <div aria-hidden className="hairline-b mt-2 grid grid-cols-7 pb-2 text-center text-[13px] font-medium text-[var(--label-tertiary)]">
        {WEEKDAYS.map((d) => (
          <span key={d}>
            <span className="sm:hidden">{d[0]}</span>
            <span className="hidden sm:inline">{d.slice(0, 3)}</span>
          </span>
        ))}
      </div>

      <motion.div
        key={month.key}
        className="mt-2 grid grid-cols-7 gap-y-1 text-center"
        initial={paged ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={spring.snappy}
      >
        {Array.from({ length: month.firstDayOffset }, (_, i) => (
          <span key={`pad-${i}`} aria-hidden />
        ))}
        {month.days.map((d) => {
          const state = DAY_STATES.find((st) => d[st.key]);
          const tone = !d.isToday
            ? `${state?.tone ?? ""} text-[var(--tier-ink)]`
            : state
              ? `${state.tone} font-semibold text-[var(--tier-ink)] ring-2 ring-[var(--tint)] ring-offset-2 ring-offset-[var(--tier-surface)]`
              : "bg-[var(--tint)] font-semibold text-[var(--tier-surface)]";
          return (
            <span key={d.iso} className="flex h-11 items-center justify-center md:h-12">
              <time
                dateTime={d.iso}
                className={`flex size-10 items-center justify-center rounded-full text-[17px] tabular-nums md:size-11 ${tone}`}
              >
                <span aria-hidden>{d.day}</span>
                <span className="sr-only">{`${longDate(d.iso)}${d.isToday ? ", today" : ""}${state ? `, ${state.spoken}` : ""}`}</span>
              </time>
            </span>
          );
        })}
      </motion.div>

      {legend.length > 0 ? (
        <ul className="hairline-t mt-3 grid grid-cols-2 gap-x-4 gap-y-2 px-2 pt-3 text-[12px] text-[var(--label-secondary)] sm:flex sm:flex-wrap sm:gap-x-5">
          {legend.map((st) => (
            <li key={st.key} className="flex items-center gap-2">
              <span aria-hidden className={`size-3 shrink-0 rounded-full ${st.tone}`} /> {st.label}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * Health-style tile: tinted title, big rounded numeral, unit beside it.
 * Renders a dt/dd pair, so place tiles inside a <dl>.
 */
export function StatTile({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return (
    <div className={`${card} flex min-w-0 flex-col justify-between gap-3 p-4`}>
      <dt className="text-[15px] font-semibold text-[var(--tint)]">{label}</dt>
      <dd className="flex min-w-0 flex-wrap items-baseline gap-x-1 text-[var(--tier-ink)]">
        <span style={rounded} className="text-[28px] font-bold leading-none tracking-[-0.02em] tabular-nums">
          {value}
        </span>
        {unit ? <span className="text-[15px] font-medium text-[var(--label-secondary)]">{unit}</span> : null}
      </dd>
    </div>
  );
}

/* --positive / --caution are defined on the dashboard root (DashboardClient). Hollow means still learning. */
const CONSISTENCY_DOT: Record<Consistency, string> = {
  Learning: "border-[1.5px] border-[var(--label-tertiary)]",
  High: "bg-[var(--positive)]",
  Moderate: "bg-[var(--caution)]",
  Varied: "bg-[var(--tier-accent)]",
};

export function RhythmSection({
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
  return (
    <section aria-labelledby="rhythm-heading">
      <h2 id="rhythm-heading" className={`${eyebrow} px-4 pb-1.5`}>
        Your rhythm
      </h2>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatTile label="Typical cycle" value={avgCycleLength ?? "Learning"} unit={avgCycleLength != null ? "days" : undefined} />
        <StatTile label="Typical period" value={avgPeriodLength} unit="days" />
        <StatTile label="Cycles tracked" value={cyclesTracked} />
        <StatTile
          label="Consistency"
          value={
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${CONSISTENCY_DOT[consistency]}`} />
              {consistency}
            </span>
          }
        />
      </dl>
    </section>
  );
}

const STATUS_DOT = {
  typical: "bg-[var(--positive)]",
  outside: "bg-[var(--caution)]",
  unknown: "border-[1.5px] border-[var(--label-tertiary)]",
} as const;

/** A coloured dot that always travels with its words. Hollow means unknown. */
export function Status({ tone, children }: { tone: keyof typeof STATUS_DOT; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[15px] text-[var(--label-secondary)]">
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${STATUS_DOT[tone]}`} />
      {children}
    </span>
  );
}

export function RecentCycles({ cycles }: { cycles: CycleRow[] }) {
  if (cycles.length === 0) {
    return (
      <GroupedSection header="Recent cycles">
        <div className="px-6 py-8 text-center">
          <p className="text-[17px] font-semibold text-[var(--tier-ink)]">No cycles yet</p>
          <p className="mx-auto mt-1 max-w-xs text-[15px] leading-snug text-[var(--label-secondary)]">
            Tell Luna about your period and she&apos;ll take it from here.
          </p>
          <Link href="/chat" className={`${primaryButton} mt-5`}>
            Chat with Luna
          </Link>
        </div>
      </GroupedSection>
    );
  }

  // A real list for screen readers. GroupedRow only draws its hairline when it
  // is not a first child, so each <li> draws it instead.
  return (
    <GroupedSection header="Recent cycles">
      <ul role="list">
        {cycles.slice(0, 5).map((c) => (
          <li
            key={c.id}
            className="relative not-first:before:absolute not-first:before:left-4 not-first:before:right-0 not-first:before:top-0 not-first:before:border-t not-first:before:border-[var(--separator)] not-first:before:content-['']"
          >
            <GroupedRow
              label={longDate(c.mStart, { month: "short", day: "numeric", year: "numeric" })}
              detail={
                [c.periodLength && `${c.periodLength}-day period`, c.cycleLength && `${c.cycleLength}-day cycle`]
                  .filter(Boolean)
                  .join(" · ") || "Start logged"
              }
              value={c.isAnomaly ? <Status tone="outside">Set aside</Status> : undefined}
            />
          </li>
        ))}
      </ul>
    </GroupedSection>
  );
}

const CHECK_TEXT = { typical: "Typical", outside: "Outside range", unknown: "Not enough data" } as const;

export function PatternCheck({ check }: { check: CycleCheck }) {
  const footer =
    "Your last 6 months, compared with the ranges doctors use for typical periods. A gentle summary, not a diagnosis." +
    (check.worthMentioning
      ? " One unusual cycle is common. If a pattern keeps showing up, it's worth mentioning to a clinician."
      : "");
  return (
    <GroupedSection header="Pattern check" footer={footer}>
      {check.applicable ? (
        check.items.map((item) => (
          <GroupedRow
            key={item.id}
            label={item.label}
            detail={item.detail}
            value={<Status tone={item.status}>{CHECK_TEXT[item.status]}</Status>}
          />
        ))
      ) : (
        <p className="px-4 py-3 text-[15px] leading-snug text-[var(--label-secondary)]">{check.reason}</p>
      )}
    </GroupedSection>
  );
}

/** How the forecast was made, in plain words. */
export function EstimateNote({ basis, caveats }: { basis: string; caveats: string[] }) {
  return (
    <GroupedSection header="How this estimate works" footer={caveats.slice(0, 2).join(" ") || undefined}>
      <p className="px-4 py-3 text-[15px] leading-relaxed text-[var(--tier-ink)]">{basis}</p>
    </GroupedSection>
  );
}
