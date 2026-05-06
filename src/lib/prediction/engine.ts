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
const POPULATION_PRIOR = {
  cycleLength: { mean: 30.3, variance: 44.89 }, // σ≈6.7d
  periodLength: { mean: 6.2, variance: 2.25 }, // σ≈1.5d
  follicularLength: { mean: 18.5, variance: 42.25 }, // σ≈6.5d
  lutealLength: { mean: 12.0, variance: 7.84 }, // σ≈2.8d
};

// ─── Condition-specific priors ─────────────────────────────────────
// Sources: ChatGPT Deep Research, Gemini Deep Research, Perplexity Deep Research.
// See /research/ directory for full citations.
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
    lutealLength: { mean: 12.0, variance: 7.84 },
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
};

// ─── Resolve effective prior for a user's condition set ────────────
// If a user has multiple conditions, we pick the one with the widest
// cycle-length variance (most "disruptive" condition wins).
// Hormonal BC always wins if present (it fundamentally changes cycle mechanics).

export function resolveEffectivePrior(conditions: string[]): ConditionPrior {
  if (conditions.length === 0 || conditions.includes("none")) {
    return CONDITION_PRIORS.none;
  }

  // Hormonal BC overrides everything — cycle mechanics are fundamentally different
  if (conditions.includes("hormonal_bc")) {
    return CONDITION_PRIORS.hormonal_bc;
  }

  // Pick the condition with the highest cycle-length variance (most disruptive)
  let best: ConditionPrior = CONDITION_PRIORS.none;
  let bestVariance = best.cycleLength.variance;

  for (const id of conditions) {
    const prior = CONDITION_PRIORS[id as ConditionId];
    if (prior && prior.cycleLength.variance > bestVariance) {
      bestVariance = prior.cycleLength.variance;
      best = prior;
    }
  }

  return best;
}

// ─── Get skip threshold for a condition set ────────────────────────
export function getSkipThreshold(conditions: string[]): number {
  return resolveEffectivePrior(conditions).maxCycleLength;
}

// ─── Smoothing constants ──────────────────────────────────────────
const ALPHA_MIN = 0.1;
const ALPHA_MAX = 0.5;
const KAPPA = 5.0; // MAD scale for adaptive alpha
const DEFAULT_SKIP_THRESHOLD = 45; // fallback when no conditions
export const OUTLIER_SIGMA = 2.5; // soft-clamp gate width

// Adaptive alpha based on recent residual MAD
function computeAdaptiveAlpha(residuals: number[]): number {
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
): { mean: number; variance: number } {
  if (n >= 6) return { mean: userMean, variance: userVariance }; // prior fades out

  // Use condition-specific prior if available, otherwise fall back to general population
  const conditionPrior = resolveEffectivePrior(conditions);
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
): { value: number; isAnomaly: boolean } {
  const threshold =
    conditions.length > 0
      ? getSkipThreshold(conditions)
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
export function calculateJackknifeCI(
  observations: number[],
  conditions: string[] = [],
): { lower: number; upper: number; variance: number } {
  const n = observations.length;
  if (n < 6) {
    throw new Error("Jackknife CI requires at least 6 observations");
  }

  const { smoothed: fullSmoothed } = exponentialSmooth(
    observations,
    conditions,
  );
  const jackknifeEstimates: number[] = [];

  for (let i = 0; i < n; i++) {
    const subset = [...observations.slice(0, i), ...observations.slice(i + 1)];
    const { smoothed } = exponentialSmooth(subset, conditions);
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

  // 95% CI roughly 1.96 * SE
  return {
    lower: fullSmoothed - 1.96 * standardError,
    upper: fullSmoothed + 1.96 * standardError,
    variance: jackknifeVariance,
  };
}

// Main function to predict next cycle (condition-aware)
export function predictNextCycle(
  observations: number[],
  metric: keyof typeof POPULATION_PRIOR,
  conditions: string[] = [],
): { predicted: number; ciLower: number; ciUpper: number; n: number } {
  const n = observations.length;

  // Cold start: use condition-specific prior
  if (n === 0) {
    const conditionPrior = resolveEffectivePrior(conditions);
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
    };
  }

  const { smoothed, variance } = exponentialSmooth(observations, conditions);

  // For n >= 6, use jackknife CI (more robust than parametric)
  // The point estimate is the smoothed value (prior fades out at n>=6)
  if (n >= 6) {
    const jackknife = calculateJackknifeCI(observations, conditions);
    return {
      predicted: smoothed,
      ciLower: jackknife.lower,
      ciUpper: jackknife.upper,
      n,
    };
  }

  // For n < 6, blend with population prior and use parametric CI
  const blended = blendWithPrior(smoothed, variance, n, metric, conditions);
  const stdDev = Math.sqrt(blended.variance);
  return {
    predicted: blended.mean,
    ciLower: blended.mean - 1.96 * stdDev,
    ciUpper: blended.mean + 1.96 * stdDev,
    n,
  };
}
