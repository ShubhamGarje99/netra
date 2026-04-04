/**
 * Scene 4 — How It Works / Pipeline
 * Duration: 4 seconds (11s → 15s in master).
 *
 * GSAP: cross-fade, content exit.
 * anime.js (sceneEvents): step stagger, connector fill, data badges.
 */

import { gsap }            from "@/lib/gsap";
import { emitSceneActive } from "@/lib/sceneEvents";
import { EASE, DUR, SCENE_CROSS_FADE } from "./motionConfig";

export function sceneHowItWorks(): gsap.core.Timeline {
  const tl = gsap.timeline();

  tl.set(".scene-howitworks", { opacity: 0 }, 0);

  tl.to(".scene-howitworks", {
    opacity: 1, duration: SCENE_CROSS_FADE, ease: EASE.smooth,
  }, 0);

  tl.call(() => emitSceneActive("howitworks"), [], 0.1);

  tl.to(".scene-howitworks .pipeline-content", {
    yPercent: -5, opacity: 0, duration: DUR.md, ease: EASE.inOut,
  }, 4 - SCENE_CROSS_FADE);

  tl.to(".scene-howitworks", {
    opacity: 0, duration: SCENE_CROSS_FADE, ease: EASE.smooth,
  }, 4);

  return tl;
}
