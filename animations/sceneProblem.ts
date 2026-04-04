/**
 * Scene 2 — Problem / The Crisis (aerial detection style)
 * Duration: 4 seconds (3s → 7s in master).
 *
 * GSAP: cross-fade, content exit.
 * anime.js (sceneEvents): grid flash, city dots, title, stat counters, incident markers.
 */

import { gsap }            from "@/lib/gsap";
import { emitSceneActive } from "@/lib/sceneEvents";
import { EASE, DUR, SCENE_CROSS_FADE } from "./motionConfig";

export function sceneProblem(): gsap.core.Timeline {
  const tl = gsap.timeline();

  tl.set(".scene-problem", { opacity: 0 }, 0);

  tl.to(".scene-problem", {
    opacity: 1, duration: SCENE_CROSS_FADE, ease: EASE.smooth,
  }, 0);

  tl.call(() => emitSceneActive("problem"), [], 0.1);

  tl.to(".scene-problem .problem-content", {
    yPercent: -5, opacity: 0, duration: DUR.md, ease: EASE.inOut,
  }, 4 - SCENE_CROSS_FADE);

  tl.to(".scene-problem", {
    opacity: 0, duration: SCENE_CROSS_FADE, ease: EASE.smooth,
  }, 4);

  return tl;
}
