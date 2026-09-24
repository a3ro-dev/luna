/**
 * Luna forecast model v2 -- a small, explainable Bayesian predictive model.
 *
 * For each metric (cycle length, bleeding length) a person's typical value m
 * is unknown. We put a prior on it from published population data and learn
 * it from their own logged history:
 *
 *   m ~ Normal(mu0, tau0^2)           between-person spread of typical values
 *   x_i | m ~ Normal(m, sigma^2)      within-person cycle-to-cycle variation
 *
 * sigma^2 is itself shrunk toward a population value sigma0^2 with nu0
 * pseudo-observations, so one or two logs can never produce a near-zero
 * spread. The forecast for the NEXT cycle is the posterior predictive:
 *
 *   mean = (mu0/tau0^2 + n*xbar/sigma^2) / (1/tau0^2 + n/sigma^2)
 *   var  = sigma^2 + 1 / (1/tau0^2 + n/sigma^2)
 *
 * i.e. a prediction interval for the next observation (within-person
 * variation + uncertainty about the person's mean), NOT a confidence
 * interval for the mean. Excluding a questionable observation cannot, by
 * itself, make this interval narrower because excluded observations do not
 * count as evidence and the variance floor remains in force.
 *
 * Everything here is pure and deterministic: no DB, no clock. Callers pass
 * `today` (an ISO date in the user's timezone).
 */
import type { ConditionId, PerimenoStage } from "./engine.ts";

export const MODEL_VERSION = "forecast-v2.0.0";

/** Central prediction interval shown to users. */
export const INTERVAL_LEVEL = 0.8;

export interface MetricPrior {
  /** Population mean of personal typical values (days). */
  mean: number;
  /** Between-person SD of personal typical values (days). */
  betweenSd: number;
  /** Typical within-person cycle-to-cycle SD (days). */
  withinSd: number;
}

export interface ForecastPrior {
  cycle: MetricPrior;
  period: MetricPrior;
  /** Luteal length used for the calendar ovulation estimate; null = not estimable. */
  luteal: { mean: number; sd: number } | null;
  /** Intervals outside [min, max] are set aside as uncertain (possible missed or duplicate log). */
  gate: { min: number; max: number };
  /** Reason the calendar ovulation estimate is withheld, if it is. */
  ovulationWithheld: string | null;
  /** Short plain-language caveats for this profile. */
  caveats: string[];
}

// ─── Priors ───────────────────────────────────────────────────────
// See papers/luna-technical.md and papers/references.md for the evidence
// and limits behind these design assumptions.
const BASE: ForecastPrior = {
  // Median cycle 29 d (Najmabadi 2020; Apple WHS 28). Between-person SD of
  // personal means ~4.4 = sqrt(total^2 - within^2) from Bull 2019 / Apple WHS.
  // Within-person SD 4 d (Apple WHS 3.8-5.3 by age, all cycles).
  cycle: { mean: 29, betweenSd: 4, withinSd: 4 },
  // Bleeding 5.2 (Creinin 2004) to 6.2 d (Najmabadi 2020).
  period: { mean: 5.5, betweenSd: 1.1, withinSd: 1 },
  // Luteal 12.4 +/- 2.4 d (Bull 2019, BBT+LH-confirmed ovulatory cycles).
  luteal: { mean: 12.4, sd: 2.4 },
  gate: { min: 15, max: 45 },
  ovulationWithheld: null,
  caveats: [],
};

/**
 * Conditions do not get invented means. Where evidence only says "more
 * variable" or "often longer", we widen spreads and raise the missed-log gate
 * so the person's own data takes over quickly and intervals stay honest.
 */
const CONDITION_ADJUST: Partial<
  Record<ConditionId, Partial<{ mean: number; betweenSd: number; withinSd: number; gateMax: number; withhold: string; caveat: string }>>
> = {
  // No verified population mean +/- SD exists for PCOS cycle length; the
  // often-quoted 51 +/- 15 d comes from n=10 selected for cycles > 35 d.
  pcos: {
    betweenSd: 15, withinSd: 12, gateMax: 120,
    withhold: "with PCOS, ovulation often doesn't follow calendar timing",
    caveat: "PCOS cycles are often long and variable, so ranges are wide.",
  },
  // No evidence PCOD is a distinct phenotype -- same handling as PCOS.
  pcod: {
    betweenSd: 15, withinSd: 12, gateMax: 120,
    withhold: "with PCOD, ovulation often doesn't follow calendar timing",
    caveat: "PCOD cycles are often long and variable, so ranges are wide.",
  },
  irregular: {
    betweenSd: 10, withinSd: 9, gateMax: 90,
    withhold: "with irregular cycles, a calendar ovulation date isn't meaningful",
    caveat: "Irregular cycles vary a lot, so ranges are wide.",
  },
  // Direction only (Krassas 2010); no mean +/- SD published.
  thyroid: {
    betweenSd: 6, withinSd: 6, gateMax: 90,
    withhold: "thyroid conditions can disrupt ovulation timing",
    caveat: "Thyroid conditions can make cycles longer or shorter.",
  },
  // Only an OR for short cycles exists (Wei 2016): no numeric change.
  endometriosis: { caveat: "Endometriosis can come with longer or heavier bleeding." },
  // One option covers every method; prediction is only meaningful for
  // cyclic combined methods, so stay wide and let personal data decide.
  hormonal_bc: {
    betweenSd: 8, withinSd: 8, gateMax: 90,
    withhold: "hormonal birth control usually suppresses ovulation",
    caveat: "On hormonal birth control, bleeds depend on the method -- pill breaks are regular, IUDs, implants and shots often aren't.",
  },
  // Apple WHS within-person SD 5.4 d at 45-49; variability rises before the mean.
  perimenopause_early: {
    betweenSd: 5, withinSd: 7, gateMax: 90,
    caveat: "In early perimenopause cycle length starts to swing more.",
  },
  // Ferrell 2006 (TREMIN): mean 45 d two years and 80 d one year before the FMP.
  perimenopause_late: {
    mean: 60, betweenSd: 25, withinSd: 25, gateMax: 180,
    withhold: "ovulation is infrequent in late perimenopause",
    caveat: "In late perimenopause gaps of 2+ months are common, so ranges are very wide.",
  },
};

export function resolveForecastPrior(conditions: string[], perimenoStage?: PerimenoStage | null): ForecastPrior {
  const ids = conditions.map((c) =>
    c === "perimenopause" ? (perimenoStage === "late" ? "perimenopause_late" : "perimenopause_early") : c,
  ) as ConditionId[];
  const p: ForecastPrior = structuredClone(BASE);
  for (const id of ids) {
    const a = CONDITION_ADJUST[id];
    if (!a) continue; // "none" and unknown ids keep the base prior
    if (a.mean) p.cycle.mean = Math.max(p.cycle.mean, a.mean);
    if (a.betweenSd) p.cycle.betweenSd = Math.max(p.cycle.betweenSd, a.betweenSd);
    if (a.withinSd) p.cycle.withinSd = Math.max(p.cycle.withinSd, a.withinSd);
    if (a.gateMax) p.gate.max = Math.max(p.gate.max, a.gateMax);
    if (a.withhold && !p.ovulationWithheld) p.ovulationWithheld = a.withhold;
    if (a.caveat) p.caveats.push(a.caveat);
  }
  if (p.ovulationWithheld) p.luteal = null;
  return p;
}

// ─── Normal distribution helpers ─────────────────────────────────
/** Standard normal CDF (Abramowitz & Stegun 7.1.26, |err| < 1.5e-7). */
export function normCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/** Standard normal quantile (Acklam's rational approximation, rel err < 1.2e-9). */
export function normInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - lo) return -normInv(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

// ─── Per-metric predictive ───────────────────────────────────────
/** Pseudo-observations behind the population within-person SD. */
export const NU0 = 4;
/** Only the most recent observations inform the forecast (~1 year of cycles). */
export const HISTORY_WINDOW = 12;

/**
 * Which intervals inform the forecast. Intervals shorter than gate.min are
 * set aside (likely a duplicate or spotting log). A single interval longer
 * than gate.max is set aside as a possible missed log; two or more long
 * intervals among the 6 most recent are treated as the person's real pattern.
 */
export function usableMask(xs: number[], gate: { min: number; max: number }): boolean[] {
  const longIsPattern = xs.slice(-6).filter((x) => x > gate.max).length >= 2;
  return xs.map((x) => x >= gate.min && (longIsPattern || x <= gate.max));
}

export interface MetricForecast {
  /** Point forecast (the predictive median when scale = "log"). */
  mean: number;
  sd: number;
  lower: number;
  upper: number;
  /** Observations that informed the estimate. */
  nUsed: number;
  /** Observations set aside as uncertain (outside the plausible gate). */
  nExcluded: number;
  /** Within-person SD estimate used (on the working scale). */
  withinSd: number;
  /** Working scale; quantiles are exp(mu + z*s) on "log". */
  scale: "linear" | "log";
  mu: number;
  s: number;
}

/** Predictive quantile of a metric forecast. */
export function metricQuantile(m: MetricForecast, p: number): number {
  const q = m.mu + m.s * normInv(p);
  return m.scale === "log" ? Math.exp(q) : q;
}

/** Predictive CDF at x (inverse of metricQuantile). */
export function metricCdf(m: MetricForecast, x: number): number {
  const v = m.scale === "log" ? Math.log(Math.max(x, 1e-9)) : x;
  return normCdf((v - m.mu) / m.s);
}

export function predictMetric(
  observations: number[],
  prior: MetricPrior,
  gate: { min: number; max: number } | null = null,
  level = INTERVAL_LEVEL,
  scale: "linear" | "log" = "linear",
): MetricForecast {
  const finite = observations.filter((x) => Number.isFinite(x) && x > 0);
  const mask = gate ? usableMask(finite, gate) : finite.map(() => true);
  const used = finite.filter((_, i) => mask[i]);
  const nExcluded = finite.length - used.length;
  const log = scale === "log";
  // On the log scale, day-unit spreads become coefficients of variation
  // (lognormal: sd_log = sqrt(ln(1 + cv^2))) and prior.mean is read as a median.
  const toLogSd = (sd: number) => Math.sqrt(Math.log(1 + (sd / prior.mean) ** 2));
  const m0 = log ? Math.log(prior.mean) : prior.mean;
  const t0 = (log ? toLogSd(prior.betweenSd) : prior.betweenSd) ** 2;
  const s0 = (log ? toLogSd(prior.withinSd) : prior.withinSd) ** 2;
  const xs = used.slice(-HISTORY_WINDOW).map((x) => (log ? Math.log(x) : x));
  const n = xs.length;
  const xbar = n > 0 ? xs.reduce((a, b) => a + b, 0) / n : 0;
  const ss = xs.reduce((a, x) => a + (x - xbar) ** 2, 0);
  const sigma2 = (NU0 * s0 + ss) / (NU0 + Math.max(n - 1, 0));
  const precision = 1 / t0 + n / sigma2;
  const mu = (m0 / t0 + (n * xbar) / sigma2) / precision;
  const s = Math.sqrt(sigma2 + 1 / precision);
  const z = normInv(0.5 + level / 2);
  const back = (v: number) => (log ? Math.exp(v) : v);
  const lower = back(mu - z * s);
  const upper = back(mu + z * s);
  return {
    mean: back(mu), sd: (upper - lower) / (2 * z), lower, upper,
    nUsed: n, nExcluded, withinSd: Math.sqrt(sigma2), scale, mu, s,
  };
}

/** Cycle length is right-skewed (median < mean), so it is modelled on the log scale. */
export const CYCLE_SCALE: "linear" | "log" = "log";

// ─── Dates ───────────────────────────────────────────────────────
const toUtcNoon = (iso: string) => Date.parse(`${iso}T12:00:00Z`);
export const diffDays = (a: string, b: string) => Math.round((toUtcNoon(b) - toUtcNoon(a)) / 86_400_000);
export const addDays = (iso: string, days: number) =>
  new Date(toUtcNoon(iso) + days * 86_400_000).toISOString().slice(0, 10);

// ─── Full forecast ───────────────────────────────────────────────
export interface CycleInput {
  mStart: string;
  mEnd: string | null;
}

export type ForecastStatus =
  | "no-data" // nothing logged
  | "on-period" // latest period has started and probably hasn't ended
  | "upcoming" // before the likely window
  | "in-window" // inside the likely window
  | "late" // past the window's end, no new start logged
  | "long-gap"; // far past the window: probably an unlogged period or a long cycle

export interface Forecast {
  modelVersion: string;
  /** Data cutoff: the forecast uses only logs dated on or before this day. */
  asOf: string;
  status: ForecastStatus;
  lastStart: string | null;
  cyclesLogged: number;
  basis: {
    intervalsUsed: number;
    intervalsSetAside: number;
    periodsUsed: number;
    /** true when the estimate is mostly population data rather than the user's own. */
    mostlyPopulation: boolean;
  };
  cycleLength: MetricForecast | null;
  periodLength: MetricForecast;
  /** Next period start: point estimate and the INTERVAL_LEVEL window. */
  nextStart: { date: string; earliest: string; latest: string } | null;
  /** Days from asOf to nextStart.date (negative once passed). */
  daysUntil: number | null;
  /** Days since lastStart. */
  dayOfCycle: number | null;
  /**
   * When the window has begun and no new start is logged: where the start is
   * likely to fall GIVEN it has not happened yet (truncated predictive).
   * Shown in addition to -- never instead of -- the original estimate.
   */
  ifNotStartedYet: { earliest: string; latest: string } | null;
  ovulation: { date: string; earliest: string; latest: string } | null;
  ovulationWithheld: string | null;
  /** Observed facts (not model output): shortest/longest usable interval. */
  observedRange: { shortest: number; longest: number } | null;
  caveats: string[];
}

export function forecast(
  cyclesIn: CycleInput[],
  opts: { conditions: string[]; perimenoStage?: PerimenoStage | null; today: string },
): Forecast {
  const { today } = opts;
  const prior = resolveForecastPrior(opts.conditions, opts.perimenoStage);
  // Leakage guard + dedupe: only starts on/before today, one per date, sorted.
  const byStart = new Map<string, CycleInput>();
  for (const c of cyclesIn) if (c.mStart <= today) byStart.set(c.mStart, c);
  const cycles = [...byStart.values()].sort((a, b) => a.mStart.localeCompare(b.mStart));

  const intervals: number[] = [];
  for (let i = 1; i < cycles.length; i++) intervals.push(diffDays(cycles[i - 1].mStart, cycles[i].mStart));
  const periods = cycles
    .filter((c) => c.mEnd && c.mEnd >= c.mStart && c.mEnd <= today)
    .map((c) => diffDays(c.mStart, c.mEnd!) + 1)
    .filter((d) => d <= 15);

  const periodLength = predictMetric(periods, prior.period);
  const caveats = [...prior.caveats];
  const base = {
    modelVersion: MODEL_VERSION,
    asOf: today,
    cyclesLogged: cycles.length,
    periodLength,
    ovulationWithheld: prior.ovulationWithheld,
    caveats,
  };

  if (cycles.length === 0) {
    return {
      ...base, status: "no-data", lastStart: null,
      basis: { intervalsUsed: 0, intervalsSetAside: 0, periodsUsed: 0, mostlyPopulation: true },
      cycleLength: null, nextStart: null, daysUntil: null, dayOfCycle: null,
      ifNotStartedYet: null, ovulation: null, observedRange: null,
    };
  }

  const cycleLength = predictMetric(intervals, prior.cycle, prior.gate, INTERVAL_LEVEL, CYCLE_SCALE);
  const last = cycles[cycles.length - 1];
  const dayOfCycle = diffDays(last.mStart, today);
  const round = Math.round;
  const nextStart = {
    date: addDays(last.mStart, round(cycleLength.mean)),
    earliest: addDays(last.mStart, Math.max(prior.gate.min, round(cycleLength.lower))),
    latest: addDays(last.mStart, round(cycleLength.upper)),
  };
  const daysUntil = diffDays(today, nextStart.date);

  const usable = intervals.filter((x) => x >= prior.gate.min && x <= prior.gate.max);
  const observedRange = usable.length > 0 ? { shortest: Math.min(...usable), longest: Math.max(...usable) } : null;
  if (cycleLength.nExcluded > 0) {
    caveats.push(
      cycleLength.nExcluded === 1
        ? "One gap between logs looked unusually long or short, so it was set aside as a possible missed or extra log."
        : `${cycleLength.nExcluded} gaps between logs looked unusual and were set aside as possible missed or extra logs.`,
    );
  }
  if (cycleLength.nUsed < 3) {
    caveats.push("This is mostly based on typical cycles, not yet yours -- it will get more personal as you log more periods.");
  }

  const bleedDays = round(periodLength.mean);
  const openBleed = !last.mEnd && dayOfCycle < Math.max(bleedDays, 3) + 2;
  const bledThrough = last.mEnd != null && today <= last.mEnd;
  let status: ForecastStatus;
  if (openBleed || bledThrough) status = "on-period";
  else if (today < nextStart.earliest) status = "upcoming";
  else if (today <= nextStart.latest) status = "in-window";
  else if (dayOfCycle <= prior.gate.max) status = "late";
  else status = "long-gap";

  // Conditional window given no start logged by today. Only inside the
  // window: before it conditioning barely moves anything, and past it the
  // Normal tail is not credible (the model, or the log, is probably wrong).
  let ifNotStartedYet: Forecast["ifNotStartedYet"] = null;
  if (status === "in-window") {
    const a = metricCdf(cycleLength, dayOfCycle);
    const q = (p: number) => metricQuantile(cycleLength, a + p * (1 - a));
    const lo = Math.max(dayOfCycle, round(q((1 - INTERVAL_LEVEL) / 2)));
    ifNotStartedYet = { earliest: addDays(last.mStart, lo), latest: addDays(last.mStart, Math.max(lo, round(q((1 + INTERVAL_LEVEL) / 2)))) };
  }

  let ovulation: Forecast["ovulation"] = null;
  if (prior.luteal) {
    // Calendar estimate only: next start minus a typical luteal phase.
    const mean = cycleLength.mean - prior.luteal.mean;
    const sd = Math.sqrt(cycleLength.sd ** 2 + prior.luteal.sd ** 2);
    const z = normInv(0.5 + INTERVAL_LEVEL / 2);
    ovulation = {
      date: addDays(last.mStart, round(mean)),
      earliest: addDays(last.mStart, round(mean - z * sd)),
      latest: addDays(last.mStart, round(mean + z * sd)),
    };
  }

  return {
    ...base,
    status,
    lastStart: last.mStart,
    basis: {
      intervalsUsed: cycleLength.nUsed,
      intervalsSetAside: cycleLength.nExcluded,
      periodsUsed: periodLength.nUsed,
      mostlyPopulation: cycleLength.nUsed < 3,
    },
    cycleLength,
    nextStart,
    daysUntil,
    dayOfCycle,
    ifNotStartedYet,
    ovulation,
    observedRange,
  };
}

// ─── Shared wording ──────────────────────────────────────────────
// Dashboard and chat both render these strings so they cannot disagree.
const fmt = (iso: string, withYear = false) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC",
  });

export function formatRange(a: string, b: string): string {
  return a === b ? fmt(a) : `${fmt(a)} – ${fmt(b)}`;
}

export interface ForecastText {
  /** e.g. "Around Oct 22" -- null when nothing is logged. */
  headline: string | null;
  /** e.g. "Most likely Oct 17 – Oct 27" */
  window: string | null;
  /** Where things stand today. */
  status: string;
  /** What the estimate rests on. */
  basis: string;
  ovulation: string | null;
  caveats: string[];
}

export function describeForecast(f: Forecast): ForecastText {
  if (f.status === "no-data" || !f.nextStart || !f.cycleLength) {
    return {
      headline: null, window: null,
      status: "Log your most recent period start and Luna will estimate the next one.",
      basis: "No periods logged yet.", ovulation: null, caveats: f.caveats,
    };
  }
  const { nextStart, dayOfCycle } = f;
  const used = f.basis.intervalsUsed;
  const basis =
    used === 0
      ? `Based on typical cycle data -- none of your own cycle lengths yet${f.basis.intervalsSetAside ? " (one unusual gap was set aside)" : ""}.`
      : `Based on ${used} of your cycle${used === 1 ? "" : "s"}${f.basis.mostlyPopulation ? " blended with typical cycle data" : ""}${f.basis.intervalsSetAside ? `, with ${f.basis.intervalsSetAside} unusual gap${f.basis.intervalsSetAside === 1 ? "" : "s"} set aside` : ""}.`;
  const days = f.daysUntil ?? 0;
  const status: Record<ForecastStatus, string> = {
    "no-data": "",
    "on-period": `Day ${dayOfCycle! + 1} of your current cycle -- log the end when your period stops.`,
    upcoming: days === 1 ? "Most likely tomorrow." : `About ${days} days away.`,
    "in-window": f.ifNotStartedYet
      ? `You're in the likely window. If it hasn't started yet, most likely ${formatRange(f.ifNotStartedYet.earliest, f.ifNotStartedYet.latest)}.`
      : "You're in the likely window.",
    late: `It's past Luna's usual range for you (day ${dayOfCycle! + 1}). Cycles vary -- if it has started, log it so the forecast stays accurate.`,
    "long-gap": `No new period logged for ${dayOfCycle} days. If you had one, logging it will fix the forecast.`,
  };
  const ovulation = f.ovulation
    ? `Rough calendar estimate ${formatRange(f.ovulation.earliest, f.ovulation.latest)} -- not confirmed ovulation.`
    : f.ovulationWithheld
      ? `Not estimated: ${f.ovulationWithheld}.`
      : null;
  return {
    headline: `Around ${fmt(nextStart.date, true)}`,
    window: `Most likely ${formatRange(nextStart.earliest, nextStart.latest)}`,
    status: status[f.status],
    basis,
    ovulation,
    caveats: f.caveats,
  };
}
