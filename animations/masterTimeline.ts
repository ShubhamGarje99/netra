/**
 * Master Timeline
 * Single source of truth for the landing page animation.
 *
 * Timeline map (seconds):
 *   Hero        0  → 3
 *   Problem     3  → 7
 *   Features    7  → 11
 *   HowItWorks  11 → 15
 *   CTA         15 → 18
 */

import { gsap } from "@/lib/gsap";
import { TIMELINE_DURATION, SCENES } from "@/lib/constants";

import { sceneHero }       from "./sceneHero";
import { sceneProblem }    from "./sceneProblem";
import { sceneFeatures }   from "./sceneFeatures";
import { sceneHowItWorks } from "./sceneHowItWorks";
import { sceneCTA }        from "./sceneCTA";

let _master: gsap.core.Timeline | null = null;

export function buildMasterTimeline(): gsap.core.Timeline {
  if (_master) {
    _master.kill();
    _master = null;
  }

  _master = gsap.timeline({
    paused: true,
    autoRemoveChildren: false,
  });

  _master.add(sceneHero(),       SCENES.hero.start);
  _master.add(sceneProblem(),    SCENES.problem.start);
  _master.add(sceneFeatures(),   SCENES.features.start);
  _master.add(sceneHowItWorks(), SCENES.howitworks.start);
  _master.add(sceneCTA(),        SCENES.cta.start);

  // Ensure total duration matches
  if (_master.duration() < TIMELINE_DURATION) {
    _master.to({}, { duration: TIMELINE_DURATION - _master.duration() });
  }

  return _master;
}

export function getMasterTimeline(): gsap.core.Timeline | null {
  return _master;
}

export function destroyMasterTimeline(): void {
  if (_master) {
    _master.kill();
    _master = null;
  }
}
