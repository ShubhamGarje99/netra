"use client";

import { useState, useEffect, useCallback } from "react";
import { useSimulationStore } from "@/store/simulation-store";
import { Activity, Crosshair, MapPin, Pause, Play, Radio, Shield, Zap } from "lucide-react";
import Link from "next/link";
import { triggerIncident } from "@/lib/trigger-incident";

const edgeInferenceEnabled = process.env.NEXT_PUBLIC_EDGE_INFERENCE === "true";

export function StatusBar() {
  const stats = useSimulationStore((s) => s.stats);
  const isRunning = useSimulationStore((s) => s.isRunning);
  const linkDegraded = useSimulationStore((s) => s.linkDegraded);
  const targetingMode = useSimulationStore((s) => s.targetingMode);
  const setTargetingMode = useSimulationStore((s) => s.setTargetingMode);
  const showToast = useSimulationStore((s) => s.showToast);
  const setRunning = useSimulationStore((s) => s.setRunning);
  const detectorOnline = useSimulationStore((s) => s.detectorOnline);
  const [time, setTime] = useState("");
  const [triggering, setTriggering] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }) + " IST"
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const handleTriggerRandom = useCallback(async () => {
    if (triggering) return;
    setTriggering(true);
    try {
      const result = await triggerIncident();
      showToast(result);
    } finally {
      setTriggering(false);
    }
  }, [triggering, showToast]);

  const toggleSimulation = useCallback(async () => {
    if (toggling) return;
    setToggling(true);
    try {
      const action = isRunning ? "stop" : "start";
      await fetch("/api/simulation/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setRunning(!isRunning);
      showToast({
        ok: true,
        message: isRunning
          ? "⏸ Simulation paused — drones holding position"
          : "▶ Simulation resumed — drones active",
      });
    } finally {
      setToggling(false);
    }
  }, [isRunning, toggling, setRunning, showToast]);

  const toggleTargetingMode = useCallback(() => {
    const next = !targetingMode;
    setTargetingMode(next);
    if (next) {
      showToast({
        ok: true,
        message: "🎯 MAP TARGETING — click anywhere on the map to trigger an incident",
      });
    }
  }, [targetingMode, setTargetingMode, showToast]);

  return (
    <div className="h-10 bg-static border-b border-noise/30 flex items-center justify-between px-4 shrink-0">
      {/* Left: Logo */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Shield className="w-4 h-4 text-pulse" />
          <span className="font-mono text-xs tracking-[0.2em] text-signal">NETRA</span>
          <span className="font-mono text-[9px] text-pulse/60">नेत्र</span>
        </Link>

        <div className="w-px h-4 bg-noise/30" />

        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-pulse animate-blink" : "bg-critical"}`} />
          <span className="font-mono text-[10px] text-pulse tracking-wider">
            {isRunning ? "SYSTEM ONLINE" : "SYSTEM OFFLINE"}
          </span>
        </div>

        {linkDegraded && (
          <>
            <div className="w-px h-4 bg-noise/30" />
            <span className="font-mono text-[9px] text-[#FFD700] tracking-wide border border-[#FFD700]/40 px-1.5 py-0.5 rounded">
              LINK DEGRADED · 2s POLL
            </span>
          </>
        )}

        {edgeInferenceEnabled && (
          <>
            <div className="w-px h-4 bg-noise/30" />
            <span className="font-mono text-[9px] text-pulse/90 tracking-wide">EDGE CV</span>
          </>
        )}

        {detectorOnline !== null && (
          <>
            <div className="w-px h-4 bg-noise/30" />
            <div className={`
              flex items-center gap-1.5 px-1.5 py-0.5 rounded border font-mono text-[9px] tracking-wide
              ${detectorOnline
                ? "border-ops/40 text-ops"
                : "border-critical/40 text-critical"
              }
            `}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                detectorOnline
                  ? "bg-ops shadow-[0_0_4px_rgba(0,230,118,0.6)] animate-pulse"
                  : "bg-critical shadow-[0_0_4px_rgba(255,45,74,0.5)]"
              }`} />
              {detectorOnline ? "DETECTOR ONLINE" : "DETECTOR OFFLINE"}
            </div>
          </>
        )}
      </div>

      {/* Center: Stats */}
      <div className="hidden md:flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-critical" />
          <span className="font-mono text-[10px] text-signal/80">
            ACTIVE: <span className="text-critical">{stats.activeIncidents}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-pulse" />
          <span className="font-mono text-[10px] text-signal/80">
            DRONES: <span className="text-pulse">{stats.dronesActive}</span>/{stats.dronesActive + stats.dronesIdle}
          </span>
        </div>
        <div className="font-mono text-[10px] text-signal/80">
          RESOLVED: <span className="text-pulse">{stats.resolvedIncidents}</span>
        </div>
        <div className="font-mono text-[10px] text-signal/80">
          AVG RESPONSE: <span className="text-pulse">{stats.avgResponseTime}s</span>
        </div>
      </div>

      {/* Right: Incident triggers + Time */}
      <div className="flex items-center gap-3">
        {/* Trigger random incident */}
        <button
          onClick={handleTriggerRandom}
          disabled={triggering}
          className={`
            flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-[10px] tracking-wider
            transition-all duration-200
            ${triggering
              ? "border-dim/40 text-dim cursor-wait"
              : "border-critical/50 text-critical hover:bg-critical/15 hover:border-critical/80 hover:shadow-[0_0_10px_rgba(255,45,74,0.2)]"
            }
          `}
        >
          <Zap className="w-3 h-3" />
          TRIGGER INCIDENT
        </button>

        {/* Map targeting mode toggle */}
        <button
          onClick={toggleTargetingMode}
          className={`
            flex items-center gap-1.5 px-2 py-1 rounded border font-mono text-[10px] tracking-wider
            transition-all duration-200
            ${targetingMode
              ? "border-pulse bg-pulse/15 text-pulse shadow-[0_0_10px_rgba(0,200,255,0.25)]"
              : "border-noise/40 text-dim hover:text-pulse hover:border-pulse/50"
            }
          `}
          title="Click on map to trigger incident at that location"
        >
          {targetingMode ? (
            <Crosshair className="w-3 h-3 animate-pulse" />
          ) : (
            <MapPin className="w-3 h-3" />
          )}
          {targetingMode ? "TARGETING" : "MAP TARGET"}
        </button>

        {/* Simulation start/stop toggle */}
        <button
          onClick={toggleSimulation}
          disabled={toggling}
          className={`
            flex items-center gap-1.5 px-2 py-1 rounded border font-mono text-[10px] tracking-wider
            transition-all duration-200
            ${toggling
              ? "border-dim/40 text-dim cursor-wait"
              : isRunning
                ? "border-ops/50 text-ops hover:bg-ops/10 hover:border-ops/80"
                : "border-high/50 text-high hover:bg-high/10 hover:border-high/80"
            }
          `}
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            isRunning
              ? "bg-ops shadow-[0_0_6px_rgba(0,230,118,0.6)] animate-pulse"
              : "bg-high shadow-[0_0_6px_rgba(255,119,0,0.5)]"
          }`} />
          {isRunning ? (
            <><Pause className="w-3 h-3" /> PAUSE</>
          ) : (
            <><Play className="w-3 h-3" /> RESUME</>
          )}
        </button>

        <div className="w-px h-4 bg-noise/30" />

        <div className="font-mono text-[10px] text-dim tracking-wider">
          {time}
        </div>
      </div>
    </div>
  );
}
