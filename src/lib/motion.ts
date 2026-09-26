/**
 * Spring presets tuned to feel like UIKit / SwiftUI defaults. Use these rather
 * than ad hoc durations so every surface moves the same way.
 */
export const spring = {
  /** Default: SwiftUI .smooth. Most state changes, cards, sheets. */
  smooth: { type: "spring", duration: 0.5, bounce: 0 },
  /** Quick feedback: toggles, segmented thumbs, small swaps. */
  snappy: { type: "spring", duration: 0.32, bounce: 0.12 },
  /** A little life for moments of delight (a logged period, a new day). */
  bouncy: { type: "spring", duration: 0.55, bounce: 0.24 },
} as const;
