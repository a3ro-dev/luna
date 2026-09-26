import React from "react";
import type { CyclePoint } from "@/lib/dashboard/insights";
import { card } from "../parts";

const W = 300;
const H = 64;
const PAD = 8;

/** One sentence that says what the sparkline shows. */
export function lengthSummary(lengths: CyclePoint[]): string {
  const n = lengths.length;
  if (n === 0) return "Once you log two period starts, your cycle lengths show up here.";
  const values = lengths.map((p) => p.length);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const which = n === 1 ? "Your last cycle" : `Your last ${n} cycles`;
  const ran = lo === hi ? `${n === 1 ? "ran" : "each ran"} ${lo} days.` : `ran ${lo} to ${hi} days.`;
  const aside = lengths.filter((p) => p.setAside).length;
  return `${which} ${ran}${aside ? ` ${aside === 1 ? "One was" : `${aside} were`} set aside as unusual.` : ""}`;
}

/*
 * The line is an SVG stretched to the card width (preserveAspectRatio="none",
 * non-scaling stroke). The dots are HTML placed by percentage over it, so they
 * stay round at any width in every engine.
 */
function Sparkline({ lengths }: { lengths: CyclePoint[] }) {
  const values = lengths.map((p) => p.length);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  // At least a 4-day span, so a one-day wobble doesn't look like a swing.
  const span = Math.max(hi - lo, 4);
  const pts = lengths.map((p, i) => ({
    ...p,
    x: PAD + (i * (W - 2 * PAD)) / (lengths.length - 1),
    y: H / 2 - ((p.length - (hi + lo) / 2) / span) * (H - 2 * PAD),
  }));
  const label = `Cycle lengths, oldest to newest: ${lengths
    .map((p) => `${p.length}${p.setAside ? " (set aside)" : ""}`)
    .join(", ")} days.`;
  return (
    <div role="img" aria-label={label} className="relative mt-4 h-16">
      <svg aria-hidden viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
        <polyline
          points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="var(--tint)"
          strokeOpacity={0.45}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {pts.map((p, i) => (
        // Set aside: hollow, like "unknown" elsewhere. The latest point is a touch larger.
        <span
          key={`${p.start}-${i}`}
          aria-hidden
          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${i === pts.length - 1 ? "size-[11px]" : "size-2"} ${
            p.setAside ? "border-2 border-[var(--label-tertiary)] bg-[var(--tier-surface)]" : "bg-[var(--tint)]"
          }`}
          style={{ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` }}
        />
      ))}
    </div>
  );
}

export function CycleLengthCard({ lengths }: { lengths: CyclePoint[] }) {
  return (
    <section aria-labelledby="cycle-length-heading" className={`${card} p-5`}>
      <h2 id="cycle-length-heading" className="text-[15px] font-semibold text-[var(--tint)]">
        Cycle length
      </h2>
      {lengths.length >= 2 ? <Sparkline lengths={lengths} /> : null}
      <p className="mt-3 text-[15px] leading-snug text-[var(--label-secondary)]">{lengthSummary(lengths)}</p>
    </section>
  );
}
