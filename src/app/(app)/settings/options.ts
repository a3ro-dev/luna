// Pure option logic for the settings form, kept apart so it can be tested.

export const CONDITIONS = [
  { id: "pcos", label: "PCOS", description: "Polycystic ovary syndrome" },
  { id: "pcod", label: "PCOD", description: "Polycystic ovarian disease" },
  { id: "endometriosis", label: "Endometriosis", description: "Tissue grows outside the uterus" },
  { id: "thyroid", label: "Thyroid condition", description: "Hypo- or hyperthyroidism" },
  { id: "hormonal_bc", label: "Hormonal birth control", description: "Pill, IUD, implant, shot" },
  { id: "irregular", label: "Irregular cycles", description: "Hard to predict from month to month" },
  { id: "perimenopause_early", label: "Perimenopause, early", description: "Cycles are just starting to shift" },
  { id: "perimenopause_late", label: "Perimenopause, late", description: "Very irregular for a while now" },
  { id: "none", label: "None of these", description: "No known conditions" },
] as const;

const PERIMENO = ["perimenopause_early", "perimenopause_late"];
const KNOWN = new Set<string>(CONDITIONS.map((c) => c.id));

export type PerimenoStage = "early" | "late" | "unknown";

/**
 * Settings used to store one legacy "perimenopause" chip plus a stage, while
 * onboarding stores perimenopause_early / _late. Fold both into one chip the
 * same way the forecast reads them (legacy + anything but "late" = early).
 */
export function normalizeConditions(conditions: string[], stage: PerimenoStage | null): string[] {
  const peri = conditions.includes("perimenopause_late")
    ? "perimenopause_late"
    : conditions.includes("perimenopause_early")
      ? "perimenopause_early"
      : conditions.includes("perimenopause")
        ? stage === "late"
          ? "perimenopause_late"
          : "perimenopause_early"
        : null;
  const rest = [...new Set(conditions)].filter((c) => KNOWN.has(c) && !PERIMENO.includes(c));
  return peri ? [...rest, peri] : rest;
}

/** "none" clears the rest; early and late perimenopause are one choice. */
export function toggleCondition(prev: string[], id: string): string[] {
  if (id === "none") return prev.includes("none") ? [] : ["none"];
  if (prev.includes(id)) return prev.filter((c) => c !== id);
  const exclusive = PERIMENO.includes(id) ? PERIMENO : [];
  return [...prev.filter((c) => c !== "none" && !exclusive.includes(c)), id];
}

/** Matches onboarding: the stage is derived from the chip. */
export function perimenoStageFor(conditions: string[]): "early" | "late" | undefined {
  if (conditions.includes("perimenopause_late")) return "late";
  if (conditions.includes("perimenopause_early")) return "early";
  return undefined;
}

export type ZoneOption = { value: string; label: string };

function zoneLabel(zone: string, now: Date): string {
  const name = zone.replace(/_/g, " ");
  try {
    const offset = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName")?.value;
    return offset ? `${name} (${offset})` : name;
  } catch {
    return name;
  }
}

/**
 * The engine's spelling of a zone. V8 still uses legacy names (Asia/Calcutta,
 * Europe/Kiev), so compare zones through this, never as raw strings.
 */
export function canonicalZone(zone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: zone }).resolvedOptions().timeZone;
  } catch {
    return zone;
  }
}

let baseZones: ZoneOption[] | null = null;

/**
 * Every IANA zone the browser knows, keeping the saved value selectable: it
 * takes over its engine alias's slot (Asia/Kolkata for Asia/Calcutta) rather
 * than appearing twice, and is prepended only when the engine doesn't know it.
 */
export function timeZoneOptions(saved: string): ZoneOption[] {
  if (!baseZones) {
    let zones: string[] = [];
    try {
      zones = Intl.supportedValuesOf("timeZone");
    } catch {
      // ponytail: very old browsers only get UTC + the saved zone
    }
    if (!zones.includes("UTC")) zones = [...zones, "UTC"];
    const now = new Date();
    baseZones = zones.map((value) => ({ value, label: zoneLabel(value, now) }));
  }
  if (!saved || baseZones.some((z) => z.value === saved)) return baseZones;
  const own = { value: saved, label: zoneLabel(saved, new Date()) };
  const canon = canonicalZone(saved);
  return baseZones.some((z) => z.value === canon)
    ? baseZones.map((z) => (z.value === canon ? own : z))
    : [own, ...baseZones];
}

export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

export function localIsoDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
