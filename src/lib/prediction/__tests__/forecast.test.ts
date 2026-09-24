import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
import {
  addDays,
  diffDays,
  forecast,
  predictMetric,
  resolveForecastPrior,
  usableMask,
} from "../forecast";
import {
  getCurrentIsoDate,
  isValidIsoDate,
  normalizeDateInput,
  validateCycleDraft,
} from "../../cycle-tools";

describe("forecast v2 invariants", () => {
  it("does date-only arithmetic across DST and leap-day boundaries", () => {
    expect(diffDays("2024-02-28", "2024-03-01")).toBe(2);
    expect(diffDays("2025-03-08", "2025-03-10")).toBe(2);
    expect(addDays("2024-02-28", 2)).toBe("2024-03-01");
  });

  it("uses the supplied local calendar day rather than the server timezone", () => {
    const instant = new Date("2026-01-01T00:30:00Z");
    expect(getCurrentIsoDate("America/Los_Angeles", instant)).toBe("2025-12-31");
    expect(getCurrentIsoDate("Asia/Kolkata", instant)).toBe("2026-01-01");
  });

  it("does not fabricate a dated forecast when no period is logged", () => {
    const result = forecast([], { conditions: [], today: "2026-06-01" });
    expect(result.status).toBe("no-data");
    expect(result.nextStart).toBeNull();
    expect(result.basis.mostlyPopulation).toBe(true);
  });

  it("keeps sparse-user intervals wide and explicitly population-led", () => {
    const result = forecast(
      [{ mStart: "2026-05-01", mEnd: "2026-05-05" }],
      { conditions: [], today: "2026-05-10" },
    );
    expect(result.basis.intervalsUsed).toBe(0);
    expect(result.basis.mostlyPopulation).toBe(true);
    expect(result.cycleLength!.upper - result.cycleLength!.lower).toBeGreaterThan(8);
  });

  it("does not let one discarded long gap move or narrow the forecast", () => {
    const prior = resolveForecastPrior([]);
    const base = predictMetric([28, 29, 27], prior.cycle, prior.gate, 0.8, "log");
    const contaminated = predictMetric([28, 29, 27, 100], prior.cycle, prior.gate, 0.8, "log");
    expect(contaminated.mean).toBeCloseTo(base.mean, 12);
    expect(contaminated.upper - contaminated.lower).toBeCloseTo(
      base.upper - base.lower,
      12,
    );
    expect(contaminated.nExcluded).toBe(1);
  });

  it("treats repeated long intervals as a possible personal pattern", () => {
    expect(usableMask([28, 62, 58], { min: 15, max: 45 })).toEqual([
      true,
      true,
      true,
    ]);
  });

  it("does not silently move an overdue point forecast forward", () => {
    const result = forecast(
      [
        { mStart: "2026-01-01", mEnd: "2026-01-05" },
        { mStart: "2026-01-29", mEnd: "2026-02-02" },
        { mStart: "2026-02-26", mEnd: "2026-03-02" },
      ],
      { conditions: [], today: "2026-04-10" },
    );
    expect(result.status).toBe("late");
    expect(result.nextStart!.date < "2026-04-10").toBe(true);
    expect(result.ifNotStartedYet).toBeNull();
  });

  it("withholds calendar ovulation for profiles where it is unsuitable", () => {
    const result = forecast(
      [{ mStart: "2026-05-01", mEnd: "2026-05-05" }],
      { conditions: ["hormonal_bc"], today: "2026-05-10" },
    );
    expect(result.ovulation).toBeNull();
    expect(result.ovulationWithheld).toMatch(/birth control/i);
  });
});

describe("cycle input validation", () => {
  it("rejects impossible calendar dates, future dates, duplicates and overlaps", () => {
    expect(isValidIsoDate("2026-02-29")).toBe(false);
    expect(
      validateCycleDraft(
        { mStart: "2026-02-29", mEnd: null },
        [],
        "2026-06-01",
      ),
    ).toMatch(/valid date/);
    expect(
      validateCycleDraft(
        { mStart: "2026-05-03", mEnd: "2026-05-06" },
        [{ mStart: "2026-05-01", mEnd: "2026-05-05" }],
        "2026-06-01",
      ),
    ).toMatch(/overlaps/);
  });

  it("asks rather than guessing ambiguous numeric dates", () => {
    expect(normalizeDateInput("05/09/2026", "UTC").reason).toBe(
      "ambiguous-date",
    );
  });
});
