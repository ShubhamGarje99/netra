"use client";

import { useEffect, useRef } from "react";
import { onSceneActive } from "@/lib/sceneEvents";
import { gsap } from "@/lib/gsap";

const STATS = [
  { id: "c-acc",  value: 2800000, display: "2.8M+", label: "Road accidents / year", sub: "World's highest", color: "var(--critical)" },
  { id: "c-resp", value: 16,      display: "16",    label: "Min avg police response", sub: "Critical window lost", color: "var(--high)" },
  { id: "c-rat",  value: 750,     display: "750",   label: "Citizens per officer", sub: "Severely understaffed", color: "var(--medium)" },
];

const INCIDENTS = [
  { id: 1, type: "FIRE DETECTED",      sev: "critical", x: 28, y: 35, detail: "Reporting to emergency services" },
  { id: 2, type: "CROWD SURGE",        sev: "high",     x: 58, y: 22, detail: "Density threshold exceeded" },
  { id: 3, type: "ROAD ACCIDENT",      sev: "critical", x: 72, y: 62, detail: "Multiple vehicles involved" },
  { id: 4, type: "SUSPICIOUS ACTIVITY",sev: "medium",   x: 42, y: 70, detail: "AI flagged for review" },
];

export function SceneProblem() {
  const animatedRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      gsap.set("#problem .section-content", { opacity: 1, y: 0, visibility: "visible" });
      gsap.set("#problem [style*='opacity: 0']", { opacity: 1, visibility: "visible" });
    }, 3000);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const off = onSceneActive("problem", () => {
      if (animatedRef.current) return;
      animatedRef.current = true;

      import("animejs").then(({ animate, stagger }) => {
        /* Grid lines flash in */
        animate(".prob-grid-line", {
          opacity: [0, 0.08],
          duration: 1200,
          ease: "outQuart",
          delay: stagger(8),
        });

        /* City dot grid */
        animate(".prob-city-dot", {
          opacity: [0, 1],
          scale: [0, 1],
          duration: 400,
          ease: "outBack(2)",
          delay: stagger(20, { from: "random" }),
        });

        /* Section label + title */
        animate(".prob-label", {
          opacity: [0, 1],
          translateY: ["-10px", "0px"],
          duration: 400,
          ease: "outQuart",
          delay: 200,
        });
        animate(".prob-title-line", {
          opacity: [0, 1],
          translateY: ["50px", "0px"],
          duration: 700,
          ease: "outExpo",
          delay: stagger(120, { start: 300 }),
        });

        /* Stat cards */
        animate(".prob-stat-card", {
          opacity: [0, 1],
          translateY: ["40px", "0px"],
          scale: [0.94, 1],
          duration: 600,
          ease: "outExpo",
          delay: stagger(150, { start: 500 }),
        });

        /* Counters */
        STATS.forEach((stat) => {
          const el = document.getElementById(stat.id);
          if (!el) return;
          const obj = { val: 0 };
          animate(obj, {
            val: stat.value,
            duration: 2000,
            ease: "outExpo",
            delay: 600,
            onUpdate: () => {
              const v = Math.round(obj.val);
              el.textContent = v >= 1000000 ? (v / 1000000).toFixed(1) + "M+" : v.toLocaleString();
            },
          });
        });

        /* Incident markers pop in with stagger */
        animate(".prob-incident-marker", {
          opacity: [0, 1],
          scale: [0, 1],
          duration: 500,
          ease: "outBack(1.5)",
          delay: stagger(300, { start: 900 }),
        });

        /* Incident alert cards slide in */
        animate(".prob-alert-card", {
          opacity: [0, 1],
          translateX: ["20px", "0px"],
          duration: 450,
          ease: "outExpo",
          delay: stagger(250, { start: 1200 }),
        });

        /* Sub text */
        animate(".prob-sub", {
          opacity: [0, 1],
          translateY: ["14px", "0px"],
          duration: 600,
          ease: "outQuart",
          delay: 900,
        });

        /* Pulse rings on markers — loop */
        animate(".prob-pulse-ring", {
          scale: [1, 2.8],
          opacity: [0.6, 0],
          duration: 1600,
          ease: "outQuart",
          loop: true,
          delay: stagger(400),
        });
      });
    });
    return off;
  }, []);

  return (
    <section
      id="problem"
      className="scene scene-problem"
      aria-label="The Crisis"
      style={{ opacity: 1, visibility: "visible", position: "relative", minHeight: "100vh" }}
    >
      <div className="scanline-overlay" />

      {/* Aerial city grid background */}
      <div className="prob-aerial-bg">
        <svg className="w-full h-full" preserveAspectRatio="none">
          {Array.from({ length: 24 }).map((_, i) => (
            <line key={"v"+i} className="prob-grid-line"
              x1={`${(i+1)*(100/25)}%`} y1="0" x2={`${(i+1)*(100/25)}%`} y2="100%"
              stroke="#00C8FF" strokeWidth="0.5" opacity="0" />
          ))}
          {Array.from({ length: 14 }).map((_, i) => (
            <line key={"h"+i} className="prob-grid-line"
              x1="0" y1={`${(i+1)*(100/15)}%`} x2="100%" y2={`${(i+1)*(100/15)}%`}
              stroke="#00C8FF" strokeWidth="0.5" opacity="0" />
          ))}
          {/* City building silhouettes */}
          {[
            [5,60,8,40],[14,65,6,35],[22,58,10,42],[35,62,7,38],[48,55,9,45],
            [60,60,8,40],[70,58,12,42],[82,63,7,37],[90,60,9,40],
          ].map(([x, y, w, h], i) => (
            <rect key={i} x={`${x}%`} y={`${y}%`} width={`${w}%`} height={`${h}%`}
              fill="rgba(0,200,255,0.03)" stroke="rgba(0,200,255,0.06)" strokeWidth="0.5" />
          ))}
        </svg>
      </div>

      {/* Radial danger glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 60% 45%, rgba(255,45,74,0.07) 0%, transparent 55%)",
      }} />

      <div className="section-content problem-content relative z-20 flex h-full">
        {/* Left: text + stats */}
        <div className="flex flex-col justify-center px-8 md:px-16 lg:px-20 w-full lg:w-[55%]">
          <span className="prob-label font-mono text-[9px] tracking-[0.35em] text-dim uppercase mb-6" style={{ opacity: 0 }}>
            // 02 THE CRISIS
          </span>

          <h2 className="font-display text-signal leading-none mb-10 shrink-0"
            style={{ fontSize: "clamp(2.4rem,7.5vw,6rem)" }}>
            <div className="overflow-hidden">
              <span className="prob-title-line block" style={{ opacity: 0 }}>INDIA&apos;S CITIES</span>
            </div>
            <div className="overflow-hidden">
              <span className="prob-title-line block text-critical" style={{ opacity: 0 }}>ARE VULNERABLE.</span>
            </div>
          </h2>

          <div className="flex flex-col md:flex-row gap-5 mb-10">
            {STATS.map((stat) => (
              <div key={stat.id} className="prob-stat-card" style={{ opacity: 0 }}>
                <div id={stat.id} className="font-display text-4xl md:text-5xl mb-1 tabular-nums"
                  style={{ color: stat.color }}>0</div>
                <div className="font-mono text-[10px] text-signal/70 tracking-wider uppercase mb-0.5">{stat.label}</div>
                <div className="font-sans text-[11px] text-dim">{stat.sub}</div>
                <div className="absolute bottom-0 left-0 right-0 h-px"
                  style={{ background: `linear-gradient(90deg, ${stat.color}, transparent)`, opacity: 0.4 }} />
              </div>
            ))}
          </div>

          <p className="prob-sub font-sans text-dim text-base max-w-lg leading-relaxed" style={{ opacity: 0 }}>
            Traditional surveillance is passive — by the time responders arrive, the damage is done.
            India needs a proactive AI-driven aerial safety net.
          </p>
        </div>

        {/* Right: aerial incident map */}
        <div className="hidden lg:flex flex-col justify-center w-[45%] pr-12 relative">
          <div className="prob-map-frame relative">
            <div className="prob-map-label font-mono text-[9px] text-dim tracking-widest mb-2">
              LIVE INCIDENT MAP — PUNE
            </div>
            <div className="prob-map-area relative border border-noise/30 bg-surface/50 backdrop-blur-sm"
              style={{ height: 340, overflow: "hidden" }}>

              {/* Map grid */}
              <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.06 }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <g key={i}>
                    <line x1={`${i*11}%`} y1="0" x2={`${i*11}%`} y2="100%" stroke="#00C8FF" strokeWidth="0.5" />
                    <line x1="0" y1={`${i*11}%`} x2="100%" y2={`${i*11}%`} stroke="#00C8FF" strokeWidth="0.5" />
                  </g>
                ))}
              </svg>

              {/* Incident markers */}
              {INCIDENTS.map((inc) => (
                <div key={inc.id}
                  className="prob-incident-marker absolute"
                  style={{ left: `${inc.x}%`, top: `${inc.y}%`, transform: "translate(-50%,-50%)", opacity: 0 }}>
                  <div className={"prob-pulse-ring absolute inset-0 rounded-full border-2 " +
                    (inc.sev === "critical" ? "border-critical" : inc.sev === "high" ? "border-high" : "border-medium")}
                    style={{ opacity: 0 }} />
                  <div className={"w-3 h-3 rounded-full relative z-10 " +
                    (inc.sev === "critical" ? "bg-critical" : inc.sev === "high" ? "bg-high" : "bg-medium")}
                    style={{ boxShadow: `0 0 8px currentColor` }} />
                </div>
              ))}

              {/* Drone icon on map */}
              <div className="absolute" style={{ left: "50%", top: "55%", transform: "translate(-50%,-50%)" }}>
                <div className="w-5 h-5 border border-pulse rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-pulse rounded-full animate-pulse" />
                </div>
              </div>
            </div>

            {/* Alert cards */}
            <div className="mt-3 flex flex-col gap-2">
              {INCIDENTS.slice(0, 2).map((inc) => (
                <div key={inc.id} className="prob-alert-card flex items-center gap-3 border border-noise/30 bg-surface/80 px-3 py-2"
                  style={{ opacity: 0 }}>
                  <div className={"w-2 h-2 rounded-full flex-shrink-0 " +
                    (inc.sev === "critical" ? "bg-critical" : inc.sev === "high" ? "bg-high" : "bg-medium")} />
                  <div>
                    <div className="font-mono text-[10px] text-signal tracking-wider">{inc.type}</div>
                    <div className="font-sans text-[10px] text-dim">{inc.detail}</div>
                  </div>
                  <div className="ml-auto font-mono text-[9px] text-pulse">DRONE EN ROUTE</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
