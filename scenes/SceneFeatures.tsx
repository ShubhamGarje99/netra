"use client";

import { useEffect, useRef } from "react";
import { onSceneActive } from "@/lib/sceneEvents";
import { Eye, Navigation, MapPin, Monitor } from "lucide-react";
import { gsap } from "@/lib/gsap";
import { VideoFeedPanel } from "@/dashboard/VideoFeedPanel";

const FEATURES = [
  { icon: Eye, title: "AI DETECTION", status: "LIVE", metric: "99.2%", mLabel: "accuracy",
    body: "Computer vision identifies crowd surges, accidents, and suspicious activity in under 200ms." },
  { icon: Navigation, title: "AUTO DISPATCH", status: "ARMED", metric: "<2.5m", mLabel: "avg ETA",
    body: "Nearest drone auto-assigned and routed with optimized flight path and no-fly zone avoidance." },
  { icon: MapPin, title: "LIVE TRACKING", status: "ACTIVE", metric: "47", mLabel: "drones online",
    body: "Real-time positions, battery, ETA, and HD feed from every drone in the fleet." },
  { icon: Monitor, title: "CMD CENTER", status: "READY", metric: "12km", mLabel: "coverage",
    body: "Unified dashboard with live feeds, fleet management, alert triage, and analytics." },
];

const RESOLUTIONS = [
  { label: "1920x1080 px (Full HD)", active: false },
  { label: "1280x720 px (HD)", active: true },
  { label: "3840x2160 px (4K UHD)", active: false },
  { label: "7680x4320 px (8K UHD)", active: false },
];

const TELEMETRY = [
  { k: "Speed",    v: "16 km/h" },
  { k: "Height",   v: "74 m"    },
  { k: "Lens",     v: "25 mm"   },
  { k: "ISO",      v: "700"     },
  { k: "Shutter",  v: "1/120"   },
  { k: "Flight",   v: "10:01"   },
];

export function SceneFeatures() {
  const animatedRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      gsap.set("#capabilities .section-content", { opacity: 1, y: 0, visibility: "visible" });
      gsap.set("#capabilities [style*='opacity: 0']", { opacity: 1, visibility: "visible" });
    }, 3000);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const off = onSceneActive("features", () => {
      if (animatedRef.current) return;
      animatedRef.current = true;

      import("animejs").then(({ animate, stagger }) => {
        animate(".feat-label", { opacity: [0,1], translateY: ["-10px","0px"], duration: 400, ease: "outQuart", delay: 150 });

        animate(".feat-title-line", {
          opacity: [0,1], translateY: ["45px","0px"], duration: 650, ease: "outExpo", delay: stagger(110, { start: 250 }),
        });

        animate(".feat-video-panel", {
          opacity: [0,1], translateX: ["-30px","0px"], scale: [0.97,1], duration: 700, ease: "outExpo", delay: 300,
        });

        animate(".feat-telem-item", {
          opacity: [0,1], translateY: ["8px","0px"], duration: 350, ease: "outQuart", delay: stagger(60, { start: 700 }),
        });

        animate(".feat-res-item", {
          opacity: [0,1], translateX: ["-8px","0px"], duration: 280, ease: "outQuart", delay: stagger(50, { start: 800 }),
        });

        animate(".feature-card-ops", {
          opacity: [0,1], translateY: ["26px","0px"], scale: [0.97,1], duration: 550, ease: "outExpo", delay: stagger(110, { start: 400 }),
        });

        animate(".fc-scanline", {
          translateY: ["-100%","200%"], duration: 1100, ease: "inOutQuart", delay: stagger(160, { start: 300 }),
        });

        animate(".fc-metric-animated", {
          opacity: [0,1], duration: 500, ease: "outQuart", delay: stagger(110, { start: 600 }),
        });

        /* Compass needle spin-in */
        animate(".feat-compass-needle", {
          rotate: ["-180deg", "320deg"], duration: 1200, ease: "outElastic(1,0.5)", delay: 500,
        });
      });
    });
    return off;
  }, []);

  return (
    <section
      id="capabilities"
      className="scene scene-features"
      aria-label="Capabilities"
      style={{ opacity: 1, visibility: "visible", position: "relative", minHeight: "100vh" }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 70% 50%, rgba(0,200,255,0.04) 0%, transparent 60%)",
      }} />
      <div className="scanline-overlay" />

      <div className="section-content features-content relative z-20 flex h-full px-6 md:px-12 lg:px-16 gap-8">

        {/* LEFT: SkyLens video panel */}
        <div className="hidden lg:flex flex-col justify-center w-[44%] shrink-0">

          <div className="feat-video-panel border border-noise/40 bg-surface/60 backdrop-blur overflow-hidden"
            style={{ opacity: 0 }}>

            {/* Video tabs */}
            <div className="flex items-center gap-1 px-3 pt-2 pb-1 border-b border-noise/30">
              {["VIDEO","PHOTO"].map((t, i) => (
                <button key={t} className={"px-3 py-1 font-mono text-[10px] tracking-widest " +
                  (i===0 ? "bg-pulse/10 text-pulse border border-pulse/30" : "text-dim border border-transparent")}>
                  {t}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-critical animate-pulse" />
                <span className="font-mono text-[9px] text-critical tracking-wider">REC</span>
                <span className="font-mono text-[9px] text-dim ml-1">04:23:01</span>
              </div>
            </div>

            {/* Aerial view mock */}
            <div className="relative bg-void/80" style={{ height: 200 }}>
              <svg className="w-full h-full" viewBox="0 0 400 200">
                <defs>
                  <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0B1F35" />
                    <stop offset="100%" stopColor="#050A12" />
                  </linearGradient>
                </defs>
                <rect width="400" height="200" fill="url(#skyGrad)" />
                {/* Fields / terrain */}
                <rect x="20" y="30" width="160" height="80" fill="rgba(0,80,40,0.4)" rx="2" />
                <rect x="190" y="20" width="80" height="60" fill="rgba(0,60,30,0.3)" rx="2" />
                <rect x="280" y="40" width="100" height="50" fill="rgba(0,70,35,0.35)" rx="2" />
                <rect x="40" y="120" width="120" height="60" fill="rgba(0,60,30,0.25)" rx="2" />
                {/* River */}
                <path d="M0,110 Q100,90 200,115 Q300,140 400,120" fill="none" stroke="rgba(0,150,200,0.3)" strokeWidth="8" />
                {/* Roads */}
                <line x1="0" y1="100" x2="400" y2="105" stroke="rgba(200,200,200,0.1)" strokeWidth="2" />
                <line x1="200" y1="0" x2="205" y2="200" stroke="rgba(200,200,200,0.1)" strokeWidth="2" />
                {/* Crosshair */}
                <line x1="195" y1="80" x2="205" y2="80" stroke="#00C8FF" strokeWidth="1" opacity="0.7" />
                <line x1="200" y1="75" x2="200" y2="85" stroke="#00C8FF" strokeWidth="1" opacity="0.7" />
                <circle cx="200" cy="80" r="12" fill="none" stroke="#00C8FF" strokeWidth="0.7" opacity="0.5" />
              </svg>

              {/* Corner markers */}
              {[["0px","0px"],["auto","0px"],["0px","auto"],["auto","auto"]].map(([b,r],i) => (
                <div key={i} className="absolute w-4 h-4 pointer-events-none" style={{ bottom: b, right: r, top: i<2?"0px":"auto", left: i%2===0?"0px":"auto" }}>
                  <svg width="16" height="16"><path d={i===0?"M0 8V0H8":i===1?"M8 0H16V8":i===2?"M0 8V16H8":"M8 16H16V8"} stroke="#00C8FF" strokeWidth="1" fill="none" opacity="0.5" /></svg>
                </div>
              ))}
            </div>

            {/* Telemetry grid */}
            <div className="grid grid-cols-3 gap-0 border-t border-noise/30">
              <div className="col-span-2 border-r border-noise/30 p-3">
                <div className="font-mono text-[9px] text-dim mb-2 tracking-wider">Resolution</div>
                {RESOLUTIONS.map((r) => (
                  <div key={r.label} className={"feat-res-item font-mono text-[10px] py-0.5 " + (r.active ? "text-signal" : "text-dim/50")}
                    style={{ opacity: 0 }}>
                    {r.active && <span className="text-pulse mr-1">&#9658;</span>}{r.label}
                  </div>
                ))}
              </div>
              <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-1">
                {TELEMETRY.map(({ k, v }) => (
                  <div key={k} className="feat-telem-item" style={{ opacity: 0 }}>
                    <div className="font-mono text-[8px] text-dim">{k}</div>
                    <div className="font-mono text-[10px] text-signal">{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compass */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-noise/30">
              <div className="relative w-14 h-14">
                <svg viewBox="0 0 56 56" className="w-full h-full">
                  <circle cx="28" cy="28" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  {["N","E","S","W"].map((d,i) => (
                    <text key={d} x={28 + Math.sin(i*Math.PI/2)*20} y={28 - Math.cos(i*Math.PI/2)*20 + 3}
                      textAnchor="middle" fill={d==="N"?"#FF2D4A":"rgba(216,234,244,0.5)"} fontSize="7" fontFamily="monospace">{d}</text>
                  ))}
                  <line className="feat-compass-needle" x1="28" y1="28" x2="28" y2="10"
                    stroke="#00C8FF" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="font-mono text-[9px] text-dim text-right">
                <div className="text-signal text-xs">320 WSW</div>
                <div>13 km/h wind</div>
                <div>16°C Clear</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: feature cards */}
        <div className="flex flex-col justify-center flex-1 min-w-0">
          <span className="feat-label font-mono text-[9px] tracking-[0.35em] text-dim uppercase mb-6" style={{ opacity: 0 }}>
            // 03 CAPABILITIES
          </span>
          <h2 className="font-display text-signal leading-none mb-8 shrink-0"
            style={{ fontSize: "clamp(2rem,6.5vw,5rem)" }}>
            <div className="overflow-hidden"><span className="feat-title-line block" style={{ opacity: 0 }}>WHAT NETRA</span></div>
            <div className="overflow-hidden"><span className="feat-title-line block text-pulse" style={{ opacity: 0 }}>CAN DO.</span></div>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl">
            {FEATURES.map((feat, i) => (
              <div key={i} className="feature-card-ops group" data-cursor="hover" style={{ opacity: 0 }}>
                <div className="fc-scanline absolute inset-x-0 h-8 pointer-events-none"
                  style={{ background: "linear-gradient(transparent, rgba(0,200,255,0.07), transparent)", transform: "translateY(-100%)" }} />
                <div className="fc-number">0{i+1}</div>
                <div className="fc-status-row">
                  <div className="fc-status-dot" />
                  <span className="fc-status-text">{feat.status}</span>
                </div>
                <div className="flex items-start gap-3 mb-3">
                  <feat.icon className="w-5 h-5 text-pulse shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <div className="fc-title">{feat.title}</div>
                    <p className="fc-body">{feat.body}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-noise/20 flex items-end gap-2">
                  <span className="fc-metric fc-metric-animated" style={{ opacity: 0 }}>{feat.metric}</span>
                  <span className="fc-metric-label pb-1">{feat.mLabel}</span>
                </div>
              </div>
            ))}
          </div>

          <div id="video-feeds" style={{ opacity: 1, minHeight: "400px" }} className="mt-6 w-full max-w-4xl">
            <VideoFeedPanel />
          </div>
        </div>
      </div>
    </section>
  );
}
