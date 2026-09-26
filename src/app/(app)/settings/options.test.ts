import { describe, expect, it } from "vitest";
import { canonicalZone, normalizeConditions, perimenoStageFor, timeZoneOptions, toggleCondition } from "./options";

describe("settings condition options", () => {
  it("folds legacy perimenopause into one chip, like the forecast", () => {
    expect(normalizeConditions(["pcos", "perimenopause"], "late")).toEqual(["pcos", "perimenopause_late"]);
    expect(normalizeConditions(["perimenopause"], "unknown")).toEqual(["perimenopause_early"]);
    expect(normalizeConditions(["perimenopause", "perimenopause_early", "pcos", "pcos"], "late")).toEqual([
      "pcos",
      "perimenopause_early",
    ]);
  });

  it("keeps early and late perimenopause mutually exclusive", () => {
    const early = toggleCondition(["pcos"], "perimenopause_early");
    const late = toggleCondition(early, "perimenopause_late");
    expect(late).toEqual(["pcos", "perimenopause_late"]);
    expect(perimenoStageFor(late)).toBe("late");
    expect(perimenoStageFor(toggleCondition(late, "perimenopause_late"))).toBeUndefined();
  });

  it("treats none as exclusive", () => {
    expect(toggleCondition(["pcos", "thyroid"], "none")).toEqual(["none"]);
    expect(toggleCondition(["none"], "pcos")).toEqual(["pcos"]);
  });

  it("keeps an unlisted saved time zone selectable", () => {
    const opts = timeZoneOptions("Mars/Olympus_Mons");
    expect(opts[0].value).toBe("Mars/Olympus_Mons");
    expect(opts.some((o) => o.value === "UTC")).toBe(true);
    expect(timeZoneOptions("UTC").some((o) => o.value === "Mars/Olympus_Mons")).toBe(false);
  });

  it("lists a saved zone once, even when the engine spells it differently", () => {
    // V8 knows India as Asia/Calcutta; others as Asia/Kolkata. Either way, one entry.
    const opts = timeZoneOptions("Asia/Kolkata");
    const india = opts.filter((o) => canonicalZone(o.value) === canonicalZone("Asia/Kolkata"));
    expect(india.map((o) => o.value)).toEqual(["Asia/Kolkata"]);
    expect(canonicalZone("Asia/Calcutta")).toBe(canonicalZone("Asia/Kolkata"));
  });
});
