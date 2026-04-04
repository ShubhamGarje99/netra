"use client";

import { useEffect, useRef } from "react";
import { onSceneActive } from "@/lib/sceneEvents";
import Link from "next/link";
import { gsap } from "@/lib/gsap";

const TERM_LINES = [
  { type: "cmd", text: "$ netra-deploy --region=pune --fleet=47" },
  { type: "out", text: "> Connecting to GRID network..." },
  { type: "ok",  text: "> AUTH: clearance GRANTED — level 5" },
  { type: "out", text: "> Synchronizing 47 drone nodes..." },
  { type: "ok",  text: "> Fleet status: ALL SYSTEMS NOMINAL" },
  { type: "out", text: "> Activating AI detection matrix..." },
  { type: "ok", text: "> Command stack ready — open dashboard for live simulation state" },
];

export function SceneCTA() {
  const animatedRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      gsap.set("#deploy .section-content", { opacity: 1, y: 0, visibility: "visible" });
      gsap.set("#deploy [style*='opacity: 0']", { opacity: 1, visibility: "visible" });
    }, 3000);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const off = onSceneActive("cta", () => {
      if (animatedRef.current) return;
      animatedRef.current = true;

      import("animejs").then(({ animate, stagger }) => {
        animate(".cta-bg-ring", {
          scale: [0.1, 1], opacity: [0, 1], duration: 1600, ease: "outExpo", delay: stagger(200, { start: 100 }),
        });

        animate(".cta-scan-v", {
          translateY: ["-100%","100%"], duration: 2200, ease: "inOutQuart", delay: 200,
        });

        animate(".cta-label", { opacity: [0,1], translateY: ["-10px","0px"], duration: 400, ease: "outQuart", delay: 300 });

        animate(".cta-title-line", {
          opacity: [0,1], translateY: ["55px","0px"], duration: 700, ease: "outExpo", delay: stagger(120, { start: 400 }),
        });

        animate(".cta-terminal", { opacity: [0,1], duration: 400, ease: "outQuart", delay: 600 });

        animate(".cta-term-line", {
          opacity: [0,1], translateX: ["-6px","0px"], duration: 300, ease: "outQuart", delay: stagger(320, { start: 800 }),
        });

        const delay = TERM_LINES.length * 320 + 800;
        animate(".cta-button", {
          opacity: [0,1], translateY: ["16px","0px"], duration: 600, ease: "outBack(1.3)", delay,
        });
        animate(".cta-footer", { opacity: [0,1], duration: 500, ease: "outQuart", delay: delay + 300 });
      });
    });
    return off;
  }, []);

  const lineColor = (type: string) => {
    if (type === "ok")  return "var(--ops)";
    if (type === "cmd") return "var(--signal)";
    return "rgba(216,234,244,0.45)";
  };

  return (
    <section
      id="deploy"
      className="scene scene-cta"
      aria-label="Deploy"
      style={{ opacity: 1, visibility: "visible", position: "relative", minHeight: "100vh" }}
    >
      <div className="scanline-overlay" />

      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(28,46,66,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(28,46,66,0.05) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
      }} />

      {/* Radar rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
        {[200,340,480,620].map((s,i) => (
          <div key={i} className="cta-bg-ring absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-pulse/10"
            style={{ width: s, height: s, opacity: 0 }} />
        ))}
      </div>

      {/* Vertical scan */}
      <div className="cta-scan-v absolute inset-x-0 h-24 pointer-events-none z-10" style={{
        background: "linear-gradient(transparent, rgba(0,200,255,0.04), transparent)",
        transform: "translateY(-100%)",
      }} />

      <div className="section-content cta-content relative z-20 flex flex-col items-center justify-center h-full text-center px-8 pb-10">
        <span className="cta-label font-mono text-[9px] tracking-[0.35em] text-dim uppercase mb-8" style={{ opacity: 0 }}>
          // 05 DEPLOY
        </span>

        <h2 className="font-display text-signal leading-none mb-10 shrink-0"
          style={{ fontSize: "clamp(2.2rem,9vw,7rem)" }}>
          <div className="overflow-hidden"><span className="cta-title-line block" style={{ opacity: 0 }}>ENTER THE</span></div>
          <div className="overflow-hidden"><span className="cta-title-line block text-pulse" style={{ opacity: 0 }}>COMMAND CENTER.</span></div>
        </h2>

        <div className="cta-terminal mb-8 w-full max-w-xl" style={{ opacity: 0 }}>
          <div className="cta-terminal-header">
            <div className="cta-terminal-dot bg-critical" />
            <div className="cta-terminal-dot bg-high" />
            <div className="cta-terminal-dot bg-pulse" />
            <span className="ml-2 text-[9px] text-dim tracking-widest">netra-terminal — deploy</span>
          </div>
          <div className="py-3 space-y-0">
            {TERM_LINES.map((line, i) => (
              <div key={i} className="cta-term-line" style={{ color: lineColor(line.type), opacity: 0 }}>
                {line.text}
              </div>
            ))}
            <div className="cta-term-line" style={{ color: "var(--ops)", opacity: 0 }}>
              &gt; Ready. <span className="cta-cursor" />
            </div>
          </div>
        </div>

        <Link href="/dashboard" className="cta-button inline-flex items-center gap-3 font-mono text-sm tracking-wider uppercase px-10 py-4"
          style={{ opacity: 0 }} data-cursor="hover">
          <span>Launch Dashboard</span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </Link>

        <div className="cta-footer absolute bottom-8 left-0 right-0 flex justify-center gap-8" style={{ opacity: 0 }}>
          <span className="font-mono text-[9px] text-dim/40 tracking-widest">NETRA v2.1</span>
          <span className="font-mono text-[9px] text-dim/40 tracking-widest">PROTOTYPE</span>
          <span className="font-mono text-[9px] text-dim/40 tracking-widest">2026</span>
        </div>
      </div>
    </section>
  );
}
