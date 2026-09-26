/** Day offsets are 0-based from the last logged start, inclusive. */
export interface CycleRingData {
  /** 1-based cycle day today. */
  day: number;
  /** Days drawn around the ring: day 1 through the end of the likely window (or today, if later). */
  length: number;
  /** Logged bleeding days from day 1: through the logged end, or through today while still open. */
  periodDays: number;
  window: { start: number; end: number };
  ovulation: { start: number; end: number } | null;
}

export const HONEY_LINE = "#D2AE52";

const C = 60;
const R = 50;
const point = (fraction: number, r = R) => {
  const angle = fraction * 2 * Math.PI - Math.PI / 2;
  // Rounded so server and client render identical attributes.
  return [+(C + r * Math.cos(angle)).toFixed(2), +(C + r * Math.sin(angle)).toFixed(2)];
};
const arc = (from: number, to: number) => {
  const span = Math.min(to - from, 0.9999);
  const [x1, y1] = point(from);
  const [x2, y2] = point(from + span);
  return `M${x1} ${y1}A${R} ${R} 0 ${span > 0.5 ? 1 : 0} 1 ${x2} ${y2}`;
};

const dotted = { fill: "none", strokeWidth: 5, strokeDasharray: "0 8.5", strokeLinecap: "round" } as const;
const days = (a: number, b: number) => (a === b ? `day ${a}` : `days ${a} to ${b}`);

/**
 * One cycle as a dial: solid = logged, dotted = estimated. The visible day
 * number is paired with a full text description for screen readers.
 */
export default function CycleRing({ data, className = "" }: { data: CycleRingData; className?: string }) {
  const { day, length, periodDays, window, ovulation } = data;
  const at = (d: number) => d / length;
  const step = length <= 45 ? 1 : 7;
  const [tx, ty] = point(at(day - 0.5));

  return (
    <figure className={`relative ${className}`}>
      <svg viewBox="0 0 120 120" aria-hidden className="size-full overflow-visible">
        <circle cx={C} cy={C} r={R} fill="none" stroke="var(--tier-line)" strokeWidth={7} />
        {Array.from({ length: Math.ceil(length / step) }, (_, i) => {
          const week = (i * step) % 7 === 0;
          const [x1, y1] = point(at(i * step), week ? 38.5 : 41);
          const [x2, y2] = point(at(i * step), 43.5);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={week ? "var(--tier-muted)" : "var(--tier-line)"}
              strokeOpacity={week ? 0.45 : 1}
              strokeWidth={1}
            />
          );
        })}
        {ovulation ? (
          <path d={arc(at(ovulation.start), at(ovulation.end + 1))} stroke={HONEY_LINE} {...dotted} />
        ) : null}
        <path d={arc(at(window.start), at(window.end + 1))} stroke="var(--tier-accent)" {...dotted} />
        <path
          d={arc(0, at(periodDays))}
          fill="none"
          stroke="var(--tier-accent)"
          strokeWidth={7}
          strokeLinecap="round"
        />
        <circle cx={tx} cy={ty} r={5.5} fill="var(--tier-ink)" stroke="var(--tier-surface)" strokeWidth={2.5} />
      </svg>
      <figcaption className="absolute inset-0 flex flex-col items-center justify-center">
        <span aria-hidden className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--tier-muted)]">
          Day
        </span>
        <span aria-hidden className="font-serif text-[2.4rem] leading-none tabular-nums text-[var(--tier-ink)]">
          {day}
        </span>
        <span className="sr-only">
          {`Cycle day ${day}. Logged period: ${days(1, periodDays)}. Likely next start, estimated: ${days(
            window.start + 1,
            window.end + 1,
          )}.${ovulation ? ` Ovulation, estimated: ${days(ovulation.start + 1, ovulation.end + 1)}.` : ""}`}
        </span>
      </figcaption>
    </figure>
  );
}

/** Legend swatch matching the ring's solid (logged) and dotted (estimated) strokes. */
export function RingSwatch({ kind }: { kind: "logged" | "estimated" | "ovulation" }) {
  return (
    <svg aria-hidden viewBox="0 0 22 8" className="h-2 w-[22px] shrink-0">
      {kind === "logged" ? (
        <line x1="4" y1="4" x2="18" y2="4" stroke="var(--tier-accent)" strokeWidth={6} strokeLinecap="round" />
      ) : (
        <line
          x1="3"
          y1="4"
          x2="20"
          y2="4"
          stroke={kind === "ovulation" ? HONEY_LINE : "var(--tier-accent)"}
          strokeWidth={5}
          strokeDasharray="0 8.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
