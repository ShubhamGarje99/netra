/**
 * Motion Grammar Config
 * Shared timing, easing, and motion constants for all scene timelines.
 */

export const EASE = {
  out: "power3.out",
  inOut: "power2.inOut",
  in: "power4.in",
  elastic: "elastic.out(1, 0.4)",
  smooth: "power1.inOut",
} as const;

export const REVEAL = {
  duration: 0.9,
  ease: EASE.out,
  y: 60,
  opacity: 0,
} as const;

export const STAGGER = {
  each: 0.08,
  ease: EASE.out,
} as const;

export const TYPE = {
  maskRevealFrom: "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)",
  maskRevealTo: "polygon(0 0%, 100% 0%, 100% 100%, 0 100%)",
  duration: 0.8,
  ease: EASE.out,
} as const;

export const DUR = {
  xs: 0.3,
  sm: 0.5,
  md: 0.8,
  lg: 1.2,
  xl: 1.8,
} as const;

export const SCENE_CROSS_FADE = 0.4;
