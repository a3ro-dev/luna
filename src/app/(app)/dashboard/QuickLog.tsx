"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Sheet } from "@/components/apple/Sheet";
import { spring } from "@/lib/motion";
import { card, longDate, plainButton, primaryButton } from "./parts";

export interface OpenPeriod {
  id: string;
  mStart: string;
  day: number; // 1-based day of bleeding
}

/* The shared destructive red, softened toward ink: >= 4.5:1 on day and night surfaces. */
const ERROR = "text-[color-mix(in_oklch,var(--destructive)_55%,var(--tier-ink))]";
/* A quiet inline question, recessed into the card. */
const ASK = "mt-3 rounded-[14px] bg-[var(--fill-tertiary)] p-4";
const SMALL_PRIMARY = `${primaryButton} min-h-11 px-5 text-[15px]`;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const shortDate = (iso: string) => longDate(iso, { month: "short", day: "numeric" });

/** From POST /api/cycles when a new start lands within 15 days of another one. */
interface CloseStart {
  iso: string;
  existingStart: string;
  days: number;
}
/** From POST /api/cycles when the gap before the new start looks like a missed log. */
interface MissedLog {
  gapDays: number;
  suggestedStart: string;
  earliest: string;
  latest: string;
}

/**
 * One-tap period logging, backed by /api/cycles (same validation as chat). It
 * asks two gentle questions at logging time, because logging mistakes, not the
 * model, carry most of the forecast's error (autoresearch R4-1): "same period?"
 * for a start close to another, and "did one go unlogged?" after a long gap.
 */
export default function QuickLog({ today, openPeriod }: { today: string; openPeriod: OpenPeriod | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // "log": the Another day sheet; "missed": adding a period that went unlogged.
  const [sheet, setSheetState] = useState<null | "log" | "missed">(null);
  const [date, setDate] = useState(today);
  const [closeStart, setCloseStart] = useState<CloseStart | null>(null);
  const [missed, setMissed] = useState<MissedLog | null>(null);

  const ending = openPeriod !== null;
  const busy = saving || refreshing;
  const picking = sheet !== null;
  const backfill = sheet === "missed" && missed !== null ? missed : null;

  const submit = async (iso: string, { confirmed = false, isBackfill = false } = {}) => {
    const kind = ending && !isBackfill ? "end" : "start";
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res =
        kind === "end"
          ? await fetch(`/api/cycles/${openPeriod!.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mEnd: iso }),
            })
          : await fetch("/api/cycles", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(confirmed ? { mStart: iso, confirmedSeparatePeriod: true } : { mStart: iso }),
            });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.confirm) {
        setSheetState(null);
        setCloseStart({ iso, existingStart: data.confirm.existingStart, days: data.confirm.days });
        return;
      }
      if (!res.ok) {
        setError(data.error ? capitalize(data.error) : "Couldn't save that. Please try again.");
        return;
      }
      setSheetState(null);
      setCloseStart(null);
      setMissed(kind === "start" && !isBackfill ? (data.missedLog ?? null) : null);
      setNotice(
        isBackfill
          ? "Added. Your forecast now counts that cycle."
          : kind === "end"
            ? "Saved. Your period end is logged."
            : "Saved. Your period start is logged.",
      );
      // Keep the button busy until the refreshed forecast has rendered.
      startRefresh(() => router.refresh());
    } catch {
      setError("You seem to be offline. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // An old error (e.g. from "It started today") never follows the sheet open or closed.
  const setSheet = (next: null | "log" | "missed") => {
    setSheetState(next);
    setError("");
  };

  return (
    <section aria-labelledby="quick-log-heading" aria-busy={busy} className={`${card} p-5 sm:p-6`}>
      {ending ? (
        <p className="mb-0.5 text-[13px] font-medium text-[var(--label-secondary)]">Period, day {openPeriod.day}</p>
      ) : null}
      <h2
        id="quick-log-heading"
        className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-[var(--tier-ink)]"
      >
        {ending ? "Has your period stopped?" : "Did your period start?"}
      </h2>

      <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
        <button type="button" disabled={busy} onClick={() => submit(today)} className={`${primaryButton} w-full sm:w-auto`}>
          {busy && !picking ? "Saving…" : ending ? "It ended today" : "It started today"}
        </button>
        <button
          type="button"
          className={plainButton}
          onClick={() => {
            setDate(today);
            setNotice("");
            setCloseStart(null);
            setSheet("log");
          }}
        >
          Another day
        </button>
      </div>

      {/* Always mounted so it announces; takes no space while empty. */}
      <p role="status" aria-live="polite" className="mt-3 text-[15px] empty:mt-0">
        {error && !picking ? (
          <span className={ERROR}>{error}</span>
        ) : notice ? (
          <span className="inline-flex items-center gap-1.5 text-[var(--label-secondary)]">
            {/* A logged period is a small moment: the check lands with a little bounce. */}
            <motion.svg
              key={notice}
              aria-hidden
              viewBox="0 0 20 20"
              className="size-5 shrink-0 text-[var(--tint)]"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={spring.bouncy}
            >
              <circle cx="10" cy="10" r="9" fill="currentColor" />
              <path d="m6 10.2 2.6 2.6L14 7.4" fill="none" stroke="var(--tier-surface)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
            {notice}
          </span>
        ) : null}
      </p>

      {closeStart ? (
        <div role="group" aria-label="Same period?" className={ASK}>
          <p className="text-[15px] leading-snug text-[var(--tier-ink)]">
            {`You already logged a period starting ${shortDate(closeStart.existingStart)}, ${closeStart.days} ` +
              `${closeStart.days === 1 ? "day" : "days"} from this one. Is this a separate period?`}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" disabled={busy} onClick={() => submit(closeStart.iso, { confirmed: true })} className={SMALL_PRIMARY}>
              Yes, log it
            </button>
            <button type="button" className={`${plainButton} text-[15px]`} onClick={() => setCloseStart(null)}>
              No, it&apos;s the same one
            </button>
          </div>
        </div>
      ) : null}

      {missed && !picking ? (
        <div role="group" aria-label="A period that may not have been logged" className={ASK}>
          <p className="text-[15px] leading-snug text-[var(--tier-ink)]">
            {`It's been ${missed.gapDays} days since the period before this one, longer than usual for you. ` +
              "Did you have one in between that didn't get logged?"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={SMALL_PRIMARY}
              onClick={() => {
                setDate(missed.suggestedStart);
                setSheet("missed");
              }}
            >
              Add it
            </button>
            <button type="button" className={`${plainButton} text-[15px]`} onClick={() => setMissed(null)}>
              No, it was one long cycle
            </button>
          </div>
        </div>
      ) : null}

      <Sheet
        open={picking}
        onOpenChange={(open) => {
          if (!open) setSheet(null);
        }}
        title={!backfill && ending ? "When did it stop?" : "When did it start?"}
        description={
          backfill
            ? `Roughly is fine. Around ${shortDate(backfill.suggestedStart)} would fit your usual rhythm.`
            : ending
              ? "Pick the last day of your period."
              : "Pick the first day of your period."
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(date, { isBackfill: backfill !== null });
          }}
        >
          <label className="grouped flex min-h-11 items-center justify-between gap-3 px-4">
            <span className="text-[17px] text-[var(--tier-ink)]">{!backfill && ending ? "End date" : "Start date"}</span>
            <input
              type="date"
              required
              value={date}
              min={backfill ? backfill.earliest : ending ? openPeriod.mStart : undefined}
              max={backfill ? backfill.latest : today}
              onChange={(e) => setDate(e.target.value)}
              className="min-h-11 min-w-0 bg-transparent text-right text-[17px] tabular-nums text-[var(--tint)] outline-offset-2"
            />
          </label>
          {error ? (
            <p role="alert" className={`mt-3 px-4 text-[15px] leading-snug ${ERROR}`}>
              {error}
            </p>
          ) : null}
          <div className="mt-5 flex gap-3">
            <button type="button" className={`${plainButton} min-h-[50px] flex-1`} onClick={() => setSheet(null)}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className={`${primaryButton} flex-1`}>
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Sheet>
    </section>
  );
}
