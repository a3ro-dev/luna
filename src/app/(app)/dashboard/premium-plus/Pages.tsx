"use client";

import React from "react";
import Link from "next/link";
import CycleRing, { RingSwatch } from "../CycleRing";
import QuickLog from "../QuickLog";
import { longDate, PhaseChip, plainButton, sectionTitle, type DashboardProps } from "../parts";
import { todayLine } from "./line";

/*
 * Premium+ as an open journal. Phones: two stacked pages. From lg the pages
 * meet at a soft centre gutter (each fades to --tier-bg at the spine) and
 * stretch to the same height. Each page keeps its own --shadow-card: in dark
 * mode that is an inset top highlight, which a shared wrapper would lose
 * under the pages' opaque surfaces.
 */
const page = "flex min-w-0 flex-col rounded-[1.125rem] bg-[var(--tier-surface)] p-5 shadow-[var(--shadow-card)] sm:p-8 lg:p-10";

export function Spread(props: DashboardProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-0">
      <DialPage {...props} />
      <JournalPage {...props} />
    </div>
  );
}

/**
 * Left page: where you are, in one sentence, and one-tap logging. Top-aligned,
 * so QuickLog sits right under the sentence however tall the journal grows.
 */
function DialPage({ ring, today, openPeriod, insights }: DashboardProps) {
  return (
    <section
      aria-labelledby="dial-heading"
      className={`${page} lg:rounded-r-none lg:bg-[linear-gradient(to_left,var(--tier-bg),transparent_2.5rem)]`}
    >
      <h2 id="dial-heading" className="sr-only">
        Your cycle today
      </h2>
      <div className="flex flex-col items-center text-center">
        {ring ? (
          <>
            <CycleRing data={ring} className="size-52 sm:size-60" />
            <ul role="list" className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[12px] text-[var(--label-secondary)]">
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
          </>
        ) : null}
        {/* The screen's one serif moment. */}
        <p className="mt-7 max-w-[26ch] text-balance font-serif text-[1.625rem] leading-[1.25] tracking-[-0.01em] text-[var(--tier-ink)] sm:text-[1.875rem]">
          {todayLine({ ring, dayOfCycle: insights.dayOfCycle, periodDay: openPeriod?.day ?? null, phase: insights.phase })}
        </p>
      </div>
      {/* QuickLog sits in the page as a recessed well rather than a second card. */}
      <div className="mt-8 [&>section]:bg-[var(--tier-bg)]! [&>section]:shadow-none!">
        <QuickLog today={today} openPeriod={openPeriod} />
      </div>
    </section>
  );
}

const noteDate = "text-[15px] font-medium tabular-nums text-[var(--label-secondary)]";
const noteDay = "text-[13px] tabular-nums text-[var(--label-secondary)]";
/* Hairline inset to the note column (4.5rem date + 1rem gap), as in grouped lists. 0.5px renders as one device pixel. */
const noteRow =
  "relative grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 py-3 not-first:before:absolute not-first:before:left-[5.5rem] not-first:before:right-0 not-first:before:top-0 not-first:before:border-t-[0.5px] not-first:before:border-[var(--separator)] not-first:before:content-['']";

/** Right page: this cycle's notes, the estimates, and a quiet look back. */
function JournalPage(props: DashboardProps) {
  const { insights, cycles, ring, nextPeriodDate, nextPeriodWindow, forecastStatus, nextOvulationWindow, ovulationNote } = props;
  const { phase } = insights;
  const phaseKey = phase?.key;
  // In these phases the ovulation estimate is behind today.
  const ovulationPassed = phaseKey === "luteal" || phaseKey === "late";
  const notes = insights.cycleNotes;
  const since = cycles[0]?.mStart;
  const footnote = [props.forecastBasis, ...props.forecastCaveats.slice(0, 2)].join(" ");

  return (
    <section
      aria-labelledby="journal-heading"
      className={`${page} lg:rounded-l-none lg:bg-[linear-gradient(to_right,var(--tier-bg),transparent_2.5rem)]`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 id="journal-heading" className={sectionTitle}>
          This cycle
        </h2>
        {/* Where today sits in it, as Free and Premium show. The left page's sentence already says "period" or "later than usual". */}
        {phase && phaseKey !== "period" && phaseKey !== "late" ? <PhaseChip phase={phase} /> : null}
      </div>
      {since ? (
        <p className="mt-0.5 text-[15px] text-[var(--label-secondary)]">Since {longDate(since, { month: "long", day: "numeric" })}</p>
      ) : null}

      {notes.length > 0 ? (
        <ol role="list" className="mt-4">
          {notes.map((n, i) => (
            <li key={`${n.date}-${i}`} className={noteRow}>
              <p className="flex flex-col">
                <time dateTime={n.date} className={noteDate}>
                  {longDate(n.date, { month: "short", day: "numeric" })}
                </time>
                <span className={noteDay}>Day {n.cycleDay}</span>
              </p>
              <p className="text-[17px] leading-snug text-[var(--tier-ink)] [overflow-wrap:anywhere] first-letter:uppercase">{n.text}</p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-4 rounded-[0.875rem] bg-[var(--fill-tertiary)] px-4 py-4">
          <p className="text-[17px] font-semibold text-[var(--tier-ink)]">Nothing written yet</p>
          <p className="mt-1 text-[15px] leading-snug text-[var(--label-secondary)]">
            {since
              ? "Tell Luna how today feels, like “tired and a little crampy,” and she’ll keep it here, a line at a time."
              : "Once your first period is logged, anything you tell Luna about how you feel gathers here."}
          </p>
          <Link href="/chat" className={`${plainButton} -ml-4 mt-1`}>
            Write to Luna
          </Link>
        </div>
      )}

      <div className="hairline-t mt-8 pt-6">
        {/* Time-neutral: the ovulation estimate can already be behind today. */}
        <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--tier-ink)]">Estimates</h3>
        <dl className="mt-3 space-y-4">
          <div>
            <dt className="flex items-center gap-2 text-[15px] font-semibold text-[var(--tint)]">
              {ring ? (
                <>
                  <RingSwatch kind="estimated" /> Next period, estimated
                </>
              ) : (
                "Next period"
              )}
            </dt>
            <dd className="mt-1 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-[var(--tier-ink)]">{nextPeriodDate}</dd>
            {nextPeriodWindow ? <dd className="mt-0.5 text-[15px] text-[var(--label-secondary)]">{nextPeriodWindow}</dd> : null}
            {/* The same status Free and Premium show: the narrower in-window range, the late and
                long-gap "log it if it came" prompts, first-log guidance. On a period, the sentence and QuickLog say it. */}
            {forecastStatus && phaseKey !== "period" ? (
              <dd className="mt-2 text-[15px] leading-snug text-[var(--label-secondary)]">{forecastStatus}</dd>
            ) : null}
          </div>
          <div>
            <dt className="flex items-center gap-2 text-[15px] font-semibold text-[var(--tint)]">
              {nextOvulationWindow ? (
                <>
                  <RingSwatch kind="ovulation" /> Ovulation, estimated
                </>
              ) : (
                "Ovulation"
              )}
            </dt>
            <dd className="mt-1 text-[17px] font-semibold text-[var(--tier-ink)]">{nextOvulationWindow ?? "Not estimated"}</dd>
            <dd className="mt-0.5 text-[13px] leading-snug text-[var(--label-secondary)]">
              {nextOvulationWindow
                ? `${ovulationPassed ? "Earlier this cycle. " : ""}Rough calendar estimate, not confirmed ovulation`
                : (ovulationNote ?? "There is not enough suitable information for a useful estimate.")}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-[13px] leading-snug text-[var(--label-tertiary)]">{footnote}</p>
      </div>

      {insights.circleBack.length > 0 ? (
        <aside aria-labelledby="circle-back-heading" className="mt-8 border-l-2 border-[var(--separator)] pl-4">
          <h3 id="circle-back-heading" className="text-[15px] font-semibold text-[var(--label-secondary)]">
            Around this day in earlier cycles
          </h3>
          <ul role="list" className="mt-2 space-y-2.5">
            {insights.circleBack.map((n, i) => (
              <li key={`${n.date}-${i}`}>
                <p className="text-[15px] leading-snug text-[var(--tier-ink)] [overflow-wrap:anywhere] first-letter:uppercase">{n.text}</p>
                <p className={noteDay}>
                  <time dateTime={n.date}>{longDate(n.date, { month: "short", day: "numeric" })}</time>, day {n.cycleDay}
                </p>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </section>
  );
}
