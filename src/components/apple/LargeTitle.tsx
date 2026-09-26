"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * iOS large title: a big bold title that hands off to a compact, translucent
 * bar once it scrolls away. The h1 stays the accessible title; the compact
 * copy is decorative.
 */
export function LargeTitle({
  title,
  eyebrow,
  subtitle,
  leading,
  trailing,
}: {
  title: string;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting), {
      rootMargin: "-56px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div className="sticky top-0 z-30 -mx-4 pt-[env(safe-area-inset-top)] md:-mx-6">
        <div
          aria-hidden
          className={`material hairline-b absolute inset-0 transition-opacity duration-200 ${compact ? "opacity-100" : "opacity-0"}`}
        />
        <div className="relative grid h-11 grid-cols-[1fr_auto_1fr] items-center px-4 md:px-6">
          <div className="flex min-w-0 items-center justify-start">{leading}</div>
          <p
            aria-hidden
            className={`truncate text-[17px] font-semibold tracking-[-0.022em] text-[var(--tier-ink)] transition-opacity duration-200 ${compact ? "opacity-100" : "opacity-0"}`}
          >
            {title}
          </p>
          <div className="flex min-w-0 items-center justify-end">{trailing}</div>
        </div>
      </div>
      <header className="pb-2 pt-1">
        {eyebrow ? (
          <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[var(--label-tertiary)]">{eyebrow}</p>
        ) : null}
        <h1 className="font-display text-[2.125rem] font-bold leading-[1.1] tracking-[-0.026em] text-[var(--tier-ink)]">
          {title}
        </h1>
        {subtitle ? <div className="mt-1 text-[15px] leading-snug text-[var(--label-secondary)]">{subtitle}</div> : null}
      </header>
      <div ref={sentinel} aria-hidden className="h-px" />
    </>
  );
}
