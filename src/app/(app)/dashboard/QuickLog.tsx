"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Sheet } from "@/components/apple/Sheet";
import { spring } from "@/lib/motion";
import { card, plainButton, primaryButton } from "./parts";

export interface OpenPeriod {
  id: string;
  mStart: string;
  day: number; // 1-based day of bleeding
}

/* The shared destructive red, softened toward ink: >= 4.5:1 on day and night surfaces. */
const ERROR = "text-[color-mix(in_oklch,var(--destructive)_55%,var(--tier-ink))]";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** One-tap period logging, backed by /api/cycles (same validation as chat). */
export default function QuickLog({ today, openPeriod }: { today: string; openPeriod: OpenPeriod | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [picking, setPicking] = useState(false);
  const [date, setDate] = useState(today);

  const ending = openPeriod !== null;
  const busy = saving || refreshing;

  const submit = async (iso: string) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = ending
        ? await fetch(`/api/cycles/${openPeriod.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mEnd: iso }),
          })
        : await fetch("/api/cycles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mStart: iso }),
          });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ? capitalize(data.error) : "Couldn't save that. Please try again.");
        return;
      }
      setPicking(false);
      setNotice(ending ? "Saved. Your period end is logged." : "Saved. Your period start is logged.");
      // Keep the button busy until the refreshed forecast has rendered.
      startRefresh(() => router.refresh());
    } catch {
      setError("You seem to be offline. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // An old error (e.g. from "It started today") never follows the sheet open or closed.
  const setSheet = (open: boolean) => {
    setPicking(open);
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
            setSheet(true);
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

      <Sheet
        open={picking}
        onOpenChange={setSheet}
        title={ending ? "When did it stop?" : "When did it start?"}
        description={ending ? "Pick the last day of your period." : "Pick the first day of your period."}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(date);
          }}
        >
          <label className="grouped flex min-h-11 items-center justify-between gap-3 px-4">
            <span className="text-[17px] text-[var(--tier-ink)]">{ending ? "End date" : "Start date"}</span>
            <input
              type="date"
              required
              value={date}
              min={ending ? openPeriod.mStart : undefined}
              max={today}
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
            <button type="button" className={`${plainButton} min-h-[50px] flex-1`} onClick={() => setSheet(false)}>
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
