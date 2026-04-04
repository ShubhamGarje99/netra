"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useSimulationStore } from "@/store/simulation-store";
import { useSimulation } from "@/hooks/useSimulation";
import { Drone3D } from "@/components/shared/Drone3D";
import { gsap } from "@/lib/gsap";

const BOOT_LINES = [
  { prefix: "SYS", text: "NETRA PROTOTYPE SHELL", ok: true },
  { prefix: "AI", text: "YOLOv8 + POSE DETECTOR READY", ok: true },
  { prefix: "FLT", text: "8 UAV NODES (SIMULATED)", ok: true },
  { prefix: "GRID", text: "PUNE METRO REGION", ok: true },
  { prefix: "ING", text: "SSE + DETECTOR INGEST", ok: true },
];

export function SceneHero() {
  useSimulation();
  // Use separate selectors to avoid getServerSnapshot infinite loop
  const incidents = useSimulationStore((s) => s.incidents);
  const stats     = useSimulationStore((s) => s.stats);
  const live = incidents.filter((i) => i.status !== "resolved").slice(0, 2);

  useEffect(() => {
    // Double rAF ensures DOM is fully painted before anime.js queries selectors
    let raf1: number;
    let raf2: number;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        import("animejs").then(({ animate, stagger }) => {
          animate(".hero-scan-line", {
            translateX: ["-100%", "110%"],
            duration: 1800,
            ease: "inOutQuart",
            delay: 300,
          });
          animate(".hero-title-char", {
            opacity: [0, 1],
            translateY: ["42px", "0px"],
            duration: 650,
            ease: "outExpo",
            delay: stagger(60, { start: 280 }),
          });
          animate(".hero-subtitle", {
            opacity: [0, 1],
            translateY: ["10px", "0px"],
            duration: 500,
            ease: "outQuart",
            delay: 850,
          });
          animate(".hero-ring", {
            scale: [0.15, 1],
            opacity: [0, 1],
            duration: 1300,
            ease: "outExpo",
            delay: stagger(230, { start: 550 }),
          });
          animate(".hud-card-left", {
            opacity: [0, 1],
            translateX: ["-22px", "0px"],
            duration: 550,
            ease: "outExpo",
            delay: stagger(120, { start: 700 }),
          });
          animate(".hud-card-right", {
            opacity: [0, 1],
            translateX: ["22px", "0px"],
            duration: 550,
            ease: "outExpo",
            delay: stagger(120, { start: 700 }),
          });
          animate(".hero-boot-line", {
            opacity: [0, 1],
            translateX: ["-10px", "0px"],
            duration: 260,
            ease: "outQuart",
            delay: stagger(190, { start: 1000 }),
          });
          animate(".hero-cta", {
            opacity: [0, 1],
            translateY: ["14px", "0px"],
            duration: 600,
            ease: "outBack(1.3)",
            delay: 1800,
          });
          animate(".hero-topbar-item", {
            opacity: [0, 1],
            translateY: ["-8px", "0px"],
            duration: 280,
            ease: "outQuart",
            delay: stagger(55, { start: 150 }),
          });
          animate(".hero-incident-pill", {
            opacity: [0, 1],
            translateY: ["6px", "0px"],
            duration: 300,
            ease: "outQuart",
            delay: stagger(100, { start: 1500 }),
          });
        });
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      gsap.set("#hero .section-content", { opacity: 1, y: 0, visibility: "visible" });
      gsap.set("#hero [style*='opacity: 0']", { opacity: 1, visibility: "visible" });
    }, 3000);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section
      id="hero"
      className="scene scene-hero"
      aria-label="NETRA Command"
      style={{ opacity: 1, visibility: "visible", position: "relative", minHeight: "100vh" }}
    >
      <div className="hero-bg-grid" />
      <div className="hero-bg-radial" />
      <div className="hero-bg-horizon" />
      <div className="scanline-overlay" />

      <div className="section-content relative h-full">

      {/* Horizontal scan flash */}
      <div
        className="hero-scan-line absolute inset-y-0 w-44 pointer-events-none z-10"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(0,200,255,0.07), transparent)",
          transform: "translateX(-100%)",
        }}
      />

      {/* TOP BAR */}
      <div className="hero-topbar">
        <div className="hero-topbar-left">
          <div className="hero-topbar-item" style={{ opacity: 0 }}>
            <span className="topbar-brand-dot" />
            <span className="font-display text-pulse" style={{ fontSize: "1.15rem", letterSpacing: "0.12em" }}>
              NETRA
            </span>
          </div>
          <div className="hero-topbar-item topbar-badge" style={{ opacity: 0 }}>
            <div className="status-dot-online" />
            <span>LIVE</span>
          </div>
          <div className="hero-topbar-item topbar-badge" style={{ opacity: 0 }}>
            <span style={{ color: "var(--dim)" }}>PUNE GRID</span>
          </div>
        </div>
        <div className="hero-topbar-right">
          {[
            {
              v: stats.dronesActive + stats.dronesIdle || 8,
              l: "DRONES",
            },
            { v: `${stats.activeIncidents}*`, l: "ALERTS" },
            { v: "SIM", l: "MODE" },
            {
              v: stats.avgResponseTime > 0 ? `${stats.avgResponseTime}s` : "—",
              l: "AVG RT",
            },
          ].map(({ v, l }) => (
            <div key={l} className="hero-topbar-item topbar-stat" style={{ opacity: 0 }}>
              <span className="topbar-stat-val">{v}</span>
              <span className="topbar-stat-lbl">{l}</span>
            </div>
          ))}
          <Link
            href="/dashboard"
            className="hero-topbar-item topbar-dash-btn font-mono"
            style={{ opacity: 0 }}
          >
            DASHBOARD
          </Link>
        </div>
      </div>

      {/* MAIN STAGE */}
      <div className="hero-stage">
        {/* Title */}
        <div className="hero-title-wrap">
          <h1 className="hero-title font-display">
            {"NETRA".split("").map((ch, i) => (
              <span key={i} className="hero-title-char" style={{ opacity: 0 }}>
                {ch}
              </span>
            ))}
          </h1>
          <p className="hero-subtitle font-mono" style={{ opacity: 0 }}>
            AI EYE IN THE SKY &middot; AUTONOMOUS RESPONSE
          </p>
        </div>

        {/* Drone + HUD */}
        <div className="hero-drone-stage">

          {/* Radar rings */}
          <div className="hero-rings-wrap" aria-hidden="true">
            {[290, 430, 570].map((s, i) => (
              <div
                key={i}
                className="hero-ring absolute rounded-full border"
                style={{
                  width: s,
                  height: s,
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%,-50%)",
                  borderColor: "rgba(0,200,255," + (0.14 - i * 0.04) + ")",
                  opacity: 0,
                }}
              />
            ))}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 570 570"
              style={{ opacity: 0.12 }}
            >
              <defs>
                <linearGradient id="sweepG" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00C8FF" stopOpacity="0" />
                  <stop offset="100%" stopColor="#00C8FF" stopOpacity="0.95" />
                </linearGradient>
              </defs>
              <g className="radar-sweep-line" style={{ transformOrigin: "285px 285px" }}>
                <line
                  x1="285" y1="285" x2="285" y2="12"
                  stroke="url(#sweepG)" strokeWidth="1.5"
                />
              </g>
              <circle
                cx="285" cy="285" r="273"
                fill="none" stroke="rgba(0,200,255,0.07)" strokeWidth="0.5"
              />
            </svg>
          </div>

          {/* HUD LEFT */}
          <div className="hud-left">
            <div className="hud-card hud-card-left" style={{ opacity: 0 }}>
              <div className="hud-label">ALTITUDE</div>
              <div className="hud-value">
                {(120 + (stats.dronesActive || 0) * 0.4).toFixed(0)}
                <span className="hud-unit"> m</span>
              </div>
              <div className="hud-bar">
                <div className="hud-bar-fill" style={{ width: "74%" }} />
              </div>
            </div>
            <div className="hud-card hud-card-left" style={{ opacity: 0 }}>
              <div className="hud-label">SPEED</div>
              <div className="hud-value">
                16<span className="hud-unit"> km/h</span>
              </div>
              <div className="hud-bar">
                <div className="hud-bar-fill" style={{ width: "38%" }} />
              </div>
            </div>
            <div className="hud-card hud-card-left" style={{ opacity: 0 }}>
              <div className="hud-label">SIGNAL</div>
              <div className="hud-sig-bars">
                {[1, 2, 3, 4, 5].map((b) => (
                  <div
                    key={b}
                    className="hud-sig-bar"
                    style={{
                      height: b * 5,
                      background: b <= 4 ? "var(--ops)" : "rgba(255,255,255,0.08)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 3D Drone */}
          <div className="hero-drone-wrap">
            <Drone3D />
          </div>

          {/* HUD RIGHT */}
          <div className="hud-right">
            <div className="hud-card hud-card-right" style={{ opacity: 0 }}>
              <div className="hud-label">BATTERY</div>
              <div className="hud-value" style={{ color: "var(--ops)" }}>
                85<span className="hud-unit">%</span>
              </div>
              <div className="hud-bar">
                <div className="hud-bar-fill" style={{ width: "85%", background: "var(--ops)" }} />
              </div>
            </div>
            <div className="hud-card hud-card-right" style={{ opacity: 0 }}>
              <div className="hud-label">POSITION</div>
              <div className="hud-coords">
                <span>18.5204N</span>
                <span>73.8567E</span>
              </div>
            </div>
            <div className="hud-card hud-card-right" style={{ opacity: 0 }}>
              <div className="hud-label">ALERTS</div>
              {live.length === 0 ? (
                <span className="text-ops" style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.1em" }}>
                  ALL CLEAR
                </span>
              ) : (
                live.map((inc) => (
                  <div key={inc.id} className="hero-incident-pill" style={{ opacity: 0 }}>
                    <div className={"inc-dot sev-" + inc.severity} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.55rem" }}>
                      {inc.type.replace(/_/g, " ").toUpperCase().slice(0, 16)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/dashboard"
          className="hero-cta font-mono"
          style={{ opacity: 0 }}
          data-cursor="hover"
        >
          <span>LAUNCH COMMAND CENTER</span>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M3 9H15M15 9L10 4M15 9L10 14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </Link>
      </div>

      {/* BOOT LOG */}
      <div className="hero-bootlog">
        {BOOT_LINES.map((line, i) => (
          <div key={i} className="hero-boot-line" style={{ opacity: 0 }}>
            <span className="boot-prefix">[{line.prefix}]</span>
            <span className={line.ok ? "boot-ok" : "boot-dim"}>{line.text}</span>
          </div>
        ))}
      </div>

      {/* STATUS BAR */}
      <div className="hero-statusbar">
        <div className="status-item hero-topbar-item" style={{ opacity: 0 }}>
          <div className="status-dot-online" />
          <span>ONLINE</span>
        </div>
        <div className="status-item hero-topbar-item" style={{ opacity: 0 }}>
          <span className="text-pulse">{stats.dronesActive + stats.dronesIdle || 47}</span>
          <span> DRONES</span>
        </div>
        <div
          className="status-item hero-topbar-item"
          style={{ opacity: 0, color: stats.activeIncidents > 0 ? "var(--critical)" : "var(--dim)" }}
        >
          {stats.activeIncidents} INCIDENTS
        </div>
        <div className="status-item hero-topbar-item" style={{ opacity: 0 }}>
          PROTOTYPE · LIVE STATE*
        </div>
        <div className="status-item hero-topbar-item" style={{ opacity: 0 }}>
          AVG RT {stats.avgResponseTime > 0 ? `${stats.avgResponseTime}s` : "—"} (SESSION)
        </div>
        <div className="status-item hero-topbar-item text-dim" style={{ opacity: 0 }}>
          NETRA v2.1
        </div>
      </div>
      </div>
    </section>
  );
}
