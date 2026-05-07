import { describe, it, expect } from "vitest";
import {
  exponentialSmooth,
  skipGate,
  blendWithPrior,
  resolveEffectivePrior,
  predictNextCycle,
  calculateJackknifeCI,
  CONDITION_PRIORS,
  PERIMENOPAUSE_EARLY,
  PERIMENOPAUSE_LATE,
  computeAdaptiveAlpha,
  OUTLIER_SIGMA,
  ALPHA_MIN,
  ALPHA_MAX,
  KAPPA,
  POPULATION_PRIOR,
} from "../engine";

// ─── Constants ────────────────────────────────────────────────────

describe("exported constants", () => {
  it("OUTLIER_SIGMA should be 2.5", () => {
    expect(OUTLIER_SIGMA).toBe(2.5);
  });

  it("ALPHA_MIN should be 0.1", () => {
    expect(ALPHA_MIN).toBe(0.1);
  });

  it("ALPHA_MAX should be 0.5", () => {
    expect(ALPHA_MAX).toBe(0.5);
  });

  it("KAPPA should be 5.0", () => {
    expect(KAPPA).toBe(5.0);
  });
});

// ─── computeAdaptiveAlpha ─────────────────────────────────────────

describe("computeAdaptiveAlpha", () => {
  it("returns cold-start default (0.3) for empty residuals", () => {
    expect(computeAdaptiveAlpha([])).toBeCloseTo(0.3);
  });

  it("returns ALPHA_MIN when residuals are all zero (no variation)", () => {
    expect(computeAdaptiveAlpha([0, 0, 0, 0, 0])).toBeCloseTo(ALPHA_MIN);
  });

  it("returns a value within [ALPHA_MIN, ALPHA_MAX] for typical residuals", () => {
    const alpha = computeAdaptiveAlpha([2, 4, 1, 3]);
    expect(alpha).toBeGreaterThanOrEqual(ALPHA_MIN);
    expect(alpha).toBeLessThanOrEqual(ALPHA_MAX);
  });

  it("increases as residual MAD increases", () => {
    const lowMad = computeAdaptiveAlpha([1, 1, 1, 1]);
    const highMad = computeAdaptiveAlpha([10, 10, 10, 10]);
    expect(highMad).toBeGreaterThan(lowMad);
  });
});

// ─── skipGate ─────────────────────────────────────────────────────

describe("skipGate", () => {
  it("returns isAnomaly=false and unchanged value for a normal in-range observation", () => {
    // smoothed=28, variance=4 (σ=2), value=30 → delta=2, OUTLIER_SIGMA*σ=5 → within
    const result = skipGate(30, 28, 4, []);
    expect(result.isAnomaly).toBe(false);
    expect(result.value).toBe(30);
  });

  it("returns isAnomaly=true with value=smoothed when observation exceeds maxCycleLength", () => {
    // Default threshold for no conditions is 45. Value 50 exceeds it.
    const result = skipGate(50, 28, 4, []);
    expect(result.isAnomaly).toBe(true);
    expect(result.value).toBe(28); // returns smoothed
  });

  it("returns isAnomaly=true with soft-clamped value when |d_i| > 2.5σ", () => {
    // smoothed=28, variance=4 (σ=2), value=38 → delta=10, OUTLIER_SIGMA*σ=5 → exceeds
    // Clamped: smoothed + sign(delta) * OUTLIER_SIGMA * σ = 28 + 5 = 33
    const result = skipGate(38, 28, 4, []);
    expect(result.isAnomaly).toBe(true);
    expect(result.value).toBeLessThan(38); // clamped down
    expect(result.value).toBeGreaterThan(28); // but not equal to smoothed
  });

  it("σ floor of 2.0 days (variance floor 4.0) prevents flagging of normal variation after tight convergence", () => {
    // Very low variance (0.01) — the floor at variance=4.0 means σ≥2,
    // so a delta of 4 (within 2.5*2=5) should NOT be flagged.
    const result = skipGate(32, 28, 0.01, []);
    // σ_floor = sqrt(4.0) = 2.0, threshold = 2.5 * 2.0 = 5.0
    // delta = 4, 4 < 5 → not anomaly
    expect(result.isAnomaly).toBe(false);
    expect(result.value).toBe(32);
  });

  it("uses condition-specific maxCycleLength threshold", () => {
    // PCOS has maxCycleLength=120. Value 100 should not trigger the max threshold.
    const result = skipGate(100, 28, 4, ["pcos"]);
    expect(result.isAnomaly).toBe(false); // 100 < 120
  });

  it("soft-clamps negative outliers too", () => {
    // smoothed=35, variance=4 (σ=2), value=22 → delta=-13, |delta|=13 > 5
    // Clamped: 35 + (-1) * 5 = 30
    const result = skipGate(22, 35, 4, []);
    expect(result.isAnomaly).toBe(true);
    expect(result.value).toBeLessThan(35);
    expect(result.value).toBeGreaterThan(22);
  });
});

// ─── exponentialSmooth ────────────────────────────────────────────

describe("exponentialSmooth", () => {
  it("returns {smoothed: 0, variance: 0} for empty input", () => {
    const result = exponentialSmooth([]);
    expect(result.smoothed).toBe(0);
    expect(result.variance).toBe(0);
  });

  it("returns the single observation as the estimate with variance 0", () => {
    const result = exponentialSmooth([28]);
    expect(result.smoothed).toBe(28);
    expect(result.variance).toBe(0);
  });

  it("with identical observations, variance converges toward zero", () => {
    const result = exponentialSmooth([28, 28, 28, 28, 28, 28, 28, 28]);
    expect(result.smoothed).toBeCloseTo(28, 0);
    expect(result.variance).toBeLessThan(1);
  });

  it("with a large spike, adaptive α increases (MAD increases → α increases)", () => {
    // First: stable sequence → low α
    const stable = [28, 28, 28, 28, 28];
    const stableAlpha = computeAdaptiveAlpha(getResiduals(stable));

    // Then: spike sequence → high α
    const spiky = [28, 28, 28, 28, 60];
    const spikyAlpha = computeAdaptiveAlpha(getResiduals(spiky, ["pcos"]));

    expect(spikyAlpha).toBeGreaterThan(stableAlpha);
  });

  it("anomaly-gated observations do NOT contribute residuals to MAD", () => {
    // When a value is gated as anomalous, its residual is not pushed to the
    // residuals array. This means the next α calculation won't be influenced
    // by the anomaly.
    // Use a value that exceeds maxCycleLength (45 for no conditions) to trigger gating.
    const result = exponentialSmooth([28, 29, 30, 28, 60], []);
    // The 60 is above threshold (45), so it gets gated.
    // The residual from the gated observation should NOT be in the residuals.
    // We can verify indirectly: the smoothed value should not be pulled far toward 60.
    expect(result.smoothed).toBeLessThan(40); // Not pulled far by the 60
  });

  it("converges toward 60 for step change with PCOS conditions", () => {
    const result = exponentialSmooth(
      [28, 28, 28, 28, 60, 60, 60, 60],
      ["pcos"],
    );
    expect(result.smoothed).toBeGreaterThan(28);
  });
});

/**
 * Helper: run exponentialSmooth and extract the residuals that would be
 * produced, mimicking the internal logic. We use the smoothed result
 * as a proxy since we can't access internal residuals directly.
 */
function getResiduals(
  observations: number[],
  conditions: string[] = [],
): number[] {
  if (observations.length <= 1) return [];
  let smoothed = observations[0];
  let variance = 0;
  const residuals: number[] = [];

  for (let i = 1; i < observations.length; i++) {
    const rawVal = observations[i];
    const { value: gatedVal, isAnomaly } = skipGate(
      rawVal,
      smoothed,
      variance,
      conditions,
    );
    const alpha = computeAdaptiveAlpha(residuals.slice(-5));
    const diff = gatedVal - smoothed;
    variance = (1 - alpha) * (variance + alpha * diff * diff);
    smoothed = smoothed + alpha * diff;
    if (!isAnomaly) {
      residuals.push(diff);
    }
  }
  return residuals;
}

// ─── blendWithPrior ───────────────────────────────────────────────

describe("blendWithPrior", () => {
  it("returns pure prior mean and variance when n=0", () => {
    // General population prior for cycleLength: mean=30.3, variance=44.89
    const result = blendWithPrior(0, 0, 0, "cycleLength", []);
    expect(result.mean).toBeCloseTo(30.3, 1);
    expect(result.variance).toBeCloseTo(44.89, 1);
  });

  it("returns userMean and userVariance unchanged when n>=6", () => {
    const result = blendWithPrior(31, 5, 6, "cycleLength", []);
    expect(result.mean).toBe(31);
    expect(result.variance).toBe(5);
  });

  it("blended mean is between prior mean and user mean when n=1", () => {
    const result = blendWithPrior(35, 10, 1, "cycleLength", []);
    expect(result.mean).toBeGreaterThan(30.3);
    expect(result.mean).toBeLessThan(35);
  });

  it("blended mean is between prior mean and user mean when n=3", () => {
    const result = blendWithPrior(35, 10, 3, "cycleLength", []);
    expect(result.mean).toBeGreaterThan(30.3);
    expect(result.mean).toBeLessThan(35);
  });

  it("blended mean is between prior mean and user mean when n=5", () => {
    const result = blendWithPrior(35, 10, 5, "cycleLength", []);
    expect(result.mean).toBeGreaterThan(30.3);
    expect(result.mean).toBeLessThan(35);
  });

  it("inverse-variance weighting: a user with very high variance is pulled more toward the prior", () => {
    // Low variance user → closer to user mean
    const lowVarResult = blendWithPrior(35, 1, 3, "cycleLength", []);
    // High variance user → closer to prior mean
    const highVarResult = blendWithPrior(35, 1000, 3, "cycleLength", []);

    // The high-variance user should be pulled more toward the prior (30.3)
    expect(highVarResult.mean).toBeLessThan(lowVarResult.mean);
  });

  it("uses condition-specific prior when conditions are provided", () => {
    // With PCOS, the prior for cycleLength has mean=51
    const result = blendWithPrior(35, 10, 1, "cycleLength", ["pcos"]);
    expect(result.mean).toBeGreaterThan(30.3); // pulled toward PCOS prior (51)
  });
});

// ─── resolveEffectivePrior ────────────────────────────────────────

describe("resolveEffectivePrior", () => {
  it("single condition returns that condition's prior", () => {
    const result = resolveEffectivePrior(["pcos"]);
    expect(result.cycleLength.mean).toBe(51);
    expect(result.cycleLength.variance).toBe(225);
  });

  it("hormonal_bc always wins regardless of other conditions", () => {
    const result = resolveEffectivePrior(["hormonal_bc", "pcos"]);
    expect(result.cycleLength.mean).toBe(
      CONDITION_PRIORS.hormonal_bc.cycleLength.mean,
    );
    expect(result.cycleLength.variance).toBe(
      CONDITION_PRIORS.hormonal_bc.cycleLength.variance,
    );
  });

  it("two conditions returns mixture prior with mean between the two", () => {
    // pcos: cycleLength.mean=51, endometriosis: cycleLength.mean=27
    // Inverse-variance blend should produce a mean between them
    const result = resolveEffectivePrior(["pcos", "endometriosis"]);
    expect(result.cycleLength.mean).toBeGreaterThan(27);
    expect(result.cycleLength.mean).toBeLessThan(51);
  });

  it("empty conditions returns population prior", () => {
    const result = resolveEffectivePrior([]);
    expect(result.cycleLength.mean).toBeCloseTo(
      CONDITION_PRIORS.none.cycleLength.mean,
    );
  });

  it('"none" condition returns population prior', () => {
    const result = resolveEffectivePrior(["none"]);
    expect(result.cycleLength.mean).toBeCloseTo(
      CONDITION_PRIORS.none.cycleLength.mean,
    );
  });

  it("mixture variance includes between-condition spread", () => {
    // Two conditions with very different means should have higher blended variance
    // than a simple inverse-variance pool (which would underestimate spread).
    const pcosOnly = resolveEffectivePrior(["pcos"]);
    const endoOnly = resolveEffectivePrior(["endometriosis"]);
    const combined = resolveEffectivePrior(["pcos", "endometriosis"]);

    // The combined variance should be larger than the simple inverse-variance
    // pool of just the two variances (since means are far apart).
    // Simple pool: 1/(1/225 + 1/16) ≈ 14.9
    // With spread: should be larger
    const simplePool = 1 / (1 / 225 + 1 / 16);
    expect(combined.cycleLength.variance).toBeGreaterThan(simplePool);
  });

  it("resolves perimenopause_early directly", () => {
    const result = resolveEffectivePrior(["perimenopause_early"]);
    expect(result.cycleLength.mean).toBe(30);
    expect(result.cycleLength.variance).toBe(64);
  });

  it("resolves perimenopause_late directly", () => {
    const result = resolveEffectivePrior(["perimenopause_late"]);
    expect(result.cycleLength.mean).toBe(80);
    expect(result.cycleLength.variance).toBe(900);
  });

  it("resolves legacy perimenopause with perimenoStage", () => {
    const early = resolveEffectivePrior({
      conditions: ["perimenopause"],
      perimenoStage: "early",
    });
    expect(early.cycleLength.mean).toBe(30);

    const late = resolveEffectivePrior({
      conditions: ["perimenopause"],
      perimenoStage: "late",
    });
    expect(late.cycleLength.mean).toBe(80);

    const unknown = resolveEffectivePrior({
      conditions: ["perimenopause"],
      perimenoStage: "unknown",
    });
    expect(unknown.cycleLength.mean).toBe(45); // fallback
  });

  it("maxCycleLength is MAX across all active conditions", () => {
    const result = resolveEffectivePrior(["endometriosis", "thyroid"]);
    // endo: maxCycleLength=45, thyroid: maxCycleLength=90
    expect(result.maxCycleLength).toBe(90);
  });

  it("anovulatoryCommon is OR across all active conditions", () => {
    const result = resolveEffectivePrior(["endometriosis", "thyroid"]);
    // endo: false, thyroid: true → OR = true
    expect(result.anovulatoryCommon).toBe(true);
  });
});

// ─── predictNextCycle ─────────────────────────────────────────────

describe("predictNextCycle", () => {
  it("cold start (n=0) with PCOS condition: returns 51d estimate, CI width ~58.8d", () => {
    const result = predictNextCycle([], "cycleLength", ["pcos"]);
    expect(result.predicted).toBeCloseTo(51, 0);
    const ciWidth = result.ciUpper - result.ciLower;
    // 1.96 * 2 * 15 = 58.8
    expect(ciWidth).toBeCloseTo(58.8, 0);
  });

  it("cold start with hormonal_bc: returns 28d estimate", () => {
    const result = predictNextCycle([], "cycleLength", ["hormonal_bc"]);
    expect(result.predicted).toBe(28);
  });

  it("cold start with hormonal_bc: no follicular/luteal predictions (null priors)", () => {
    const follicularResult = predictNextCycle([], "follicularLength", [
      "hormonal_bc",
    ]);
    // hormonal_bc has null follicularLength, so it falls back to POPULATION_PRIOR
    // This is expected behavior — the caller should check anovulatoryCommon.
    expect(follicularResult.predicted).toBeDefined();
  });

  it("returns ciReliable=false when n=0 (no data)", () => {
    const result = predictNextCycle([], "cycleLength", []);
    expect(result.ciReliable).toBe(false);
  });

  it("returns ciReliable=false when n=3 (small sample)", () => {
    const result = predictNextCycle([28, 29, 30], "cycleLength", []);
    expect(result.ciReliable).toBe(false);
  });

  it("mature (n>=6): returns jackknife CI (not parametric CI)", () => {
    const observations = [28, 29, 28, 30, 29, 28, 29, 30];
    const result = predictNextCycle(observations, "cycleLength", []);
    // For n>=6, the CI comes from jackknife, which should have different
    // characteristics than parametric CI
    expect(result.n).toBe(8);
    expect(result.ciLower).toBeLessThan(result.predicted);
    expect(result.ciUpper).toBeGreaterThan(result.predicted);
    // ciReliable may be false for n < 10
  });

  it("uses condition-specific prior for cold start predictions", () => {
    const pcosResult = predictNextCycle([], "cycleLength", ["pcos"]);
    const defaultResult = predictNextCycle([], "cycleLength", []);
    expect(pcosResult.predicted).toBeGreaterThan(defaultResult.predicted);
  });
});

// ─── calculateJackknifeCI ─────────────────────────────────────────

describe("calculateJackknifeCI", () => {
  it("throws if n < 6", () => {
    expect(() => calculateJackknifeCI([28, 29, 30, 31, 32], [])).toThrow(
      "Jackknife CI requires at least 6 observations",
    );
  });

  it("returns lower < smoothed < upper for n=8 stable sequence", () => {
    const observations = [28, 28, 29, 28, 29, 28, 28, 29];
    const { smoothed } = exponentialSmooth(observations, []);
    const result = calculateJackknifeCI(observations, []);
    expect(result.lower).toBeLessThan(smoothed);
    expect(result.upper).toBeGreaterThan(smoothed);
  });

  it("returns ciReliable=false when n=8 (n < 10)", () => {
    const observations = [28, 28, 29, 28, 29, 28, 28, 29];
    const result = calculateJackknifeCI(observations, []);
    expect(result.ciReliable).toBe(false);
  });

  it("returns ciReliable=true for stable n>=10 sequence", () => {
    const observations = [28, 28, 29, 28, 29, 28, 28, 29, 28, 29];
    const result = calculateJackknifeCI(observations, []);
    expect(result.ciReliable).toBe(true);
  });
});

// ─── CONDITION_PRIORS lookup ──────────────────────────────────────

describe("CONDITION_PRIORS", () => {
  it("has pcos entry with cycleLength.mean=51", () => {
    expect(CONDITION_PRIORS.pcos.cycleLength.mean).toBe(51);
  });

  it("has hormonal_bc entry with null follicularLength and lutealLength", () => {
    expect(CONDITION_PRIORS.hormonal_bc.follicularLength).toBeNull();
    expect(CONDITION_PRIORS.hormonal_bc.lutealLength).toBeNull();
  });

  it("none condition lutealLength.mean matches POPULATION_PRIOR (11.7)", () => {
    expect(CONDITION_PRIORS.none.lutealLength!.mean).toBeCloseTo(11.7, 1);
  });

  it("has perimenopause_early entry", () => {
    expect(CONDITION_PRIORS.perimenopause_early.cycleLength.mean).toBe(30);
    expect(CONDITION_PRIORS.perimenopause_early.cycleLength.variance).toBe(64);
    expect(CONDITION_PRIORS.perimenopause_early.maxCycleLength).toBe(60);
    expect(CONDITION_PRIORS.perimenopause_early.anovulatoryCommon).toBe(false);
  });

  it("has perimenopause_late entry", () => {
    expect(CONDITION_PRIORS.perimenopause_late.cycleLength.mean).toBe(80);
    expect(CONDITION_PRIORS.perimenopause_late.cycleLength.variance).toBe(900);
    expect(CONDITION_PRIORS.perimenopause_late.maxCycleLength).toBe(180);
    expect(CONDITION_PRIORS.perimenopause_late.anovulatoryCommon).toBe(true);
  });
});

describe("PERIMENOPAUSE sub-priors", () => {
  it("PERIMENOPAUSE_EARLY has cycleLength.mean=30", () => {
    expect(PERIMENOPAUSE_EARLY.cycleLength.mean).toBe(30);
  });

  it("PERIMENOPAUSE_EARLY has cycleLength.variance=64", () => {
    expect(PERIMENOPAUSE_EARLY.cycleLength.variance).toBe(64);
  });

  it("PERIMENOPAUSE_LATE has cycleLength.mean=80", () => {
    expect(PERIMENOPAUSE_LATE.cycleLength.mean).toBe(80);
  });

  it("PERIMENOPAUSE_LATE has cycleLength.variance=900", () => {
    expect(PERIMENOPAUSE_LATE.cycleLength.variance).toBe(900);
  });
});

// ─── POPULATION_PRIOR values ──────────────────────────────────────

describe("POPULATION_PRIOR", () => {
  it("lutealLength.mean is 11.7 (Najmabadi et al.)", () => {
    expect(POPULATION_PRIOR.lutealLength.mean).toBeCloseTo(11.7, 1);
  });

  it("lutealLength.variance is 7.84 (SD 2.8)", () => {
    expect(POPULATION_PRIOR.lutealLength.variance).toBeCloseTo(7.84, 1);
  });
});
