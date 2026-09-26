import { describe, expect, it } from "vitest";
import { findCloseStart, missedLogSuggestion } from "../log-nudges";

describe("missedLogSuggestion", () => {
  it("suggests the midpoint of a gap about two typical cycles long", () => {
    expect(missedLogSuggestion("2026-01-01", "2026-02-28", 29, true)).toEqual({
      gapDays: 58,
      missed: 1,
      suggestedStart: "2026-01-30",
      earliest: "2026-01-16",
      latest: "2026-02-13",
    });
  });

  it("counts two missed periods in a gap about three cycles long", () => {
    const s = missedLogSuggestion("2026-01-01", "2026-03-30", 29, true);
    expect(s?.missed).toBe(2);
    expect(s?.suggestedStart).toBe("2026-01-30");
  });

  it("stays quiet when the forecast kept the gap (it fits the pattern)", () => {
    expect(missedLogSuggestion("2026-01-01", "2026-02-28", 29, false)).toBeNull();
  });

  it("stays quiet for gaps not clearly longer than usual", () => {
    expect(missedLogSuggestion("2026-01-01", "2026-02-10", 29, true)).toBeNull();
  });

  it("stays quiet without a typical length", () => {
    expect(missedLogSuggestion("2026-01-01", "2026-02-28", Number.NaN, true)).toBeNull();
  });
});

describe("findCloseStart", () => {
  const rows = [{ mStart: "2026-01-01" }, { mStart: "2026-01-30" }];
  it("finds a start within 15 days either side", () => {
    expect(findCloseStart(rows, "2026-01-06")?.mStart).toBe("2026-01-01");
    expect(findCloseStart(rows, "2026-01-20")?.mStart).toBe("2026-01-30");
  });
  it("ignores the same day and far starts", () => {
    expect(findCloseStart(rows, "2026-01-01")).toBeUndefined();
    expect(findCloseStart(rows, "2026-03-01")).toBeUndefined();
  });
});
