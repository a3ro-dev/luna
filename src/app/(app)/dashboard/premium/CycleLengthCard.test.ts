import { describe, expect, it } from "vitest";
import { lengthSummary } from "./CycleLengthCard";

const p = (length: number, setAside = false) => ({ start: "2026-01-01", length, setAside });

describe("lengthSummary", () => {
  it("says what the sparkline shows", () => {
    expect(lengthSummary([])).toMatch(/log two period starts/);
    expect(lengthSummary([p(28)])).toBe("Your last cycle ran 28 days.");
    expect(lengthSummary([p(28), p(28)])).toBe("Your last 2 cycles each ran 28 days.");
    expect(lengthSummary([p(29), p(27), p(30)])).toBe("Your last 3 cycles ran 27 to 30 days.");
    expect(lengthSummary([p(29), p(61, true)])).toBe("Your last 2 cycles ran 29 to 61 days. One was set aside as unusual.");
  });
});
