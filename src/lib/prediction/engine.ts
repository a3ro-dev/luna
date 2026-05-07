// ─── Condition types ───────────────────────────────────────────────
// Must match the IDs used in onboarding/settings CONDITIONS array.
export type ConditionId =
  | "pcos"
  | "pcod"
  | "endometriosis"
  | "thyroid"
  | "hormonal_bc"
  | "irregular"
  | "perimenopause"
  | "perimenopause_early"
  | "perimenopause_late"
  | "none";

export interface ConditionPrior {
  /** Mean cycle length in days */
  cycleLength: { mean: number; variance: number };
  /** Mean period/bleeding length in days */
  periodLength: { mean: number; variance: number };
  /** Mean follicular phase in days (null if not applicable, e.g. hormonal BC) */
  follicularLength: { mean: number; variance: number } | null;
  /** Mean luteal phase in days (null if not applicable, e.g. hormonal BC) */
  lutealLength: { mean: number; variance: number } | null;
  /** Maximum realistic cycle length before flagging as missed log */
  maxCycleLength: number;
  /** Whether ovulation is commonly suppressed for this condition */
  anovulatoryCommon: boolean;
  /** Human-readable note for the AI about this condition's cycle behavior */
  note: string;
}

// ─── Reference (general population) prior ─────────────────────────
// Updated with better evidence: Najmabadi et al. pooled 3 prospective
// cohorts of 581 eumenorrheic women, 3,324 cycles (Perplexity research).
export const POPULATION_PRIOR = {
  cycleLength: { mean: 30.3, variance: 44.89 }, // σ≈6.7d
  periodLength: { mean: 6.2, variance: 2.25 }, // σ≈1.5d
  follicularLength: { mean: 18.5, variance: 42.25 }, // σ≈6.5d
  // Najmabadi et al. pooled cohort: 11.7d mean (SD 2.8).
  // Source: Najmabadi S, et al. Paediatric Perinatal Epidemiol. 2020;34(3):318-327.
  lutealLength: { mean: 11.7, variance: 7.84 }, // σ≈2.8d
};

// ─── Condition-specific priors ─────────────────────────────────────
// Sources: primary literature cited below. See /research/ directory for
// the AI-assisted research documents that originally surfaced these sources.
//
// Key references:
// - PCOS cycle length: Nutrients 2026 hypocaloric-diet trial (MCL 51±15d in PCOS vs 30±2 in controls)
// - PCOS max observed cycle: MOS2 community cohort (range 21-111 days)
// - Endometriosis: meta-analysis of 11 case-control studies (short cycles ≤27d OR 1.22)
// - Perimenopause: Treloar/Tremin cohort re-analysis (Holman 2006)
// - Hormonal BC: RCTs of monophasic 21/7 and 24/4 combined pills
// - Thyroid/Irregular: directional data only, no published mean±SD

export const CONDITION_PRIORS: Record<ConditionId, ConditionPrior> = {
  none: {
    cycleLength: { mean: 30.3, variance: 44.89 },
    periodLength: { mean: 6.2, variance: 2.25 },
    follicularLength: { mean: 18.5, variance: 42.25 },
    // Najmabadi et al. pooled cohort: 11.7d mean (SD 2.8).
    // Source: Najmabadi S, et al. Paediatric Perinatal Epidemiol. 2020;34(3):318-327.
    lutealLength: { mean: 11.7, variance: 7.84 },
    maxCycleLength: 45,
    anovulatoryCommon: false,
    note: "Regular ovulatory cycles with typical population variance.",
  },

  pcos: {
    // PCOS: Mean cycle length ~51d (SD~15d) from Nutrients 2026 trial.
    // Cycles up to 111d observed in MOS2 cohort.
    // Very high anovulation burden (~90-95% of oligomenorrheic cohort).
    // Variability dominated by follicular phase; luteal near-normal when ovulatory.
    cycleLength: { mean: 51, variance: 225 }, // σ=15d
    periodLength: { mean: 7, variance: 4 }, // σ=2d — often heavier/prolonged
    follicularLength: { mean: 26, variance: 100 }, // σ=10d — highly variable, prolonged
    lutealLength: { mean: 13, variance: 4 }, // σ=2d — near-normal if ovulatory
    maxCycleLength: 120, // Observed up to 111d; gate at 120d
    anovulatoryCommon: true,
    note:
      "PCOS: highly variable, often anovulatory cycles. Follicular phase dominates variability. " +
      "Luteal phase near-normal when ovulation occurs. Bleeding can be heavy/prolonged or scant. " +
      "Do NOT flag cycles under 120 days as missed logs — they are expected. " +
      "Ovulation predictions are low-confidence; be transparent about uncertainty.",
  },

  pcod: {
    // PCOD: No separate quantitative data from PCOS in peer-reviewed literature.
    // Treat as same phenotype but slightly milder per South Asian clinical tradition.
    // Interpolated: slightly shorter mean, slightly lower variance than PCOS.
    cycleLength: { mean: 45, variance: 169 }, // σ=13d
    periodLength: { mean: 6, variance: 4 }, // σ=2d
    follicularLength: { mean: 24, variance: 81 }, // σ=9d
    lutealLength: { mean: 13, variance: 4 }, // σ=2d
    maxCycleLength: 120,
    anovulatoryCommon: true,
    note:
      "PCOD: similar to PCOS but often milder presentation. Variable cycles with frequent anovulation. " +
      "Do NOT flag cycles under 120 days as missed logs. " +
      "Ovulation predictions should carry uncertainty disclaimers.",
  },

  endometriosis: {
    // Endo: cycles tend SHORTER (≤27d over-represented, OR 1.22).
    // Bleeding often heavier/prolonged (>7d). Ovulation usually preserved.
    // Max cycle length similar to general population — not an oligomenorrheic condition.
    cycleLength: { mean: 27, variance: 16 }, // σ=4d — slightly shorter than typical
    periodLength: { mean: 7.5, variance: 4 }, // σ=2d — often prolonged
    follicularLength: { mean: 14, variance: 9 }, // σ=3d — shortened
    lutealLength: { mean: 12, variance: 4 }, // σ=2d — typically normal
    maxCycleLength: 45,
    anovulatoryCommon: false,
    note:
      "Endometriosis: cycles tend to be slightly shorter with heavier/prolonged bleeding. " +
      "Ovulation is usually preserved. Pain and spotting are common features. " +
      "Normal anomaly thresholds apply.",
  },

  thyroid: {
    // Thyroid: No published mean±SD for cycle/phase length.
    // Hypo → oligomenorrhea, menorrhagia (longer/heavier).
    // Hyper → hypomenorrhea, polymenorrhea (shorter/lighter).
    // Blended prior: wider variance, moderate mean shift, higher anovulation.
    cycleLength: { mean: 35, variance: 225 }, // σ=15d — very wide, direction uncertain
    periodLength: { mean: 6, variance: 4 }, // σ=2d — varies by hypo/hyper
    follicularLength: { mean: 20, variance: 100 }, // σ=10d — often anovulatory
    lutealLength: { mean: 12, variance: 9 }, // σ=3d — near-normal if ovulatory
    maxCycleLength: 90,
    anovulatoryCommon: true,
    note:
      "Thyroid disorder: highly variable cycle patterns depending on hypo vs hyper. " +
      "Hypothyroid tends toward longer, heavier cycles. Hyperthyroid toward shorter, lighter ones. " +
      "Anovulation is common. Wide uncertainty in all predictions. " +
      "Do NOT flag cycles under 90 days as missed logs.",
  },

  hormonal_bc: {
    // Combined hormonal BC: "cycles" are regimen-driven (28d), withdrawal bleeds ~4-5d.
    // Ovulation suppressed — no meaningful follicular/luteal phase.
    // Very low variance if user is adherent.
    cycleLength: { mean: 28, variance: 1 }, // σ≈1d — almost no natural variation
    periodLength: { mean: 4.5, variance: 2.25 }, // σ≈1.5d
    follicularLength: null, // Not applicable — ovulation suppressed
    lutealLength: null, // Not applicable — no true luteal phase
    maxCycleLength: 35, // Beyond this likely missed pills or discontinuation
    anovulatoryCommon: true,
    note:
      "On hormonal birth control: bleeds are withdrawal bleeds, not true menstrual cycles. " +
      "Ovulation is suppressed. Cycle length is regimen-driven (~28 days). " +
      "Do NOT predict ovulation or follicular/luteal phases. " +
      "Unscheduled spotting is common, especially in the first 3-6 months. " +
      "A cycle >35 days likely indicates missed pills or a regimen change.",
  },

  irregular: {
    // Idiopathic irregular: catch-all for unexplained irregularity.
    // Use general population means but heavily inflated variance.
    // High anovulation probability.
    cycleLength: { mean: 30, variance: 225 }, // σ=15d — very wide
    periodLength: { mean: 5.5, variance: 4 }, // σ=2d
    follicularLength: { mean: 18, variance: 100 }, // σ=10d — unpredictable
    lutealLength: { mean: 12, variance: 9 }, // σ=3d — near-normal if ovulatory
    maxCycleLength: 90,
    anovulatoryCommon: true,
    note:
      "Irregular cycles (no diagnosed cause): wide cycle-to-cycle variability. " +
      "Anovulation is common. Predictions carry high uncertainty. " +
      "Do NOT flag cycles under 90 days as missed logs. " +
      "Mean cycle length is unreliable — rely on the user's own pattern once enough data exists.",
  },

  perimenopause: {
    // Perimenopause: Treloar/Tremin re-analysis (Holman 2006):
    //   -4yr: ~30d, -3yr: ~35d, -2yr: ~45d, -1yr: ~80d
    // Wide variance, increasing over time. Many anovulatory cycles.
    // Luteal ~14d when ovulation occurs, but ovulation often skips.
    // This is the "unknown" stage fallback — moderate mean, wide variance.
    // NOTE: This key is a backward-compatibility alias for perimenopause_early.
    // New users should select perimenopause_early or perimenopause_late instead.
    cycleLength: { mean: 45, variance: 400 }, // σ=20d — very wide, age-dependent
    periodLength: { mean: 6, variance: 4 }, // σ=2d — often heavier/longer
    follicularLength: { mean: 31, variance: 225 }, // σ=15d — highly variable
    lutealLength: { mean: 13, variance: 9 }, // σ=3d — near-normal when ovulatory
    maxCycleLength: 120,
    anovulatoryCommon: true,
    note:
      "Perimenopause: cycle length increases dramatically over time, from ~30d to ~80d+ near menopause. " +
      "Anovulatory cycles and prolonged inactive phases are common. " +
      "Any bleed after long amenorrhea is a poor predictor of the next interval. " +
      "Do NOT flag cycles under 120 days as missed logs. " +
      "Ovulation predictions are unreliable; be transparent about high uncertainty.",
  },

  /**
   * Early perimenopause sub-condition.
   * Corresponds to ~-4yr to -2yr before final menstrual period (Holman 2006).
   * Cycles still close to normal but increasing variance.
   */
  perimenopause_early: {
    cycleLength: { mean: 30, variance: 64 }, // σ≈8d, ~-4yr to -2yr (Holman 2006)
    periodLength: { mean: 6, variance: 4 },
    follicularLength: { mean: 17, variance: 64 },
    lutealLength: { mean: 13, variance: 9 },
    maxCycleLength: 60,
    anovulatoryCommon: false,
    note:
      "Early perimenopause: cycles still close to normal but becoming irregular. " +
      "Some anovulatory cycles. Cycle length around 30d but variance increasing. " +
      "Do NOT flag cycles under 60 days as missed logs.",
  },

  /**
   * Late perimenopause sub-condition.
   * Corresponds to ~-2yr to -1yr before final menstrual period (Holman 2006).
   * Very long, irregular cycles. Ovulation rare.
   */
  perimenopause_late: {
    cycleLength: { mean: 80, variance: 900 }, // σ=30d, ~-2yr to -1yr (Holman 2006)
    periodLength: { mean: 6, variance: 9 },
    follicularLength: { mean: 60, variance: 625 },
    lutealLength: { mean: 13, variance: 9 },
    maxCycleLength: 180,
    anovulatoryCommon: true,
    note:
      "Late perimenopause: very long, irregular cycles near menopause. " +
      "Ovulation rare. Cycle length around 80d with extreme variance. " +
      "Do NOT flag cycles under 180 days as missed logs. " +
      "Ovulation predictions are highly unreliable.",
  },
};

// ─── Perimenopause sub-priors (Holman 2006) ────────────────────────
// Perimenopause is not a single distribution — it spans a multi-year
// transition with dramatically shifting parameters. These sub-priors
// capture early (~-4yr) and late (~-1yr) stages.

/** Early perimenopause: cycles still close to normal but increasing variance. ~-4yr to -2yr before menopause (Holman 2006). */
export const PERIMENOPAUSE_EARLY: ConditionPrior = {
  cycleLength: { mean: 30, variance: 64 }, // σ≈8d, ~-4yr to -2yr (Holman 2006)
  periodLength: { mean: 6, variance: 4 },
  follicularLength: { mean: 17, variance: 64 },
  lutealLength: { mean: 13, variance: 9 },
  maxCycleLength: 60,
  anovulatoryCommon: false,
  note: "Early perimenopause: cycles still close to normal but increasing variance.",
};

/** Late perimenopause: very long, irregular cycles near menopause. Ovulation rare. ~-2yr to -1yr before menopause (Holman 2006). */
export const PERIMENOPAUSE_LATE: ConditionPrior = {
  cycleLength: { mean: 80, variance: 900 }, // σ=30d, ~-2yr to -1yr (Holman 2006)
  periodLength: { mean: 6, variance: 9 },
  follicularLength: { mean: 60, variance: 625 },
  lutealLength: { mean: 13, variance: 9 },
  maxCycleLength: 180,
  anovulatoryCommon: true,
  note: "Late perimenopause: very long, irregular cycles near menopause. Ovulation rare.",
};

/** Perimenopause stage, stored as metadata in the user's conditions jsonb field. */
export type PerimenoStage = "early" | "late" | "unknown";

/**
 * Resolve the perimenopause-specific prior based on the user's stage metadata.
 * Falls back to the general perimenopause prior (σ=20d) for "unknown" stage.
 */
function resolvePerimenopausePrior(
  perimenoStage?: PerimenoStage,
): ConditionPrior {
  if (perimenoStage === "early") return PERIMENOPAUSE_EARLY;
  if (perimenoStage === "late") return PERIMENOPAUSE_LATE;
  return CONDITION_PRIORS.perimenopause; // "unknown" or undefined
}

// ─── Resolve effective prior for a user's condition set ────────────
// Uses inverse-variance weighted mixture for multi-condition users.
// Hormonal BC always wins if present (it fundamentally changes cycle mechanics).

export interface ResolvePriorOptions {
  /** User's condition IDs (e.g. ["pcos", "thyroid"]) */
  conditions: string[];
  /** Perimenopause stage metadata, if applicable */
  perimenoStage?: PerimenoStage;
}

/**
 * Compute inverse-variance weighted blend of metric distributions.
 *
 * For multiple conditions, the blended variance accounts for both
 * within-condition uncertainty and between-condition spread:
 *   blended_mean = Σ(w_i * μ_i) / Σ(w_i), where w_i = 1/σ²_i
 *   blended_variance = 1 / Σ(w_i) + Σ(w_i * (μ_i - blended_mean)²) / Σ(w_i)
 *
 * The second term captures the spread between condition means, which a
 * simple inverse-variance pool would underestimate.
 */
function blendMetric(
  distributions: Array<{ mean: number; variance: number }>,
): { mean: number; variance: number } {
  if (distributions.length === 0) {
    return { mean: 0, variance: 0 };
  }
  if (distributions.length === 1) {
    return distributions[0];
  }

  let sumWeightedMean = 0;
  let sumInverseVariance = 0;

  for (const d of distributions) {
    const invVar = 1 / Math.max(d.variance, 0.001); // floor variance to avoid division by zero
    sumWeightedMean += d.mean * invVar;
    sumInverseVariance += invVar;
  }

  const blendedMean = sumWeightedMean / sumInverseVariance;

  // Between-condition spread term: Σ(w_i * (μ_i - blended_mean)²) / Σ(w_i)
  // This ensures the blended variance reflects not just the pooled uncertainty
  // but also how far apart the condition means are from each other.
  let spreadSum = 0;
  for (const d of distributions) {
    const invVar = 1 / Math.max(d.variance, 0.001);
    spreadSum += invVar * Math.pow(d.mean - blendedMean, 2);
  }
  const betweenSpread = spreadSum / sumInverseVariance;

  // Total variance = inverse-variance pool + between-condition spread
  const blendedVariance = 1 / sumInverseVariance + betweenSpread;

  return { mean: blendedMean, variance: blendedVariance };
}

/**
 * Resolve the effective prior for a user's condition set using
 * inverse-variance weighted mixture blending.
 *
 * When a user has multiple conditions (excluding `hormonal_bc` override),
 * this computes a blended prior as an inverse-variance weighted mixture
 * of all active condition priors:
 *   blended_mean = Σ(w_i * μ_i) / Σ(w_i), where w_i = 1/σ²_i
 *   blended_variance = 1 / Σ(w_i) + Σ(w_i * (μ_i - blended_mean)²) / Σ(w_i)
 *
 * The second variance term accounts for between-condition spread, which
 * a simple inverse-variance pool would underestimate.
 *
 * NOTE: This mixture still assumes approximate Gaussianity and may
 * underestimate tails for heavily right-skewed conditions like PCOS,
 * where the true distribution has a long right tail. Users with
 * bimodal condition combinations (e.g. endometriosis + thyroid) will
 * get a mean between the two modes, which may not match either well.
 *
 * - Hormonal BC overrides everything (cycle mechanics fundamentally different).
 * - maxCycleLength: MAX across all active conditions (widest safe gate).
 * - anovulatoryCommon: OR across all active conditions.
 * - note: concatenated from all conditions, separated by newline.
 * - Perimenopause sub-priors are resolved based on perimenoStage metadata
 *   or direct condition ID (perimenopause_early / perimenopause_late).
 */
export function resolveEffectivePrior(
  conditionsOrOptions: string[] | ResolvePriorOptions,
): ConditionPrior {
  // Support both old signature (string[]) and new signature (options object)
  const opts: ResolvePriorOptions = Array.isArray(conditionsOrOptions)
    ? { conditions: conditionsOrOptions }
    : conditionsOrOptions;

  const { conditions, perimenoStage } = opts;

  if (conditions.length === 0 || conditions.includes("none")) {
    return CONDITION_PRIORS.none;
  }

  // Hormonal BC overrides everything — cycle mechanics are fundamentally different
  if (conditions.includes("hormonal_bc")) {
    return CONDITION_PRIORS.hormonal_bc;
  }

  // Collect all applicable priors, using perimenopause sub-prior if applicable
  const activePriors: ConditionPrior[] = [];
  for (const id of conditions) {
    if (id === "none") continue;
    if (id === "perimenopause") {
      // Legacy "perimenopause" key — resolve via stage metadata or fallback
      activePriors.push(resolvePerimenopausePrior(perimenoStage));
    } else if (id === "perimenopause_early") {
      activePriors.push(PERIMENOPAUSE_EARLY);
    } else if (id === "perimenopause_late") {
      activePriors.push(PERIMENOPAUSE_LATE);
    } else {
      const prior = CONDITION_PRIORS[id as ConditionId];
      if (prior) activePriors.push(prior);
    }
  }

  // Single condition: return directly
  if (activePriors.length <= 1) {
    return activePriors[0] ?? CONDITION_PRIORS.none;
  }

  // Multi-condition: inverse-variance weighted mixture
  const cycleLengths = activePriors.map((p) => p.cycleLength);
  const periodLengths = activePriors.map((p) => p.periodLength);
  const follicularLengths = activePriors
    .map((p) => p.follicularLength)
    .filter((f): f is { mean: number; variance: number } => f !== null);
  const lutealLengths = activePriors
    .map((p) => p.lutealLength)
    .filter((l): l is { mean: number; variance: number } => l !== null);

  const blendedCycleLength = blendMetric(cycleLengths);
  const blendedPeriodLength = blendMetric(periodLengths);
  const blendedFollicular =
    follicularLengths.length > 0 ? blendMetric(follicularLengths) : null;
  const blendedLuteal =
    lutealLengths.length > 0 ? blendMetric(lutealLengths) : null;

  // maxCycleLength: MAX across all active conditions (widest safe gate)
  const maxCycleLength = Math.max(...activePriors.map((p) => p.maxCycleLength));

  // anovulatoryCommon: OR across all active conditions
  const anovulatoryCommon = activePriors.some((p) => p.anovulatoryCommon);

  // note: concatenate all condition notes, separated by newline
  const note = activePriors
    .map((p) => p.note)
    .filter((n) => n.length > 0)
    .join("\n");

  return {
    cycleLength: blendedCycleLength,
    periodLength: blendedPeriodLength,
    follicularLength: blendedFollicular,
    lutealLength: blendedLuteal,
    maxCycleLength,
    anovulatoryCommon,
    note,
  };
}

// ─── Get skip threshold for a condition set ────────────────────────
export function getSkipThreshold(
  conditions: string[],
  perimenoStage?: PerimenoStage,
): number {
  return resolveEffectivePrior({ conditions, perimenoStage }).maxCycleLength;
}

// ─── Smoothing constants ──────────────────────────────────────────
export const ALPHA_MIN = 0.1;
export const ALPHA_MAX = 0.5;
export const KAPPA = 5.0; // MAD scale for adaptive alpha
const DEFAULT_SKIP_THRESHOLD = 45; // fallback when no conditions
export const OUTLIER_SIGMA = 2.5; // soft-clamp gate width

/**
 * Compute adaptive smoothing alpha based on recent residual mean absolute deviation.
 * Higher MAD → higher alpha (faster adaptation). Lower MAD → lower alpha (smoother).
 */
export function computeAdaptiveAlpha(residuals: number[]): number {
  if (residuals.length === 0) return 0.3; // cold start default
  const mad = residuals.reduce((a, b) => a + Math.abs(b), 0) / residuals.length;
  return ALPHA_MIN + (ALPHA_MAX - ALPHA_MIN) * (mad / (mad + KAPPA));
}

// Inverse-variance blending with population prior (condition-aware)
export function blendWithPrior(
  userMean: number,
  userVariance: number,
  n: number,
  metric: keyof typeof POPULATION_PRIOR,
  conditions: string[] = [],
  perimenoStage?: PerimenoStage,
): { mean: number; variance: number } {
  if (n >= 6) return { mean: userMean, variance: userVariance }; // prior fades out

  // Use condition-specific prior if available, otherwise fall back to general population
  const conditionPrior = resolveEffectivePrior({ conditions, perimenoStage });
  const conditionMetricMap: Record<
    keyof typeof POPULATION_PRIOR,
    keyof ConditionPrior | null
  > = {
    cycleLength: "cycleLength",
    periodLength: "periodLength",
    follicularLength: "follicularLength",
    lutealLength: "lutealLength",
  };

  const metricKey = conditionMetricMap[metric];
  const conditionMetricData = metricKey
    ? (conditionPrior[metricKey] as { mean: number; variance: number } | null)
    : null;
  const prior = conditionMetricData ?? POPULATION_PRIOR[metric];

  const priorWeight = 1 / prior.variance;
  const userWeight = n > 0 ? 1 / Math.max(userVariance, 0.01) : 0;
  const blendedMean =
    (priorWeight * prior.mean + userWeight * userMean) /
    (priorWeight + userWeight);
  const blendedVariance = 1 / (priorWeight + userWeight);
  return { mean: blendedMean, variance: blendedVariance };
}

// Skip/anomaly gate — condition-aware
export function skipGate(
  value: number,
  smoothed: number,
  variance: number,
  conditions: string[] = [],
  perimenoStage?: PerimenoStage,
): { value: number; isAnomaly: boolean } {
  const threshold =
    conditions.length > 0
      ? getSkipThreshold(conditions, perimenoStage)
      : DEFAULT_SKIP_THRESHOLD;

  if (value > threshold) {
    return { value: smoothed, isAnomaly: true }; // likely missed log — ignore for smoother
  }
  // Floor variance at 4.0 (σ≥2d) to prevent tight convergence from flagging normal variation
  const sigma = Math.sqrt(Math.max(variance, 4.0));
  const delta = value - smoothed;
  if (Math.abs(delta) > OUTLIER_SIGMA * sigma) {
    // Soft clamp: pull toward mean
    const clamped = smoothed + Math.sign(delta) * OUTLIER_SIGMA * sigma;
    return { value: clamped, isAnomaly: true };
  }
  return { value, isAnomaly: false };
}

// Core smoother — returns new smoothed value and variance (condition-aware)
export function exponentialSmooth(
  observations: number[], // oldest → newest
  conditions: string[] = [],
  perimenoStage?: PerimenoStage,
): { smoothed: number; variance: number } {
  if (observations.length === 0) return { smoothed: 0, variance: 0 };

  let smoothed = observations[0];
  let variance = 0;
  const residuals: number[] = [];

  for (let i = 1; i < observations.length; i++) {
    const rawVal = observations[i];

    // Apply skip gate (condition-aware)
    const { value: gatedVal, isAnomaly } = skipGate(
      rawVal,
      smoothed,
      variance,
      conditions,
      perimenoStage,
    );

    // Compute alpha dynamically
    const alpha = computeAdaptiveAlpha(residuals.slice(-5)); // Use last 5 residuals

    // Calculate new error and update variance
    const diff = gatedVal - smoothed;
    variance = (1 - alpha) * (variance + alpha * diff * diff);

    // Update smoothed value
    smoothed = smoothed + alpha * diff;

    // Store residual for MAD computation next iteration.
    // Only push non-zero residuals from non-gated observations.
    // Gated anomalies produce diff≈0, which would artificially deflate
    // MAD and lock alpha low, making the smoother unresponsive to
    // genuine regime changes.
    if (!isAnomaly) {
      residuals.push(diff);
    }
  }

  return { smoothed, variance };
}

// Calculate Jackknife Confidence Interval for n >= 6 (condition-aware)
export interface JackknifeCIResult {
  /** Lower bound of the 95% confidence interval */
  lower: number;
  /** Upper bound of the 95% confidence interval */
  upper: number;
  /** Jackknife variance estimate */
  variance: number;
  /** Whether the CI is statistically reliable (no discontinuity detected, n >= 10) */
  ciReliable: boolean;
}

/**
 * Calculate a jackknife confidence interval for the smoothed estimate.
 *
 * Sets `ciReliable = false` when:
 * - n < 10 (small-sample jackknife is unreliable)
 * - Any leave-one-out estimate differs from the full smoothed value by
 *   more than 2 * sqrt(jackknifeVariance), indicating a discontinuity
 *   was triggered by the leave-one-out procedure.
 */
export function calculateJackknifeCI(
  observations: number[],
  conditions: string[] = [],
  perimenoStage?: PerimenoStage,
): JackknifeCIResult {
  const n = observations.length;
  if (n < 6) {
    throw new Error("Jackknife CI requires at least 6 observations");
  }

  const { smoothed: fullSmoothed } = exponentialSmooth(
    observations,
    conditions,
    perimenoStage,
  );
  const jackknifeEstimates: number[] = [];

  for (let i = 0; i < n; i++) {
    const subset = [...observations.slice(0, i), ...observations.slice(i + 1)];
    const { smoothed } = exponentialSmooth(subset, conditions, perimenoStage);
    jackknifeEstimates.push(smoothed);
  }

  const meanJackknife =
    jackknifeEstimates.reduce((a, b) => a + b, 0) / jackknifeEstimates.length;

  const varianceSum = jackknifeEstimates.reduce(
    (acc, val) => acc + Math.pow(val - meanJackknife, 2),
    0,
  );
  const jackknifeVariance = ((n - 1) / n) * varianceSum;
  const standardError = Math.sqrt(jackknifeVariance);

  // Determine CI reliability
  let ciReliable = true;

  // Small-sample jackknife is unreliable
  if (n < 10) {
    ciReliable = false;
  }

  // Check for discontinuity: any leave-one-out estimate that differs
  // from the full smoothed value by more than 2 * sqrt(jackknifeVariance)
  const discontinuityThreshold = 2 * Math.sqrt(Math.max(jackknifeVariance, 0));
  for (const estimate of jackknifeEstimates) {
    if (Math.abs(estimate - fullSmoothed) > discontinuityThreshold) {
      ciReliable = false;
      break;
    }
  }

  // 95% CI roughly 1.96 * SE
  return {
    lower: fullSmoothed - 1.96 * standardError,
    upper: fullSmoothed + 1.96 * standardError,
    variance: jackknifeVariance,
    ciReliable,
  };
}

// Main function to predict next cycle (condition-aware)
// ─── Derived metric: follicular phase ───────────────────────────
// The follicular phase length is NOT smoothed independently.
// Instead, it is derived from the three smoothed metrics to enforce
// the physiological constraint:
//   cycleLength + 1 = periodLength + follicularLength + lutealLength
//
// The +1 arises because periodLength uses inclusive day counting
// (diffInDays(mStart, mEnd) + 1), while the other metrics use
// exclusive day differences. See cycle-tools.ts computeCycleDerivedColumns.
//
// Returns null if any of the three inputs are null/undefined
// (e.g. hormonal BC users have no luteal phase).
export function deriveFollicularLength(
  cycleLength: number | null | undefined,
  periodLength: number | null | undefined,
  lutealLength: number | null | undefined,
): number | null {
  if (cycleLength == null || periodLength == null || lutealLength == null) {
    return null;
  }
  return cycleLength + 1 - periodLength - lutealLength;
}

export interface PredictionResult {
  /** Point estimate for the predicted value */
  predicted: number;
  /** Lower bound of the 95% confidence interval */
  ciLower: number;
  /** Upper bound of the 95% confidence interval */
  ciUpper: number;
  /** Number of observations used */
  n: number;
  /** Whether the confidence interval is statistically reliable */
  ciReliable: boolean;
}

/**
 * Predict the next cycle value using adaptive exponential smoothing
 * with condition-aware population priors.
 *
 * Returns a prediction with confidence interval and a `ciReliable` flag
 * indicating whether the CI should be treated as authoritative.
 */
export function predictNextCycle(
  observations: number[],
  metric: keyof typeof POPULATION_PRIOR,
  conditions: string[] = [],
  perimenoStage?: PerimenoStage,
): PredictionResult {
  const n = observations.length;

  // Cold start: use condition-specific prior
  if (n === 0) {
    const conditionPrior = resolveEffectivePrior({ conditions, perimenoStage });
    const conditionMetricMap: Record<
      keyof typeof POPULATION_PRIOR,
      keyof ConditionPrior | null
    > = {
      cycleLength: "cycleLength",
      periodLength: "periodLength",
      follicularLength: "follicularLength",
      lutealLength: "lutealLength",
    };

    const metricKey = conditionMetricMap[metric];
    const conditionMetricData = metricKey
      ? (conditionPrior[metricKey] as { mean: number; variance: number } | null)
      : null;
    const prior = conditionMetricData ?? POPULATION_PRIOR[metric];

    const stdDev = Math.sqrt(prior.variance);
    return {
      predicted: prior.mean,
      ciLower: prior.mean - 1.96 * stdDev,
      ciUpper: prior.mean + 1.96 * stdDev,
      n: 0,
      ciReliable: false, // No data — CI not reliable
    };
  }

  const { smoothed, variance } = exponentialSmooth(
    observations,
    conditions,
    perimenoStage,
  );

  // For n >= 6, use jackknife CI (more robust than parametric)
  // The point estimate is the smoothed value (prior fades out at n>=6)
  if (n >= 6) {
    const jackknife = calculateJackknifeCI(
      observations,
      conditions,
      perimenoStage,
    );
    return {
      predicted: smoothed,
      ciLower: jackknife.lower,
      ciUpper: jackknife.upper,
      n,
      ciReliable: jackknife.ciReliable,
    };
  }

  // For n < 6, blend with population prior and use parametric CI
  const blended = blendWithPrior(
    smoothed,
    variance,
    n,
    metric,
    conditions,
    perimenoStage,
  );
  const stdDev = Math.sqrt(blended.variance);
  return {
    predicted: blended.mean,
    ciLower: blended.mean - 1.96 * stdDev,
    ciUpper: blended.mean + 1.96 * stdDev,
    n,
    ciReliable: false, // Small sample — CI not reliable
  };
}
