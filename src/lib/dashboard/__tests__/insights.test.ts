import { describe, expect, it } from "vitest";
import { allNotes, circleBack, currentCycleNotes, cycleLengthSeries, estimatedPhase } from "../insights";

const rows = [
  { mStart: "2026-06-01", notes: { "2026-06-02": ["cramps after coffee"], "2026-06-20": ["symptoms: headache"] } },
  { mStart: "2026-06-29", notes: { "2026-06-30": ["tender and quiet"], "2026-07-19": ["tired"] } },
  { mStart: "2026-07-27", notes: { "2026-07-28": ["light day"], "2026-08-02": ["energy returning"] } },
];

describe("dashboard insights", () => {
  it("places notes on their cycle day and tidies chat prefixes", () => {
    const n = allNotes(rows);
    expect(n.find((x) => x.text === "headache")).toMatchObject({ cycleStart: "2026-06-01", cycleDay: 20 });
  });

  it("lists this cycle's notes newest first, up to today", () => {
    expect(currentCycleNotes(rows, "2026-08-01").map((n) => n.text)).toEqual(["light day"]);
    expect(currentCycleNotes(rows, "2026-08-05").map((n) => n.text)).toEqual(["energy returning", "light day"]);
  });

  it("circles back to the same cycle day in earlier cycles, newest first", () => {
    expect(circleBack(rows, 21).map((n) => n.text)).toEqual(["tired", "headache"]);
    expect(circleBack(rows, 2).map((n) => n.text)).toEqual(["tender and quiet", "cramps after coffee"]);
    expect(circleBack(rows, 10)).toEqual([]);
    expect(circleBack(rows, null)).toEqual([]);
  });

  it("builds a cycle-length series oldest first", () => {
    const s = cycleLengthSeries([
      { mStart: "2026-07-27", cycleLength: 28, isAnomaly: false },
      { mStart: "2026-06-01", cycleLength: null, isAnomaly: false },
      { mStart: "2026-06-29", cycleLength: 28, isAnomaly: true },
    ]);
    expect(s.map((p) => [p.start, p.setAside])).toEqual([["2026-06-29", true], ["2026-07-27", false]]);
  });

  it("only names a phase when there is a basis for it", () => {
    const ovulation = { earliest: "2026-08-08", latest: "2026-08-12" };
    expect(estimatedPhase({ status: "upcoming", ovulation, today: "2026-08-05" })?.key).toBe("follicular");
    expect(estimatedPhase({ status: "upcoming", ovulation, today: "2026-08-10" })?.key).toBe("ovulation");
    expect(estimatedPhase({ status: "upcoming", ovulation, today: "2026-08-15" })?.key).toBe("luteal");
    expect(estimatedPhase({ status: "on-period", ovulation, today: "2026-07-28" })).toMatchObject({ key: "period", estimated: false });
    expect(estimatedPhase({ status: "upcoming", ovulation: null, today: "2026-08-05" })).toBeNull();
  });
});
