"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { spring } from "@/lib/motion";

/** iOS segmented control: a sliding thumb over equal segments. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className = "",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`relative grid rounded-[9px] bg-[var(--fill-tertiary)] p-0.5 ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className="relative min-h-8 cursor-pointer rounded-[7px] px-3 text-[13px] font-medium text-[var(--tier-ink)]"
          >
            {selected ? (
              <motion.span
                layoutId={`${id}-thumb`}
                transition={spring.snappy}
                className="absolute inset-0 rounded-[7px] bg-[var(--tier-surface)] shadow-[0_3px_8px_rgba(0,0,0,0.08),0_1px_1px_rgba(0,0,0,0.04)]"
              />
            ) : null}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
