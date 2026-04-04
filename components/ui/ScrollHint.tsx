"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import type Lenis from "lenis";

interface ScrollHintProps {
  lenisRef: React.MutableRefObject<Lenis | null>;
}

export function ScrollHint({ lenisRef }: ScrollHintProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let onScroll: ((data: { progress: number }) => void) | null = null;
    let rafId = 0;

    const hideHint = () => {
      if (!ref.current) return;
      gsap.to(ref.current, { opacity: 0, yPercent: 20, duration: 0.5, ease: "power2.out" });
    };

    if (window.scrollY > 200) {
      hideHint();
      return;
    }

    const tryAttachLenis = () => {
      const lenis = lenisRef.current;
      if (!lenis || !ref.current) {
        rafId = requestAnimationFrame(tryAttachLenis);
        return;
      }

      onScroll = ({ progress }: { progress: number }) => {
        if (progress > 0.02) {
          hideHint();
          lenis.off("scroll", onScroll!);
          onScroll = null;
        }
      };

      lenis.on("scroll", onScroll);
    };

    rafId = requestAnimationFrame(tryAttachLenis);

    return () => {
      cancelAnimationFrame(rafId);
      const lenis = lenisRef.current;
      if (lenis && onScroll) lenis.off("scroll", onScroll);
    };
  }, [lenisRef]);

  return (
    <div
      ref={ref}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none"
      style={{ opacity: 0.5 }}
    >
      <div className="relative w-px h-8 bg-signal/10 overflow-hidden">
        <div className="absolute top-0 w-full h-1/2 bg-signal/50 animate-scroll-line" />
      </div>
      <span className="font-mono text-[10px] text-dim/40 tracking-[0.2em] uppercase">Scroll</span>
    </div>
  );
}
