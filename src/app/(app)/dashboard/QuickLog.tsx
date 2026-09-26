"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export interface OpenPeriod {
  id: string;
  mStart: string;
  day: number; // 1-based day of bleeding
}

const primary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--tier-ink)] px-7 text-[11px] font-semibold uppercase tracking-widest text-[var(--tier-surface)] transition-colors duration-150 hover:opacity-90 disabled:opacity-50 cursor-pointer";
const ghost =
  "text-xs font-medium text-[var(--tier-muted)] underline-offset-4 hover:text-[var(--tier-ink)] hover:underline cursor-pointer";
const dateInput =
  "min-h-11 rounded-2xl border border-[var(--tier-line)] bg-[var(--tier-surface)] px-4 text-sm text-[var(--tier-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--tier-accent)]";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** One-tap period logging, backed by /api/cycles (same validation as chat). */
export default function QuickLog({ today, openPeriod }: { today: string; openPeriod: OpenPeriod | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const [date, setDate] = useState(today);

  const ending = openPeriod !== null;

  const submit = async (iso: string) => {
    setBusy(true);
    setError("");
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
      router.refresh();
    } catch {
      setError("You seem to be offline. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-labelledby="quick-log-heading"
      className="rounded-3xl border border-[var(--tier-line)] bg-[var(--tier-surface)] p-6 sm:p-8"
    >
      <p id="quick-log-heading" className="text-[10px] font-semibold uppercase tracking-widest text-[var(--tier-muted)]">
        {ending ? `Period · day ${openPeriod.day}` : "Log"}
      </p>
      <p className="mt-2 font-serif text-xl font-light text-[var(--tier-ink)]">
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
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <button type="button" disabled={busy} onClick={() => submit(today)} className={primary}>
            {busy ? "Saving…" : ending ? "It ended today" : "It started today"}
          </button>
          <button
            type="button"
            className={ghost}
            onClick={() => {
              setDate(today);
              setPicking(true);
            }}
          >
            Another day
          </button>
        </div>
      )}

      <p role="status" aria-live="polite" className="mt-3 min-h-4 text-xs text-[#B4485F]">
        {error}
      </p>
    </section>
  );
}
