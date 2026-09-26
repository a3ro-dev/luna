import React from "react";
import type { UserPlan } from "@/lib/theme/accent";

// Error ink: #B45A75 dips under 4.5:1 on the tier backgrounds, #9E4A63 does not.
export const errorText = "text-[#9E4A63]";

export type SaveState = "idle" | "saving" | "saved" | "error";

export const inputClass =
  "block min-h-12 w-full min-w-0 rounded-2xl border border-[var(--tier-line)] bg-[var(--tier-bg)] px-4 py-3 text-base text-[var(--tier-ink)] transition-colors duration-150 placeholder:text-[var(--tier-muted)] hover:border-[var(--tier-accent)] focus:border-[var(--tier-accent)] disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-[#9E4A63]";

export const labelClass =
  "mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tier-muted)]";

export const secondaryButtonClass =
  "inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-[var(--tier-line)] px-5 text-sm font-semibold text-[var(--tier-ink)] transition-colors duration-150 hover:bg-[var(--tier-tint)] active:scale-[0.98] motion-reduce:active:scale-100";

/** id + aria wiring for a control inside <Field>. */
export function describedBy(id: string, error?: string, hint?: React.ReactNode) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}

export function Field({
  id,
  label,
  hint,
  error,
  className = "",
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className={`mt-2 text-sm ${errorText}`}>
          {error}
        </p>
      ) : hint ? (
        <div id={`${id}-hint`} className="mt-2 text-sm leading-snug text-[var(--tier-muted)]">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export function Section({
  id,
  title,
  description,
  tier,
  danger = false,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  tier: UserPlan;
  danger?: boolean;
  children: React.ReactNode;
}) {
  // Premium+ reads like a journal spread on wide screens: heading left, fields right.
  const split = tier === "premium+";
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`scroll-mt-8 rounded-[1.75rem] border bg-[var(--tier-surface)] p-5 shadow-[0_20px_40px_rgba(255,181,192,0.06)] sm:rounded-[2.25rem] sm:p-8 ${
        danger ? "border-[#B45A75]/30" : "border-[var(--tier-line)]"
      } ${split ? "lg:grid lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:gap-12 lg:p-10" : ""}`}
    >
      <header className="mb-6 min-w-0">
        <h2
          id={`${id}-title`}
          className={`font-serif text-[1.75rem] leading-tight tracking-tight ${danger ? errorText : ""}`}
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-[var(--tier-muted)]">{description}</p>
        )}
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** Selectable card. The dot fills like a full moon when chosen. */
export function Chip({
  pressed,
  onClick,
  label,
  description,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="flex min-h-14 w-full min-w-0 items-start gap-3 rounded-2xl border border-[var(--tier-line)] bg-[var(--tier-bg)] px-4 py-3 text-left transition-colors duration-150 hover:border-[var(--tier-accent)] aria-pressed:border-[var(--tier-accent)] aria-pressed:bg-[var(--tier-tint)]"
    >
      <span
        aria-hidden
        className={`mt-1 size-3.5 shrink-0 rounded-full border-[1.5px] border-[var(--tier-ink)] transition-colors duration-200 ${
          pressed ? "bg-[var(--tier-ink)]" : "bg-transparent"
        }`}
      />
      <span className="min-w-0">
        <span className="block text-[0.95rem] leading-snug text-[var(--tier-ink)]">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs leading-snug text-[var(--tier-muted)]">{description}</span>
        )}
      </span>
    </button>
  );
}

/** Submit button plus a polite live region for saving / saved / error. */
export function SaveRow({
  label,
  busyLabel = "Saving...",
  savedLabel = "Saved",
  state,
  message,
  children,
}: {
  label: string;
  busyLabel?: string;
  savedLabel?: string;
  state: SaveState;
  message?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-7 flex flex-col gap-3 border-t border-[var(--tier-line)] pt-5 sm:flex-row sm:flex-wrap sm:items-center">
      <button
        type="submit"
        disabled={state === "saving"}
        className="tier-primary-action w-full px-7 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
      >
        {state === "saving" ? busyLabel : label}
      </button>
      <p role="status" className="flex min-h-5 min-w-0 items-center gap-1.5 text-sm">
        {state === "saved" && (
          <>
            <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
            {savedLabel}
          </>
        )}
        {state === "error" && message && <span className={errorText}>{message}</span>}
      </p>
      {children}
    </div>
  );
}
