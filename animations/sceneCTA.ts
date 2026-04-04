/**
 * Scene 5 — CTA / Deploy
 * Duration: 3 seconds (15s → 18s in master).
 *
 * GSAP: cross-fade.
 * anime.js (sceneEvents): radar rings, vertical scan, title lines, terminal, button.
 * No exit animation — stays visible as last scene.
 */

import { gsap }            from "@/lib/gsap";
import { emitSceneActive } from "@/lib/sceneEvents";
import { EASE, SCENE_CROSS_FADE } from "./motionConfig";

export function sceneCTA(): gsap.core.Timeline {
  const tl = gsap.timeline();

  tl.set(".scene-cta", { opacity: 0 }, 0);

  tl.to(".scene-cta", {
    opacity: 1, duration: SCENE_CROSS_FADE, ease: EASE.smooth,
  }, 0);

  tl.call(() => emitSceneActive("cta"), [], 0.05);

  // No exit — final scene stays visible.

  return tl;
}
