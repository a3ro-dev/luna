"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface OpenPeriod {
  id: string;
  mStart: string;
  day: number; // 1-based day of bleeding
}

const primary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--tier-ink)] px-7 text-[11px] font-semibold uppercase tracking-widest text-[var(--tier-surface)] shadow-[0_12px_24px_rgba(109,90,96,0.18)] transition-[background-color,transform] duration-150 hover:bg-[var(--tier-muted)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:active:scale-100 cursor-pointer";
const ghost =
  "inline-flex min-h-11 items-center px-2 text-sm font-medium text-[var(--tier-muted)] underline-offset-4 transition-colors duration-150 hover:text-[var(--tier-ink)] hover:underline cursor-pointer";
const dateInput =
  "min-h-12 min-w-0 flex-1 basis-44 rounded-2xl border border-[var(--tier-line)] bg-[var(--tier-bg)] px-4 text-base text-[var(--tier-ink)] focus:border-[var(--tier-accent)] sm:flex-none sm:text-sm";

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

  return (
    <section
      aria-labelledby="quick-log-heading"
      aria-busy={busy}
      className="rounded-3xl border border-[var(--tier-line)] bg-[var(--tier-surface)] p-5 shadow-[0_20px_40px_rgba(255,181,192,0.06)] sm:p-7"
    >
      <h2 id="quick-log-heading" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--tier-muted)]">
        {ending ? `Period · day ${openPeriod.day}` : "Log"}
      </h2>
      <p className="mt-2 font-serif text-2xl leading-snug text-[var(--tier-ink)]">
        {ending ? "Has your period stopped?" : "Did your period start?"}
      </p>

      {picking ? (
        <form
          className="mt-5 flex flex-wrap items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit(date);
          }}
        >
          <label className="sr-only" htmlFor="quick-log-date">
            {ending ? "Period end date" : "Period start date"}
          </label>
          <input
            id="quick-log-date"
            type="date"
            required
            value={date}
            min={ending ? openPeriod.mStart : undefined}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className={dateInput}
          />
          <button type="submit" disabled={busy} className={primary}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" className={ghost} onClick={() => setPicking(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => submit(today)}
            className={`${primary} w-full sm:w-auto`}
          >
            {busy ? "Saving…" : ending ? "It ended today" : "It started today"}
          </button>
          <button
            type="button"
            className={ghost}
            onClick={() => {
              setDate(today);
              setNotice("");
              setPicking(true);
            }}
          >
            Another day
          </button>
        </div>
      )}

      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm">
        {error ? (
          <span className="text-[#B4485F]">{error}</span>
        ) : notice ? (
          <span className="text-[var(--tier-muted)]">{notice}</span>
        ) : null}
      </p>
    </section>
  );
}
