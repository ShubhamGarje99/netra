"use client";

import { useEffect, useRef } from "react";
import { onSceneActive } from "@/lib/sceneEvents";
import { Video, Brain, AlertTriangle, Navigation, Map } from "lucide-react";
import { gsap } from "@/lib/gsap";
import dynamic from "next/dynamic";

const MapPanel = dynamic(
  () => import("@/dashboard/MapPanel").then((mod) => mod.MapPanel),
  { ssr: false }
);

const STEPS = [
  { icon: Video, label: "VIDEO FEED", desc: "Camera captures urban scene continuously at 4K", data: "24/7 UPTIME" },
  { icon: Brain, label: "AI ANALYSIS", desc: "ML model classifies incident type and severity in real-time", data: "< 200ms" },
  { icon: AlertTriangle, label: "ALERT GENERATED", desc: "System creates priority alert and notifies operators instantly", data: "INSTANT" },
  { icon: Navigation, label: "DRONE DISPATCHED", desc: "Nearest available drone auto-assigned with optimized flight path", data: "< 30s" },
  { icon: Map, label: "LIVE MONITORING", desc: "Real-time aerial feed and situational awareness to command center", data: "HD STREAM" },
];

export function SceneHowItWorks() {
  const animatedRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      gsap.set("#pipeline .section-content", { opacity: 1, y: 0, visibility: "visible" });
      gsap.set("#pipeline [style*='opacity: 0']", { opacity: 1, visibility: "visible" });
    }, 3000);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const off = onSceneActive("howitworks", () => {
      if (animatedRef.current) return;
      animatedRef.current = true;

      import("animejs").then(({ animate, stagger }) => {
        animate(".hiw-label", { opacity: [0,1], translateY: ["-10px","0px"], duration: 400, ease: "outQuart", delay: 100 });

        animate(".hiw-title-line", {
          opacity: [0,1], translateY: ["45px","0px"], duration: 650, ease: "outExpo", delay: stagger(110, { start: 200 }),
        });

        animate(".pipeline-step-ops", {
          opacity: [0,1], translateX: ["-20px","0px"], duration: 500, ease: "outExpo", delay: stagger(200),
        });

        animate(".pipeline-icon-ops", {
          scale: [0,1], opacity: [0,1], duration: 500, ease: "outBack(1.2)", delay: stagger(200, { start: 100 }),
        });

        animate(".pipeline-connector-v-fill", {
          height: ["0%","100%"], duration: 300, ease: "inOutQuart", delay: stagger(200, { start: 350 }),
        });

        animate(".pipeline-data-badge", {
          opacity: [0,1], scale: [0.8,1], duration: 300, ease: "outBack", delay: stagger(200, { start: 600 }),
        });
      });
    });
    return off;
  }, []);

  return (
    <section
      id="pipeline"
      className="scene scene-howitworks"
      aria-label="How It Works"
      style={{ opacity: 1, visibility: "visible", position: "relative", minHeight: "100vh" }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 38% 58%, rgba(0,200,255,0.04) 0%, transparent 55%)",
      }} />
      <div className="scanline-overlay" />

      <div className="section-content pipeline-content relative z-20 flex flex-col justify-center h-full px-8 md:px-16 lg:px-24">
        <span className="hiw-label font-mono text-[9px] tracking-[0.35em] text-dim uppercase mb-6" style={{ opacity: 0 }}>
          // 04 THE PIPELINE
        </span>

        <h2 className="font-display text-signal leading-none mb-10 shrink-0"
          style={{ fontSize: "clamp(2rem,7vw,5.5rem)" }}>
          <div className="overflow-hidden"><span className="hiw-title-line block" style={{ opacity: 0 }}>HOW NETRA</span></div>
          <div className="overflow-hidden"><span className="hiw-title-line block text-pulse" style={{ opacity: 0 }}>RESPONDS.</span></div>
        </h2>

        <div className="flex flex-col max-w-lg">
          {STEPS.map((step, i) => (
            <div key={i}>
              <div className="pipeline-step-ops" style={{ opacity: 0 }}>
                <div className="pipeline-num">0{i+1}</div>
                <div className="pipeline-icon-ops" style={{ scale: "0" }}>
                  <step.icon className="w-5 h-5 text-pulse" strokeWidth={1.5} />
                </div>
                <div className="pipeline-text-col">
                  <div className="flex items-center justify-between">
                    <div className="pipeline-step-label">{step.label}</div>
                    <div className="pipeline-data-badge font-mono text-[9px] text-pulse border border-pulse/25 px-2 py-0.5"
                      style={{ opacity: 0 }}>{step.data}</div>
                  </div>
                  <div className="pipeline-step-desc">{step.desc}</div>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className="pipeline-connector-v">
                  <div className="pipeline-connector-v-fill" style={{ height: "0%" }} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div id="pune-map" className="mt-8 w-full max-w-4xl" style={{ minHeight: "360px", opacity: 1 }}>
          <MapPanel />
        </div>
      </div>
    </section>
  );
}
