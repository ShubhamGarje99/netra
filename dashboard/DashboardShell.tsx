"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield, Activity, Radio, Bell, Navigation, BarChart3,
  Camera, MapPin, Clock, Battery, Wifi, Gauge, Eye,
  AlertTriangle, CheckCircle2, ArrowUpRight, ChevronRight,
} from "lucide-react";

/* ── Mock Data ── */
const MOCK_DRONES = [
  { id: "UAV-01", name: "Falcon Alpha",  status: "idle",       battery: 94, altitude: 0,   speed: 0,   lat: "18.5204", lng: "73.8567" },
  { id: "UAV-02", name: "Falcon Bravo",  status: "en-route",   battery: 71, altitude: 120, speed: 42,  lat: "18.5314", lng: "73.8446" },
  { id: "UAV-03", name: "Falcon Charlie", status: "on-scene",  battery: 58, altitude: 85,  speed: 0,   lat: "18.5074", lng: "73.8077" },
  { id: "UAV-04", name: "Falcon Delta",  status: "returning",  battery: 32, altitude: 60,  speed: 38,  lat: "18.5590", lng: "73.7868" },
  { id: "UAV-05", name: "Falcon Echo",   status: "charging",   battery: 15, altitude: 0,   speed: 0,   lat: "18.5204", lng: "73.8567" },
];

const MOCK_INCIDENTS = [
  { id: "INC-3401", type: "Crowd Gathering",     severity: "high",     status: "monitoring",      location: "JM Road, Deccan",       time: "2m ago",  drone: "UAV-03" },
  { id: "INC-3402", type: "Suspicious Vehicle",  severity: "medium",   status: "drone_dispatched", location: "FC Road, Shivajinagar", time: "5m ago",  drone: "UAV-02" },
  { id: "INC-3399", type: "Road Accident",       severity: "critical", status: "resolved",         location: "Hinjawadi Phase 2",     time: "18m ago", drone: null },
  { id: "INC-3398", type: "Unauthorized Entry",  severity: "high",     status: "resolved",         location: "Khadki Cantonment",     time: "31m ago", drone: null },
];

const MOCK_ALERTS = [
  { id: 1, time: "10:31:12", message: "UAV-03 arrived on scene — crowd monitoring active", type: "arrival" as const },
  { id: 2, time: "10:29:44", message: "UAV-02 dispatched to FC Road — ETA 1.8 min", type: "dispatch" as const },
  { id: 3, time: "10:27:01", message: "Suspicious vehicle detected via CAM-07 (conf: 0.91)", type: "detection" as const },
  { id: 4, time: "10:22:18", message: "INC-3399 resolved — road accident cleared", type: "resolution" as const },
  { id: 5, time: "10:18:55", message: "Crowd gathering detected at JM Road (conf: 0.87)", type: "detection" as const },
  { id: 6, time: "10:14:30", message: "UAV-04 returning to base — battery low", type: "system" as const },
];

const STATUS_COLORS: Record<string, string> = {
  idle: "bg-dim",
  "en-route": "bg-[#FFD700]",
  "on-scene": "bg-ops",
  returning: "bg-high",
  charging: "bg-violet",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-critical",
  high: "text-high",
  medium: "text-medium",
};

const ALERT_ICONS: Record<string, string> = {
  arrival: "text-ops",
  dispatch: "text-pulse",
  detection: "text-high",
  resolution: "text-ops",
  system: "text-dim",
};

export function DashboardShell() {
  const [time, setTime] = useState("");

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

  const activeDrones = MOCK_DRONES.filter(d => d.status !== "idle" && d.status !== "charging").length;
  const activeIncidents = MOCK_INCIDENTS.filter(i => i.status !== "resolved").length;

  return (
    <div className="h-screen w-screen flex flex-col bg-void overflow-hidden">

      {/* ── STATUS BAR ── */}
      <div className="h-10 bg-surface border-b border-noise/30 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Shield className="w-4 h-4 text-pulse" />
            <span className="font-mono text-xs tracking-[0.2em] text-signal">NETRA</span>
            <span className="font-mono text-[9px] text-pulse/60">नेत्र</span>
          </Link>
          <div className="w-px h-4 bg-noise/30" />
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-pulse animate-blink" />
            <span className="font-mono text-[10px] text-pulse tracking-wider">PROTOTYPE</span>
          </div>
          <div className="w-px h-4 bg-noise/30" />
          <span className="font-mono text-[9px] text-dim tracking-wide border border-noise/30 px-1.5 py-0.5 rounded">
            STATIC MOCK DATA
          </span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-critical" />
            <span className="font-mono text-[10px] text-signal/80">
              ACTIVE: <span className="text-critical">{activeIncidents}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-pulse" />
            <span className="font-mono text-[10px] text-signal/80">
              DRONES: <span className="text-pulse">{activeDrones}</span>/{MOCK_DRONES.length}
            </span>
          </div>
        </div>
        <div className="font-mono text-[10px] text-dim tracking-wider">{time}</div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="flex-1 grid grid-rows-[1fr_auto] overflow-hidden">

        {/* Top: 3-column layout */}
        <div className="grid grid-cols-[1fr_320px_260px] gap-px bg-noise/10 overflow-hidden">

          {/* ── LEFT: Tactical Overview (replaces map) ── */}
          <div className="bg-void flex flex-col overflow-hidden">
            {/* Header */}
            <div className="dashboard-panel-header flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              <span>Tactical Overview</span>
              <span className="ml-auto font-mono text-[9px] text-dim">PUNE METRO • 12.3 km²</span>
            </div>

            {/* Grid overview */}
            <div className="flex-1 p-4 overflow-auto" data-lenis-prevent>
              {/* Stats row */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Coverage", value: "12.3", unit: "km²", icon: Eye },
                  { label: "Avg Response", value: "2.3", unit: "min", icon: Clock },
                  { label: "Detection Rate", value: "92", unit: "%", icon: Gauge },
                  { label: "Uptime", value: "99.7", unit: "%", icon: Wifi },
                ].map(({ label, value, unit, icon: Icon }) => (
                  <div key={label} className="border border-noise/30 bg-surface p-4 relative overflow-hidden group hover:border-pulse/30 transition-colors">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pulse/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Icon className="w-4 h-4 text-dim mb-3" />
                    <div className="font-display text-3xl text-pulse leading-none mb-1">
                      {value}<span className="text-sm text-dim ml-1">{unit}</span>
                    </div>
                    <div className="font-mono text-[9px] text-dim tracking-widest uppercase">{label}</div>
                  </div>
                ))}
              </div>

              {/* Incident Table */}
              <div className="border border-noise/30 bg-surface mb-6">
                <div className="px-4 py-2.5 border-b border-noise/30 flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-pulse" />
                  <span className="font-mono text-[11px] text-pulse tracking-widest uppercase">Active Incidents</span>
                </div>
                <div className="divide-y divide-noise/20">
                  {MOCK_INCIDENTS.map((inc) => (
                    <div key={inc.id} className="px-4 py-3 flex items-center gap-4 hover:bg-panel/50 transition-colors group">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        inc.severity === "critical" ? "bg-critical animate-pulse" :
                        inc.severity === "high" ? "bg-high" : "bg-medium"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-dim">{inc.id}</span>
                          <span className={`font-mono text-[9px] tracking-wide uppercase ${SEVERITY_COLORS[inc.severity]}`}>
                            {inc.severity}
                          </span>
                        </div>
                        <div className="font-mono text-xs text-signal mt-0.5">{inc.type}</div>
                        <div className="font-mono text-[10px] text-dim mt-0.5">{inc.location}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-[10px] text-dim">{inc.time}</div>
                        {inc.drone ? (
                          <div className="font-mono text-[9px] text-pulse mt-0.5">{inc.drone} assigned</div>
                        ) : inc.status === "resolved" ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-3 h-3 text-ops" />
                            <span className="font-mono text-[9px] text-ops">Resolved</span>
                          </div>
                        ) : null}
                      </div>
                      <ChevronRight className="w-3 h-3 text-dim opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Zone Grid Placeholder */}
              <div className="border border-noise/30 bg-surface">
                <div className="px-4 py-2.5 border-b border-noise/30 flex items-center gap-2">
                  <Eye className="w-3 h-3 text-pulse" />
                  <span className="font-mono text-[11px] text-pulse tracking-widest uppercase">Zone Status</span>
                </div>
                <div className="grid grid-cols-4 gap-px p-px bg-noise/10">
                  {["Sector 1 — Deccan", "Sector 2 — Kothrud", "Sector 3 — Shivajinagar", "Sector 4 — Hinjawadi",
                    "Sector 5 — Baner", "Sector 6 — Khadki", "Sector 7 — Hadapsar", "Sector 8 — Wakad"].map((zone, i) => (
                    <div key={zone} className="bg-void p-3 flex flex-col gap-1.5 hover:bg-panel/30 transition-colors">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${i < 3 ? "bg-ops" : i < 5 ? "bg-high" : "bg-dim"}`} />
                        <span className="font-mono text-[9px] text-dim tracking-wide">{zone.split(" — ")[0]}</span>
                      </div>
                      <span className="font-mono text-[10px] text-signal">{zone.split(" — ")[1]}</span>
                      <div className="w-full h-0.5 bg-noise/20 rounded-full overflow-hidden">
                        <div className="h-full bg-pulse/60 rounded-full" style={{ width: `${60 + Math.random() * 35}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── MIDDLE: Alerts ── */}
          <div className="dashboard-panel flex flex-col h-full">
            <div className="dashboard-panel-header flex items-center gap-2">
              <Bell className="w-3 h-3" />
              <span>Live Alerts</span>
              <span className="ml-auto text-critical text-[10px] tabular-nums">{MOCK_ALERTS.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1" data-lenis-prevent>
              {MOCK_ALERTS.map((alert) => (
                <div key={alert.id} className="p-2.5 rounded border border-noise/20 bg-panel/30 hover:bg-panel/60 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${ALERT_ICONS[alert.type]?.replace("text-", "bg-")}`} />
                    <span className="font-mono text-[9px] text-dim tracking-wider">{alert.time}</span>
                  </div>
                  <p className="font-mono text-[11px] text-signal/90 leading-relaxed">{alert.message}</p>
                </div>
              ))}
              <div className="pt-4 text-center">
                <span className="font-mono text-[9px] text-dim tracking-wide">END OF BUFFER • PROTOTYPE MODE</span>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Drone Fleet ── */}
          <div className="dashboard-panel flex flex-col h-full">
            <div className="dashboard-panel-header flex items-center gap-2">
              <Navigation className="w-3 h-3" />
              <span>Drone Fleet</span>
              <span className="ml-auto text-[10px]">
                <span className="text-pulse">{activeDrones}</span>
                <span className="text-dim">/{MOCK_DRONES.length}</span>
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5" data-lenis-prevent>
              {MOCK_DRONES.map((drone) => (
                <div key={drone.id} className="p-2.5 rounded border border-noise/20 bg-panel/30 hover:bg-panel/60 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[drone.status]} ${
                        drone.status === "en-route" || drone.status === "on-scene" ? "animate-pulse" : ""
                      }`} />
                      <span className="font-mono text-[11px] text-signal">{drone.id}</span>
                    </div>
                    <span className="font-mono text-[9px] text-dim tracking-wider uppercase">{drone.status.replace("-", " ")}</span>
                  </div>
                  <div className="font-mono text-[10px] text-dim mb-2">{drone.name}</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center gap-1">
                      <Battery className={`w-3 h-3 ${drone.battery > 50 ? "text-ops" : drone.battery > 20 ? "text-high" : "text-critical"}`} />
                      <span className="font-mono text-[9px] text-signal">{drone.battery}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3 text-dim" />
                      <span className="font-mono text-[9px] text-signal">{drone.altitude}m</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-dim" />
                      <span className="font-mono text-[9px] text-signal">{drone.speed} km/h</span>
                    </div>
                  </div>
                  {drone.status !== "idle" && drone.status !== "charging" && (
                    <div className="mt-2 pt-2 border-t border-noise/20 font-mono text-[9px] text-pulse">
                      📍 {drone.lat}°N, {drone.lng}°E
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── BOTTOM: Camera feeds (compact) ── */}
        <div className="h-[120px] border-t border-noise/30 bg-surface flex items-stretch gap-px overflow-hidden">
          {["CAM-01 · Deccan Gymkhana", "CAM-02 · Shivajinagar", "CAM-03 · FC Road", "CAM-04 · JM Road", "CAM-05 · Baner", "CAM-06 · Hinjawadi"].map((cam) => (
            <div key={cam} className="flex-1 bg-void flex flex-col items-center justify-center gap-2 relative group hover:bg-panel/20 transition-colors border-r border-noise/10 last:border-r-0">
              <Camera className="w-5 h-5 text-dim group-hover:text-pulse/60 transition-colors" />
              <span className="font-mono text-[8px] text-dim tracking-widest group-hover:text-signal/60 transition-colors">{cam}</span>
              <div className="absolute inset-0 bg-gradient-to-t from-void/80 to-transparent pointer-events-none" />
              {/* Scanline effect */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,178,0.015)_1px,transparent_1px)] bg-[size:100%_3px] pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
