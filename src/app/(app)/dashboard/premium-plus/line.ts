import type { CycleRingData } from "../CycleRing";
import type { PhaseInfo } from "@/lib/dashboard/insights";

const within = (from: number, to: number) =>
  from !== to ? `in ${from} to ${to} days` : from === 1 ? "tomorrow" : `in ${from} days`;

/**
 * The Premium+ left page's one serif sentence. Built only from what the
 * dashboard already knows; never a guess the forecast didn't make. The dial
 * shows the cycle day, so the sentence only names it when there is no dial.
 */
export function todayLine({
  ring,
  dayOfCycle,
  periodDay,
  phase,
}: {
  ring: CycleRingData | null;
  dayOfCycle: number | null;
  /** Day of an open (unended) period, if any. */
  periodDay: number | null;
  phase: PhaseInfo | null;
}): string {
  // Only the forecast decides "on your period": an open period with no logged
  // end can outlast it, and QuickLog below already asks whether it stopped.
  if (phase?.key === "period") {
    const n = periodDay ?? dayOfCycle;
    return ring || n == null ? "You're on your period. Go gently." : `Day ${n} of your period. Go gently.`;
  }
  if (dayOfCycle == null) return "Log when your last period started, and this page will start to learn your rhythm.";
  if (!ring) return `Day ${dayOfCycle} of your cycle.`;
  // Window offsets are 0-based from the last start; ring.day is 1-based.
  const from = ring.window.start - (ring.day - 1);
  const to = ring.window.end - (ring.day - 1);
  // True for both a long cycle and a period that went unlogged ("late" and "long-gap").
  if (phase?.key === "late" || to < 0) return "No new period logged yet. That's later than usual for you.";
  if (from > 0) return `Your next period will likely come ${within(from, to)}.`;
  return "You're in your likely window, so it could start any day now.";
}
