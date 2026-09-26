import React from "react";
import { GroupedRow, GroupedSection } from "@/components/apple/Grouped";
import type { NoteEntry } from "@/lib/dashboard/insights";
import { longDate } from "../parts";

/* GroupedRow draws its hairline only when it isn't a first child, so each <li> draws it (as in RecentCycles). */
const ITEM =
  "relative not-first:before:absolute not-first:before:left-4 not-first:before:right-0 not-first:before:top-0 not-first:before:border-t not-first:before:border-[var(--separator)] not-first:before:content-['']";

/**
 * What the user noted around this same cycle day in earlier cycles, word for
 * word. Empty, it teaches what will show up here.
 */
export function CirclingBack({ notes, dayOfCycle, today }: { notes: NoteEntry[]; dayOfCycle: number | null; today: string }) {
  const cycleName = (start: string) =>
    longDate(start, start.slice(0, 4) === today.slice(0, 4) ? { month: "long" } : { month: "long", year: "numeric" });
  return (
    <GroupedSection
      header="Circling back"
      footer={notes.length > 0 && dayOfCycle != null ? `What you noted around day ${dayOfCycle} in earlier cycles.` : undefined}
    >
      {notes.length > 0 ? (
        <ul role="list">
          {notes.map((n, i) => (
            <li key={`${n.date}-${i}`} className={ITEM}>
              <GroupedRow
                label={<span className="block [overflow-wrap:anywhere] first-letter:uppercase">{n.text}</span>}
                detail={`Day ${n.cycleDay}, ${cycleName(n.cycleStart)} cycle`}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-[15px] leading-snug text-[var(--label-secondary)]">
          Notes you add to a day come back here next cycle.
        </p>
      )}
    </GroupedSection>
  );
}
