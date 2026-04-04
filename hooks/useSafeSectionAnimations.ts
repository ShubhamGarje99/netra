"use client";

import { useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

const SECTION_IDS = ["hero", "crisis", "capabilities", "pipeline", "deploy"] as const;

export function useSafeSectionAnimations() {
  useEffect(() => {
    const selectors = SECTION_IDS.map((id) => `#${id} .section-content`).join(",");

    // Never hide sections. Animate only content wrappers.
    gsap.set(selectors, {
      opacity: 0.9,
      y: 20,
      visibility: "visible",
    });

    const triggers = SECTION_IDS.map((id) =>
      ScrollTrigger.create({
        trigger: `#${id}`,
        start: "top 80%",
        invalidateOnRefresh: true,
        onEnter: () => {
          gsap.to(`#${id} .section-content`, {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: "power2.out",
            overwrite: "auto",
          });
        },
        onEnterBack: () => {
          gsap.to(`#${id} .section-content`, {
            opacity: 1,
            y: 0,
            duration: 0.35,
            ease: "power2.out",
            overwrite: "auto",
          });
        },
        // If scrolling skips trigger boundaries, force content visible.
        onLeaveBack: () => {
          gsap.set(`#${id} .section-content`, { opacity: 1, y: 0, visibility: "visible" });
        },
      })
    );

    // Global failsafe: after 3s ensure no section content remains hidden.
    const timer = window.setTimeout(() => {
      gsap.set(selectors, { opacity: 1, y: 0, visibility: "visible" });
      gsap.set("#hero [style*='opacity: 0'], #crisis [style*='opacity: 0'], #capabilities [style*='opacity: 0'], #pipeline [style*='opacity: 0'], #deploy [style*='opacity: 0']", {
        opacity: 1,
        visibility: "visible",
      });
    }, 3000);

    ScrollTrigger.refresh();

    return () => {
      window.clearTimeout(timer);
      triggers.forEach((trigger) => trigger.kill());
    };
  }, []);
}
