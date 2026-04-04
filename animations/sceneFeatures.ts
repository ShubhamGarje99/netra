/**
 * Scene 3 — Features / Capabilities (SkyLens dashboard style)
 * Duration: 4 seconds (7s → 11s in master).
 *
 * GSAP: cross-fade, content entrance/exit.
 * anime.js (sceneEvents): video panel, telemetry, feature cards, compass.
 */

import { gsap }            from "@/lib/gsap";
import { emitSceneActive } from "@/lib/sceneEvents";
import { EASE, DUR, SCENE_CROSS_FADE } from "./motionConfig";

export function sceneFeatures(): gsap.core.Timeline {
  const tl = gsap.timeline();

  tl.set(".scene-features", { opacity: 0 }, 0);

  tl.to(".scene-features", {
    opacity: 1, duration: SCENE_CROSS_FADE, ease: EASE.smooth,
  }, 0);

  tl.call(() => emitSceneActive("features"), [], 0.1);

  tl.to(".scene-features .features-content", {
    yPercent: -5, opacity: 0, duration: DUR.md, ease: EASE.inOut,
  }, 4 - SCENE_CROSS_FADE);

  tl.to(".scene-features", {
    opacity: 0, duration: SCENE_CROSS_FADE, ease: EASE.smooth,
  }, 4);

  return tl;
}
