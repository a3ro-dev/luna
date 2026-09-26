/**
 * EXPLORATORY (beyond the H1 protocol): tuning the Huber cutoff and the
 * median location, run after the confirmatory results were in. Not eligible
 * for the improvement rule.
 */
import type { Model } from "../../../src/lib/prediction/backtest.ts";
import { variant } from "./model.ts";

export const models: Record<string, Model> = {
  "H1x-reimpl-check": variant("mean", "classic"), // must equal v2-bayes exactly
  "H1x-huber-k1.0": variant("huber", "classic", 1.0),
  "H1x-huber-k0.7": variant("huber", "classic", 0.7),
  "H1x-huber-k2.0": variant("huber", "classic", 2.0),
  "H1x-median": variant("median", "classic"),
  "H1x-huber-k1.0-mad": variant("huber", "mad", 1.0),
};
