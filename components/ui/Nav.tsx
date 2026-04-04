"use client";

/**
 * Nav — minimal fixed progress nav.
 * Hidden during hero scene (which has its own integrated topbar).
 * Shows for problem → CTA with scene label + cyan progress bar.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type Lenis from "lenis";
import { SCENES, TIMELINE_DURATION } from "@/lib/constants";

interface NavProps {
  lenisRef: React.MutableRefObject<Lenis | null>;
}

const NAV_ITEMS = [
  { label: "01 COMMAND", start: SCENES.hero.start },
  { label: "02 THE CRISIS", start: SCENES.problem.start },
  { label: "03 CAPABILITIES", start: SCENES.features.start },
  { label: "04 PIPELINE", start: SCENES.howitworks.start },
  { label: "05 DEPLOY", start: SCENES.cta.start },
] as const;

function progressToScene(p: number): string {
  const t = p * TIMELINE_DURATION;
  if (t < SCENES.problem.start)    return "01 — COMMAND";
  if (t < SCENES.features.start)   return "02 — THE CRISIS";
  if (t < SCENES.howitworks.start) return "03 — CAPABILITIES";
  if (t < SCENES.cta.start)        return "04 — PIPELINE";
  return "05 — DEPLOY";
}

function isHeroScene(p: number): boolean {
  return p * TIMELINE_DURATION < SCENES.problem.start - 0.2;
}

export function Nav({ lenisRef }: NavProps) {
  const [sceneLabel, setSceneLabel] = useState("01 — COMMAND");
  const [onHero, setOnHero]         = useState(true);
  const [progress, setProgress] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);

  const setFromProgress = (pRaw: number) => {
    const p = Math.max(0, Math.min(1, pRaw));
    setProgress(p);
    setSceneLabel(progressToScene(p));
    setOnHero(isHeroScene(p));
    if (barRef.current) {
      barRef.current.style.transform = `scaleX(${p})`;
    }
  };

  const getWindowProgress = () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    return scrollHeight > 0 ? window.scrollY / scrollHeight : 0;
  };

  const scrollToScene = (sceneStartSec: number) => {
    const targetProgress = sceneStartSec / TIMELINE_DURATION;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const targetY = Math.max(0, Math.round(targetProgress * maxScroll));

    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(targetY, { duration: 1.1 });
      return;
    }

    window.scrollTo({ top: targetY, behavior: "smooth" });
  };

  useEffect(() => {
    let onScroll: ((data: { progress: number }) => void) | null = null;
    let rafId = 0;

    const onWindowScroll = () => {
      setFromProgress(getWindowProgress());
    };
    window.addEventListener("scroll", onWindowScroll, { passive: true });
    onWindowScroll();

    const tryAttachLenis = () => {
      const lenis = lenisRef.current;
      if (!lenis) {
        rafId = requestAnimationFrame(tryAttachLenis);
        return;
      }

      onScroll = ({ progress: p }: { progress: number }) => {
        setFromProgress(p);
      };

      lenis.on("scroll", onScroll);
    };

    rafId = requestAnimationFrame(tryAttachLenis);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onWindowScroll);
      const lenis = lenisRef.current;
      if (lenis && onScroll) lenis.off("scroll", onScroll);
    };
  }, [lenisRef]);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between pointer-events-none transition-opacity duration-500"
      style={{
        opacity:   onHero ? 0 : 1,
        height:    "48px",
        padding:   "0 2rem",
        background: "rgba(5,10,18,0.82)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(28,46,66,0.5)",
      }}
    >
      <div className="pointer-events-auto flex items-center gap-2">
        <div
          style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "var(--pulse)",
            boxShadow: "0 0 6px var(--pulse)",
          }}
        />
        <span
          className="font-display"
          style={{ fontSize: "0.95rem", letterSpacing: "0.14em", color: "var(--pulse)" }}
        >
          NETRA
        </span>
      </div>

      <div className="hidden md:flex pointer-events-auto items-center gap-3">
        {NAV_ITEMS.map((item) => {
          const itemProgress = item.start / TIMELINE_DURATION;
          const active = progress >= itemProgress && progress < itemProgress + 0.22;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => scrollToScene(item.start)}
              className="font-mono uppercase transition-colors"
              style={{
                fontSize: "0.56rem",
                letterSpacing: "0.18em",
                color: active ? "var(--pulse)" : "var(--dim)",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="pointer-events-auto flex items-center gap-3">
        <div
          className="md:hidden font-mono uppercase transition-all duration-400"
          style={{ fontSize: "0.58rem", letterSpacing: "0.22em", color: "var(--dim)" }}
        >
          {sceneLabel}
        </div>
        <Link
          href="/dashboard"
          className="font-mono uppercase transition-colors hover:opacity-90"
          style={{
            fontSize: "0.56rem",
            letterSpacing: "0.18em",
            color: "var(--pulse)",
            border: "1px solid rgba(0, 200, 255, 0.45)",
            padding: "0.35rem 0.65rem",
          }}
        >
          Dashboard
        </Link>
      </div>

      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{ height: "1px", background: "rgba(28,46,66,0.4)" }}
      >
        <div
          ref={barRef}
          style={{
            height: "100%",
            background: "var(--pulse)",
            transformOrigin: "left",
            transform: "scaleX(0)",
            willChange: "transform",
            boxShadow: "0 0 4px var(--pulse)",
          }}
        />
      </div>
    </nav>
  );
}
