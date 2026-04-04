/**
 * Scene timing constants for NETRA landing page.
 *
 * Timeline model:
 *   Total duration = 18 seconds
 *   1 second = 100vh of scroll
 *   Total page scroll height = 1800vh
 *
 * Scene durations:
 *   Hero:        3s  → 300vh
 *   Problem:     4s  → 400vh
 *   Features:    4s  → 400vh
 *   HowItWorks:  4s  → 400vh
 *   CTA:         3s  → 300vh
 *   TOTAL:      18s  → 1800vh
 */

export const TIMELINE_DURATION = 18;

export const SCENES = {
  hero: {
    start: 0,
    end: 3,
    label: "hero",
    scrollVh: 300,
  },
  problem: {
    start: 3,
    end: 7,
    label: "problem",
    scrollVh: 400,
  },
  features: {
    start: 7,
    end: 11,
    label: "features",
    scrollVh: 400,
  },
  howitworks: {
    start: 11,
    end: 15,
    label: "howitworks",
    scrollVh: 400,
  },
  cta: {
    start: 15,
    end: 18,
    label: "cta",
    scrollVh: 300,
  },
} as const;

export const TOTAL_SCROLL_VH = Object.values(SCENES).reduce(
  (sum, s) => sum + s.scrollVh,
  0
);
