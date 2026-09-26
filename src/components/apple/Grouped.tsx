import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/** iOS inset grouped list section: small caps header, rounded surface, footnote. */
export function GroupedSection({
  header,
  footer,
  children,
  className = "",
  id,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} aria-label={typeof header === "string" ? header : undefined} className={className}>
      {header ? (
        <h2 className="px-4 pb-1.5 text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--label-tertiary)]">
          {header}
        </h2>
      ) : null}
      <div className="grouped overflow-hidden">{children}</div>
      {footer ? <p className="px-4 pt-1.5 text-[13px] leading-snug text-[var(--label-tertiary)]">{footer}</p> : null}
    </section>
  );
}

function Chevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 8 14"
      className="h-3.5 w-2 shrink-0 text-[var(--label-tertiary)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m1 1 6 6-6 6" />
    </svg>
  );
}

const ROW =
  "group relative flex w-full items-center gap-3 pl-4 text-left " +
  "not-first:before:absolute not-first:before:right-0 not-first:before:top-0 not-first:before:left-[var(--inset)] " +
  "not-first:before:border-t not-first:before:border-[var(--separator)] not-first:before:content-['']";
const INTERACTIVE =
  "cursor-pointer transition-colors duration-150 active:bg-[var(--fill-tertiary)] hover:bg-[color-mix(in_oklch,var(--fill-tertiary)_60%,transparent)]";

/**
 * One row. Renders a link, a button or plain content. Rows after the first get
 * an inset hairline aligned with the label, like UIKit.
 */
export function GroupedRow({
  icon,
  label,
  detail,
  value,
  href,
  onClick,
  chevron,
  tone = "default",
}: {
  icon?: ReactNode;
  label: ReactNode;
  detail?: ReactNode;
  value?: ReactNode;
  href?: string;
  onClick?: () => void;
  chevron?: boolean;
  tone?: "default" | "destructive" | "accent";
}) {
  const color =
    tone === "destructive"
      ? "text-[var(--danger)]"
      : tone === "accent"
        ? "text-[var(--tint)]"
        : "text-[var(--tier-ink)]";
  const inner = (
    <>
      {icon ? <span className="flex size-7 shrink-0 items-center justify-center">{icon}</span> : null}
      <span className="relative flex min-h-11 min-w-0 flex-1 items-center gap-3 py-2.5 pr-4">
        <span className="min-w-0 flex-1">
          <span className={`block text-[17px] leading-snug tracking-[-0.01em] ${color}`}>{label}</span>
          {detail ? <span className="mt-0.5 block text-[13px] leading-snug text-[var(--label-secondary)]">{detail}</span> : null}
        </span>
        {value ? <span className="shrink-0 text-right text-[17px] tabular-nums text-[var(--label-secondary)]">{value}</span> : null}
        {chevron || href ? <Chevron /> : null}
      </span>
    </>
  );
  const style = { "--inset": icon ? "3.75rem" : "1rem" } as CSSProperties;
  if (href) {
    return (
      <Link href={href} className={`${ROW} ${INTERACTIVE}`} style={style}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${ROW} ${INTERACTIVE}`} style={style}>
        {inner}
      </button>
    );
  }
  return (
    <div className={ROW} style={style}>
      {inner}
    </div>
  );
}

/** A rounded-square, SF-style icon tile for grouped rows. */
export function RowIcon({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span aria-hidden className="flex size-7 items-center justify-center rounded-[7px] text-[var(--tier-surface)]" style={{ background: color }}>
      {children}
    </span>
  );
}
