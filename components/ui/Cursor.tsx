"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mx = 0, my = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      gsap.set(dot, { x: mx, y: my });
    };

    const tickRing = () => {
      gsap.to(ring, {
        x: mx,
        y: my,
        duration: 0.35,
        ease: "power2.out",
        overwrite: "auto",
      });
    };

    const onEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const state = target.closest("[data-cursor]")?.getAttribute("data-cursor");

      if (state === "hover") {
        gsap.to(ring, { scale: 2.2, opacity: 0.6, duration: 0.3, ease: "power2.out" });
        gsap.to(dot, { scale: 0.4, duration: 0.3 });
      }
    };

    const onLeave = () => {
      gsap.to(ring, { scale: 1, opacity: 0.5, duration: 0.4, ease: "power2.out" });
      gsap.to(dot, { scale: 1, duration: 0.3 });
    };

    const onLeaveWindow = () => {
      gsap.to([dot, ring], { opacity: 0, duration: 0.2 });
    };
    const onEnterWindow = () => {
      gsap.to([dot, ring], { opacity: 1, duration: 0.2 });
    };

    gsap.ticker.add(tickRing);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onEnter);
    window.addEventListener("mouseout", onLeave);
    document.addEventListener("mouseleave", onLeaveWindow);
    document.addEventListener("mouseenter", onEnterWindow);

    return () => {
      gsap.ticker.remove(tickRing);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onEnter);
      window.removeEventListener("mouseout", onLeave);
      document.removeEventListener("mouseleave", onLeaveWindow);
      document.removeEventListener("mouseenter", onEnterWindow);
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        className="cursor-dot fixed top-0 left-0 w-2 h-2 rounded-full bg-signal pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2"
        style={{ willChange: "transform" }}
      />
      <div
        ref={ringRef}
        className="cursor-ring fixed top-0 left-0 w-10 h-10 rounded-full border border-signal/50 pointer-events-none z-[9998] -translate-x-1/2 -translate-y-1/2"
        style={{ willChange: "transform", opacity: 0.5 }}
      />
    </>
  );
}
