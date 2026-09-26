"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronsUpDown } from "lucide-react";
import { spring } from "@/lib/motion";

export type SaveState = "idle" | "saving" | "saved" | "error";

/** Error and destructive ink: the theme's destructive red deepened toward the plan ink, so it follows dark mode. */
export const DANGER = "text-[color-mix(in_oklch,var(--destructive)_80%,var(--tier-ink))]";

/** iOS filled button in the plan tint, labelled in the surface colour (>= 4.5:1 on --tint). */
export const primaryButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--tint)] px-5 text-[15px] font-semibold tracking-[-0.01em] text-[var(--tier-surface)] transition-opacity duration-150 active:opacity-75 disabled:cursor-default disabled:opacity-50";

/** iOS plain button: tint text, no chrome (a sheet's Cancel). */
export const plainButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-4 text-[17px] tracking-[-0.01em] text-[var(--tint)] transition-colors duration-150 hover:bg-[var(--fill-tertiary)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent";

/**
 * A borderless field inside a grouped row, like a UITextField. h-8 in a 44px
 * row leaves exactly the room the global 3px + 3px focus ring needs.
 */
export const inputClass =
  "block h-8 w-full min-w-0 rounded-md bg-transparent text-[17px] tracking-[-0.01em] text-[var(--tier-ink)] placeholder:text-[var(--label-tertiary)] disabled:cursor-not-allowed disabled:text-[var(--label-tertiary)]";

// Same inset hairline as GroupedRow, for the rows it can't express (inputs, pickers, checkmarks).
const ROW =
  "relative pl-4 not-first:before:absolute not-first:before:right-0 not-first:before:top-0 not-first:before:left-4 " +
  "not-first:before:border-t not-first:before:border-[var(--separator)] not-first:before:content-['']";
const TAP =
  "cursor-pointer transition-colors duration-150 active:bg-[var(--fill-tertiary)] hover:bg-[color-mix(in_oklch,var(--fill-tertiary)_60%,transparent)]";
const LABEL = "text-[17px] leading-snug tracking-[-0.01em] text-[var(--tier-ink)]";

/** id + aria wiring for a control inside <InputRow>. */
export function describedBy(id: string, error?: string, hint?: ReactNode) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}

/** Label on the left, field on the right, error underneath. */
export function InputRow({
  id,
  label,
  error,
  labelWidth = "w-24",
  children,
}: {
  id: string;
  label: ReactNode;
  error?: string;
  labelWidth?: string;
  children: ReactNode;
}) {
  return (
    <div className={`${ROW} pr-4`}>
      <div className="flex min-h-11 items-center gap-3">
        <label htmlFor={id} className={`${LABEL} ${labelWidth} shrink-0`}>
          {label}
        </label>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {error ? (
        <p id={`${id}-error`} className={`-mt-1 pb-2.5 text-[13px] leading-snug ${DANGER}`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * iOS pop-up button: the chosen value on the right, the native <select> laid
 * over the whole row so the platform picker opens on tap.
 */
export function PickerRow({
  id,
  label,
  display,
  children,
}: {
  id: string;
  label: string;
  display: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`${ROW} ${TAP} flex min-h-11 items-center gap-3 pr-4 has-[select:focus-visible]:outline-3 has-[select:focus-visible]:-outline-offset-3 has-[select:focus-visible]:outline-[var(--tint)]`}
    >
      <label htmlFor={id} className={`${LABEL} shrink-0`}>
        {label}
      </label>
      <span aria-hidden className="min-w-0 flex-1 truncate text-right text-[17px] text-[var(--label-secondary)]">
        {display}
      </span>
      <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-[var(--label-tertiary)]" />
      {children}
    </div>
  );
}

/** Classes for the <select> inside a PickerRow. */
export const pickerSelectClass = "absolute inset-0 size-full cursor-pointer appearance-none opacity-0";

/** A plain row with a label and a trailing control (segmented, switch). */
export function ControlRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className={`${ROW} flex min-h-11 items-center gap-3 py-1.5 pr-4`}>
      <span className={`${LABEL} min-w-0 flex-1`}>{label}</span>
      {children}
    </div>
  );
}

/** Multi-select list row: a tint checkmark appears on the right when chosen. */
export function CheckRow({
  checked,
  onToggle,
  label,
  detail,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  detail?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onToggle}
      className={`${ROW} ${TAP} flex min-h-11 w-full items-center gap-3 py-2.5 pr-4 text-left`}
    >
      <span className="min-w-0 flex-1">
        <span className={`block ${LABEL}`}>{label}</span>
        {detail ? (
          <span className="mt-0.5 block text-[13px] leading-snug text-[var(--label-secondary)]">{detail}</span>
        ) : null}
      </span>
      <motion.span
        aria-hidden
        initial={false}
        animate={{ opacity: checked ? 1 : 0, scale: checked ? 1 : 0.6 }}
        transition={spring.snappy}
        className="shrink-0 text-[var(--tint)]"
      >
        <Check className="size-5" strokeWidth={2.5} />
      </motion.span>
    </button>
  );
}

/**
 * A full-width action row with no icon. Used for every Sign out row so they
 * share one token red (GroupedRow's destructive tone is a fixed light-mode hex).
 */
export function ButtonRow({
  label,
  onClick,
  tone,
  autoFocus,
}: {
  label: string;
  onClick: () => void;
  tone: "destructive" | "accent";
  autoFocus?: boolean;
}) {
  return (
    <button
      type="button"
      autoFocus={autoFocus}
      onClick={onClick}
      className={`${ROW} ${TAP} flex min-h-11 w-full items-center py-2.5 pr-4 text-left text-[17px] tracking-[-0.01em] ${
        tone === "destructive" ? DANGER : "text-[var(--tint)]"
      }`}
    >
      {label}
    </button>
  );
}

/**
 * iOS switch in the plan tint. The button keeps a 44px target around the 51x31
 * track. Off, the track carries a --label-tertiary edge (>= 3:1 on the surface,
 * WCAG 1.4.11). The knob stays light at night, as on iOS. The colour swaps
 * instantly; only the knob moves, on one spring.
 */
export function Switch({
  checked,
  onChange,
  labelledBy,
  describedById,
}: {
  checked: boolean;
  onChange: () => void;
  labelledBy: string;
  describedById?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedById}
      onClick={onChange}
      className="-my-1.5 inline-flex min-h-11 min-w-14 shrink-0 cursor-pointer items-center justify-center rounded-full"
    >
      <span
        aria-hidden
        className={`relative block h-[31px] w-[51px] rounded-full ${
          checked
            ? "bg-[var(--tint)]"
            : "bg-[color-mix(in_oklch,var(--tier-ink)_24%,var(--tier-surface))] ring-1 ring-inset ring-[var(--label-tertiary)]"
        }`}
      >
        <motion.span
          initial={false}
          animate={{ x: checked ? 20 : 0 }}
          transition={spring.snappy}
          className="absolute left-[2px] top-[2px] size-[27px] rounded-full bg-[var(--tier-surface)] shadow-[var(--shadow-card)] ring-[0.5px] ring-[var(--separator)] dark:bg-[var(--tier-ink)]"
        />
      </span>
    </button>
  );
}

/** Polite live region for one section: saved (tint, with a check) or an error. */
export function StatusText({
  state,
  message,
  savedLabel = "Saved",
  className = "",
}: {
  state: SaveState;
  message?: string;
  savedLabel?: string;
  className?: string;
}) {
  return (
    <p role="status" className={`min-h-5 text-[13px] leading-snug ${className}`}>
      <AnimatePresence mode="wait" initial={false}>
        {state === "saved" ? (
          <motion.span
            key="saved"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={spring.snappy}
            className="inline-flex items-start gap-1 text-[var(--tint)]"
          >
            <Check aria-hidden className="mt-px size-4 shrink-0" strokeWidth={2.5} />
            {savedLabel}
          </motion.span>
        ) : state === "error" && message ? (
          <motion.span
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={spring.snappy}
            className={DANGER}
          >
            {message}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </p>
  );
}

/** Status on the left, a compact Save on the right, under a form's group. */
export function SaveRow({ what, state, message }: { what: string; state: SaveState; message?: string }) {
  return (
    <div className="mt-2.5 flex items-start gap-3 pl-4">
      <StatusText state={state} message={message} className="flex-1 pt-3" />
      <button type="submit" disabled={state === "saving"} className={primaryButton}>
        {state === "saving" ? "Saving…" : "Save"}
        <span className="sr-only"> {what}</span>
      </button>
    </div>
  );
}

/** Apple ID style header: initials, name, email, plan. */
export function IdentityCard({
  name,
  email,
  plan,
  compact = false,
  className = "",
}: {
  name: string;
  email: string;
  plan: string;
  compact?: boolean;
  className?: string;
}) {
  const display = name.trim() || email.split("@")[0];
  return (
    <div className={`grouped flex items-center ${compact ? "gap-3 p-3" : "gap-4 p-4"} ${className}`}>
      <span
        aria-hidden
        className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--tint)] font-semibold tracking-[-0.01em] text-[var(--tier-surface)] ${
          compact ? "size-10 text-[15px]" : "size-[3.75rem] text-[22px]"
        }`}
      >
        {initials(name, email)}
      </span>
      <div className="min-w-0">
        <p
          className={`truncate font-semibold leading-tight text-[var(--tier-ink)] ${
            compact ? "text-[15px] tracking-[-0.01em]" : "font-display text-[22px] tracking-[-0.02em]"
          }`}
        >
          {display}
        </p>
        <p className={`truncate text-[var(--label-secondary)] ${compact ? "text-[13px]" : "mt-0.5 text-[15px]"}`}>
          {email}
        </p>
        {compact ? null : <p className="mt-0.5 text-[13px] font-medium text-[var(--tint)]">{plan}</p>}
      </div>
    </div>
  );
}

export function initials(name: string, email: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = (w?: string) => (w ? Array.from(w)[0] : "");
  const text = words.length
    ? first(words[0]) + (words.length > 1 ? first(words[words.length - 1]) : "")
    : first(email);
  return text.toUpperCase();
}

export const rowClass = `${ROW} ${TAP}`;
