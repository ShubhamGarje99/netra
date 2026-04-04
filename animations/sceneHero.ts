/**
 * Scene 1 — Hero (Cinematic centered layout)
 * Duration: 3 seconds (0s → 3s in master).
 *
 * GSAP: scene fade-in, stage entrance, cross-fade out.
 * anime.js: character-by-character title, HUD cards, boot log, rings (fired on mount).
 */

import { gsap } from "@/lib/gsap";
import { EASE, DUR, SCENE_CROSS_FADE } from "./motionConfig";

export function sceneHero(): gsap.core.Timeline {
  const tl = gsap.timeline();

  /* ── Initial states ─────────────────────────────────────── */
  tl.set(".scene-hero",             { opacity: 1 }, 0);
  tl.set(".scene-hero .hero-stage", { opacity: 1, yPercent: 0 }, 0);

  /* ── 2.6s: Exit — stage drifts up ───────────────────────── */
  tl.to(".scene-hero .hero-stage", {
    yPercent: -4, opacity: 0,
    duration: DUR.md, ease: EASE.inOut,
  }, 3 - SCENE_CROSS_FADE);

  tl.to(".scene-hero .hero-statusbar", {
    opacity: 0, duration: DUR.sm, ease: EASE.smooth,
  }, 3 - SCENE_CROSS_FADE + 0.1);

  tl.to(".scene-hero .hero-topbar", {
    opacity: 0, duration: DUR.sm, ease: EASE.smooth,
  }, 3 - SCENE_CROSS_FADE + 0.1);

  tl.to(".scene-hero .hero-bootlog", {
    opacity: 0, duration: DUR.sm, ease: EASE.smooth,
  }, 3 - SCENE_CROSS_FADE + 0.1);

  /* ── Cross-fade out ──────────────────────────────────────── */
  tl.to(".scene-hero", {
    opacity: 0, duration: SCENE_CROSS_FADE, ease: EASE.smooth,
  }, 3);

  return tl;
}
