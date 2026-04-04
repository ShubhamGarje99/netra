"use client";

import { useEffect, useRef } from "react";
import type Lenis from "lenis";
import { gsap } from "gsap";
import { buildMasterTimeline } from "@/animations/masterTimeline";

export function useMasterTimeline(
  lenisRef: React.MutableRefObject<Lenis | null>
) {
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    let lenisScrollHandler: ((data: { progress: number }) => void) | null = null;
    let rafId = 0;

    // Set ground-truth initial states before building timeline
    gsap.set(".scene-hero", { opacity: 1 });
    gsap.set(".scene-problem", { opacity: 0 });
    gsap.set(".scene-features", { opacity: 0 });
    gsap.set(".scene-howitworks", { opacity: 0 });
    gsap.set(".scene-cta", { opacity: 0 });

    const master = buildMasterTimeline();
    timelineRef.current = master;

    const seekFromProgress = (progress: number) => {
      const p = Math.max(0, Math.min(1, progress));
      master.seek(Math.max(0.001, p * master.duration()));
    };

    const getWindowProgress = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      return scrollHeight > 0 ? window.scrollY / scrollHeight : 0;
    };

    // Always keep a native scroll fallback so sections never stay hidden.
    const windowScrollHandler = () => {
      seekFromProgress(getWindowProgress());
    };
    window.addEventListener("scroll", windowScrollHandler, { passive: true });

    // Seek to the current position immediately on mount.
    seekFromProgress(getWindowProgress());

    const tryAttachLenis = () => {
      const lenis = lenisRef.current;
      if (!lenis) {
        rafId = requestAnimationFrame(tryAttachLenis);
        return;
      }

      lenisScrollHandler = (e: any) => {
        const p = e?.progress ?? getWindowProgress();
        seekFromProgress(p);
      };

      lenis.on("scroll", lenisScrollHandler);
    };

    rafId = requestAnimationFrame(tryAttachLenis);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", windowScrollHandler);
      const lenis = lenisRef.current;
      if (lenis && lenisScrollHandler) lenis.off("scroll", lenisScrollHandler);
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }
    };
  }, [lenisRef]);

  return timelineRef;
}
