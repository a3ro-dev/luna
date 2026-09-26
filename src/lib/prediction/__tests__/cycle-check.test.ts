import { describe, expect, it } from "vitest";
import { ageOn, cycleCheck } from "../cycle-check";

const starts = (...s: string[]) => s.map((mStart) => ({ mStart, mEnd: null }));
const status = (c: ReturnType<typeof cycleCheck>, id: string) => c.items.find((i) => i.id === id)?.status;

describe("FIGO cycle check", () => {
  const today = "2026-06-30";

  it("reports typical 28-day cycles as typical", () => {
    const c = cycleCheck(starts("2026-02-10", "2026-03-10", "2026-04-07", "2026-05-05", "2026-06-02"), { today, conditions: [], age: 30 });
    expect(status(c, "frequency")).toBe("typical");
    expect(status(c, "regularity")).toBe("typical");
    expect(c.worthMentioning).toBe(false);
  });

  it("uses a 7-day spread at 26-41 and 9 days otherwise", () => {
    // intervals 25, 33, 28 -> spread 8
    const rows = starts("2026-03-01", "2026-03-26", "2026-04-28", "2026-05-26");
    expect(status(cycleCheck(rows, { today, conditions: [], age: 30 }), "regularity")).toBe("outside");
    expect(status(cycleCheck(rows, { today, conditions: [], age: 43 }), "regularity")).toBe("typical");
  });

  it("flags infrequent cycles and long gaps", () => {
    const c = cycleCheck(starts("2025-12-01", "2026-01-20", "2026-03-15"), { today, conditions: [], age: 30 });
    expect(status(c, "frequency")).toBe("outside");
    expect(status(c, "gap")).toBe("outside");
    expect(c.worthMentioning).toBe(true);
  });

  it("flags bleeding longer than 8 days", () => {
    const c = cycleCheck([{ mStart: "2026-06-01", mEnd: "2026-06-09" }], { today, conditions: [], age: 30 });
    expect(status(c, "duration")).toBe("outside");
    const ok = cycleCheck([{ mStart: "2026-06-01", mEnd: "2026-06-08" }], { today, conditions: [], age: 30 });
    expect(status(ok, "duration")).toBe("typical");
  });

  it("ignores intervals older than six months and asks for more data", () => {
    const c = cycleCheck(starts("2025-01-01", "2025-01-29", "2025-02-26", "2026-06-20"), { today, conditions: [], age: 30 });
    expect(status(c, "frequency")).toBe("unknown");
  });

  it("does not apply on hormonal contraception", () => {
    const c = cycleCheck(starts("2026-06-01"), { today, conditions: ["hormonal_bc"], age: 30 });
    expect(c.applicable).toBe(false);
    expect(c.items).toHaveLength(0);
  });

  it("computes age on a date", () => {
    expect(ageOn("2000-07-01", "2026-06-30")).toBe(25);
    expect(ageOn("2000-06-30", "2026-06-30")).toBe(26);
    expect(ageOn(null, "2026-06-30")).toBeNull();
  });
});
