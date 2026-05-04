const POPULATION_PRIOR = {
  cycleLength: { mean: 28.0, variance: 12.25 }, // σ=3.5d, from ACOG population data
  periodLength: { mean: 5.0, variance: 2.25 }, // σ=1.5d
  follicularLength: { mean: 16.0, variance: 9.0 }, // σ=3.0d
  lutealLength: { mean: 12.0, variance: 4.0 }, // σ=2.0d
};

const ALPHA_MIN = 0.1;
const ALPHA_MAX = 0.5;
const KAPPA = 5.0; // MAD scale for adaptive alpha
const SKIP_THRESHOLD = 45; // days — cycles longer than this are likely missed logs
const OUTLIER_SIGMA = 2.5; // soft-clamp gate width

// Adaptive alpha based on recent residual MAD
function computeAdaptiveAlpha(residuals: number[]): number {
  if (residuals.length === 0) return 0.3; // cold start default
  const mad = residuals.reduce((a, b) => a + Math.abs(b), 0) / residuals.length;
  return ALPHA_MIN + (ALPHA_MAX - ALPHA_MIN) * (mad / (mad + KAPPA));
}

// Inverse-variance blending with population prior
export function blendWithPrior(
  userMean: number,
  userVariance: number,
  n: number,
  metric: keyof typeof POPULATION_PRIOR
): { mean: number; variance: number } {
  if (n >= 6) return { mean: userMean, variance: userVariance }; // prior fades out
  const prior = POPULATION_PRIOR[metric];
  const priorWeight = 1 / prior.variance;
  const userWeight = n > 0 ? 1 / Math.max(userVariance, 0.01) : 0;
  const blendedMean =
    (priorWeight * prior.mean + userWeight * userMean) /
    (priorWeight + userWeight);
  const blendedVariance = 1 / (priorWeight + userWeight);
  return { mean: blendedMean, variance: blendedVariance };
}

// Skip/anomaly gate — soft-clamp extreme values before updating smoother
export function skipGate(
  value: number,
  smoothed: number,
  variance: number
): { value: number; isAnomaly: boolean } {
  if (value > SKIP_THRESHOLD) {
    return { value: smoothed, isAnomaly: true }; // likely missed log — ignore for smoother
  }
  const sigma = Math.sqrt(Math.max(variance, 0.01));
  const delta = value - smoothed;
  if (Math.abs(delta) > OUTLIER_SIGMA * sigma) {
    // Soft clamp: pull toward mean
    const clamped = smoothed + Math.sign(delta) * OUTLIER_SIGMA * sigma;
    return { value: clamped, isAnomaly: true };
  }
  return { value, isAnomaly: false };
}

// Core smoother — returns new smoothed value and variance
export function exponentialSmooth(
  observations: number[] // oldest → newest
): { smoothed: number; variance: number } {
  if (observations.length === 0) return { smoothed: 0, variance: 0 };
  
  let smoothed = observations[0];
  let variance = 0;
  const residuals: number[] = [];

  for (let i = 1; i < observations.length; i++) {
    const rawVal = observations[i];
    
    // Apply skip gate
    const { value: gatedVal } = skipGate(rawVal, smoothed, variance);
    
    // Compute alpha dynamically
    const alpha = computeAdaptiveAlpha(residuals.slice(-5)); // Use last 5 residuals
    
    // Calculate new error and update variance
    const diff = gatedVal - smoothed;
    variance = (1 - alpha) * (variance + alpha * diff * diff);
    
    // Update smoothed value
    smoothed = smoothed + alpha * diff;
    
    // Store residual for MAD computation next iteration
    residuals.push(diff);
  }

  return { smoothed, variance };
}

// Calculate Jackknife Confidence Interval for n >= 6
export function calculateJackknifeCI(
  observations: number[]
): { lower: number; upper: number; variance: number } {
  const n = observations.length;
  if (n < 6) {
    throw new Error("Jackknife CI requires at least 6 observations");
  }

  const { smoothed: fullSmoothed } = exponentialSmooth(observations);
  const jackknifeEstimates: number[] = [];

  for (let i = 0; i < n; i++) {
    const subset = [...observations.slice(0, i), ...observations.slice(i + 1)];
    const { smoothed } = exponentialSmooth(subset);
    jackknifeEstimates.push(smoothed);
  }

  const meanJackknife =
    jackknifeEstimates.reduce((a, b) => a + b, 0) / jackknifeEstimates.length;

  const varianceSum = jackknifeEstimates.reduce(
    (acc, val) => acc + Math.pow(val - meanJackknife, 2),
    0
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

// Main function to predict next cycle
export function predictNextCycle(
  observations: number[],
  metric: keyof typeof POPULATION_PRIOR
): { predicted: number; ciLower: number; ciUpper: number; n: number } {
  const n = observations.length;

  if (n === 0) {
    const prior = POPULATION_PRIOR[metric];
    const stdDev = Math.sqrt(prior.variance);
    return {
      predicted: prior.mean,
      ciLower: prior.mean - 1.96 * stdDev,
      ciUpper: prior.mean + 1.96 * stdDev,
      n: 0,
    };
  }

  const { smoothed, variance } = exponentialSmooth(observations);
  const blended = blendWithPrior(smoothed, variance, n, metric);

  let ciLower: number;
  let ciUpper: number;

  if (n >= 6) {
    const jackknife = calculateJackknifeCI(observations);
    // Even if n>=6, we blend the means for extreme safety, though blendWithPrior
    // will essentially return the user's mean/variance due to the n>=6 check.
    ciLower = jackknife.lower;
    ciUpper = jackknife.upper;
    blended.mean = smoothed; 
    blended.variance = jackknife.variance;
  } else {
    // For n < 6, use the blended variance
    const stdDev = Math.sqrt(blended.variance);
    ciLower = blended.mean - 1.96 * stdDev;
    ciUpper = blended.mean + 1.96 * stdDev;
  }

  return {
    predicted: blended.mean,
    ciLower,
    ciUpper,
    n,
  };
}
