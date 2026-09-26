import { describe, expect, it } from "vitest";
import { dayLabel, daysAgo, sessionGroup } from "./dates";

const now = new Date(2026, 8, 26, 9, 41);

describe("chat dates", () => {
  it("counts local calendar days, not 24h spans", () => {
    expect(daysAgo(new Date(2026, 8, 25, 23, 59), now)).toBe(1);
    expect(daysAgo(new Date(2026, 8, 26, 0, 1), now)).toBe(0);
  });

  it("groups sessions like Notes", () => {
    expect(sessionGroup(new Date(2026, 8, 26, 8).toISOString(), now)).toBe("Today");
    expect(sessionGroup(new Date(2026, 8, 25, 8).toISOString(), now)).toBe("Yesterday");
    expect(sessionGroup(new Date(2026, 8, 20, 8).toISOString(), now)).toBe("Previous 7 days");
    expect(sessionGroup(new Date(2026, 8, 19, 8).toISOString(), now)).toBe("Earlier");
    expect(sessionGroup("not a date", now)).toBe("Earlier");
  });

  it("labels days", () => {
    expect(dayLabel(new Date(2026, 8, 26, 7), now)).toBe("Today");
    expect(dayLabel(new Date(2026, 8, 25, 7), now)).toBe("Yesterday");
    expect(dayLabel(new Date("nope"), now)).toBe("");
  });

  it("uses the weekday within a week, then the date, adding the year only when it differs", () => {
    const thisWeek = new Date(2026, 8, 22, 7);
    expect(dayLabel(thisWeek, now)).toBe(thisWeek.toLocaleDateString(undefined, { weekday: "long" }));
    const thisYear = new Date(2026, 8, 12, 7);
    expect(dayLabel(thisYear, now)).toBe(
      thisYear.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    );
    const lastYear = new Date(2025, 8, 12, 7);
    const withYear = dayLabel(lastYear, now);
    expect(withYear).toBe(
      lastYear.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    );
    expect(withYear).toContain("2025");
  });
});
