"use client";

import { useEffect, useRef, useMemo } from "react";
import { useSimulationStore } from "@/store/simulation-store";
import { X, Radio } from "lucide-react";
import type { Drone, Incident } from "@/simulation/types";

/**
 * Simulated drone gimbal feed — renders a tactical canvas HUD
 * showing coordinates, altitude, speed, crosshair, and horizon line.
 * Renders only when a drone is actively dispatched/on-scene.
 */

function usePovDrone(): { drone: Drone; incident: Incident } | null {
  const drones = useSimulationStore((s) => s.drones);
  const incidents = useSimulationStore((s) => s.incidents);
  const selectedDrone = useSimulationStore((s) => s.selectedDrone);

  return useMemo(() => {
    // If a drone is selected and active, prefer that one
    const candidates = selectedDrone
      ? drones.filter((d) => d.id === selectedDrone)
      : drones;

    const active = candidates.find(
      (d) =>
        d.assignedIncident &&
        (d.status === "on-scene" || d.status === "en-route" || d.status === "dispatched")
    );

    if (!active?.assignedIncident) {
      // Fallback: any busy drone
      const fallback = drones.find(
        (d) =>
          d.assignedIncident &&
          (d.status === "on-scene" || d.status === "en-route" || d.status === "dispatched")
      );
      if (!fallback?.assignedIncident) return null;
      const inc = incidents.find((i) => i.id === fallback.assignedIncident);
      return inc ? { drone: fallback, incident: inc } : null;
    }

    const inc = incidents.find((i) => i.id === active.assignedIncident);
    return inc ? { drone: active, incident: inc } : null;
  }, [drones, incidents, selectedDrone]);
}

function PovCanvas({ drone, incident }: { drone: Drone; incident: Incident }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let animId: number;
    let lastT = 0;
    const fps = 20;
    const interval = 1000 / fps;

    function render(timestamp: number) {
      animId = requestAnimationFrame(render);
      if (timestamp - lastT < interval) return;
      lastT = timestamp;
      frameRef.current++;

      const w = canvas!.width / dpr;
      const h = canvas!.height / dpr;
      const cx = w / 2;
      const cy = h / 2;
      const frame = frameRef.current;
      const now = Date.now();

      // ── Background: dark with subtle gradient ──
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#060C14");
      grad.addColorStop(0.4, "#0A1420");
      grad.addColorStop(1, "#0E1A28");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // ── Horizon line (slight sway) ──
      const horizonY = cy + Math.sin(now / 2200) * 4;
      ctx.strokeStyle = "rgba(0, 200, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(w, horizonY);
      ctx.stroke();

      // ── Grid overlay ──
      ctx.strokeStyle = "rgba(28, 46, 66, 0.15)";
      ctx.lineWidth = 0.5;
      const gridSize = 40;
      for (let x = gridSize; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = gridSize; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // ── Simulated terrain rectangles (buildings) ──
      ctx.fillStyle = "#0F1A26";
      const buildingCount = 8;
      for (let i = 0; i < buildingCount; i++) {
        const seed = (i * 7919 + 13) % 100;
        const bx = (seed / 100) * w * 0.8 + w * 0.1;
        const bw = 12 + (seed % 20);
        const bh = 8 + (seed % 16);
        const by = horizonY + 10 + (i * 12) % (h * 0.3);
        ctx.fillRect(bx, by, bw, bh);
      }

      // ── Moving ground dots (motion parallax) ──
      ctx.fillStyle = "rgba(0, 200, 255, 0.08)";
      for (let i = 0; i < 15; i++) {
        const seed = (i * 3571 + frame * 0.5) % w;
        const sy = horizonY + 30 + ((i * 2719) % (h * 0.4));
        ctx.fillRect(seed, sy, 2, 1);
      }

      // ── Noise scatter ──
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = `rgba(200, 200, 200, ${Math.random() * 0.025})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }

      // ── Crosshair ──
      const crossLen = 20;
      const crossGap = 8;
      ctx.strokeStyle = "rgba(200, 242, 58, 0.5)";
      ctx.lineWidth = 1;
      // Top
      ctx.beginPath();
      ctx.moveTo(cx, cy - crossGap - crossLen);
      ctx.lineTo(cx, cy - crossGap);
      ctx.stroke();
      // Bottom
      ctx.beginPath();
      ctx.moveTo(cx, cy + crossGap);
      ctx.lineTo(cx, cy + crossGap + crossLen);
      ctx.stroke();
      // Left
      ctx.beginPath();
      ctx.moveTo(cx - crossGap - crossLen, cy);
      ctx.lineTo(cx - crossGap, cy);
      ctx.stroke();
      // Right
      ctx.beginPath();
      ctx.moveTo(cx + crossGap, cy);
      ctx.lineTo(cx + crossGap + crossLen, cy);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = "rgba(200, 242, 58, 0.7)";
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();

      // ── Rotating range circle ──
      ctx.strokeStyle = "rgba(0, 200, 255, 0.12)";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.arc(cx, cy, 50, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Sweep line
      const sweepAngle = (now / 1500) % (Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 200, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweepAngle) * 50, cy + Math.sin(sweepAngle) * 50);
      ctx.stroke();

      // ── HUD Text ──
      ctx.font = "9px monospace";
      ctx.textAlign = "left";

      // Top-left: drone name + status
      ctx.fillStyle = "rgba(0, 200, 255, 0.8)";
      ctx.fillText(`PAYLOAD ${drone.name}`, 8, 14);
      ctx.fillStyle = drone.status === "on-scene" ? "rgba(0, 230, 118, 0.8)" : "rgba(255, 200, 0, 0.8)";
      ctx.fillText(drone.status.toUpperCase().replace("-", " "), 8, 26);

      // Top-right: timestamp
      const timeStr = new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(200, 242, 58, 0.7)";
      ctx.fillText(timeStr, w - 8, 14);

      // Incident badge
      ctx.fillStyle = "rgba(255, 45, 74, 0.8)";
      ctx.fillText(incident.id, w - 8, 26);

      // Bottom-left: coordinates + altitude + speed
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(0, 200, 255, 0.7)";
      const lat = drone.position[0].toFixed(5);
      const lng = drone.position[1].toFixed(5);
      ctx.fillText(`LAT ${lat}`, 8, h - 38);
      ctx.fillText(`LNG ${lng}`, 8, h - 26);
      ctx.fillText(`ALT ${Math.round(drone.altitude)}m  SPD ${drone.speed}km/h  HDG ${Math.round(drone.heading)}°`, 8, h - 14);

      // Bottom-left: battery
      const batPct = Math.max(0, Math.round(drone.battery));
      ctx.fillStyle = batPct > 30 ? "rgba(0, 230, 118, 0.7)" : "rgba(255, 68, 68, 0.8)";
      ctx.fillText(`BAT ${batPct}%`, 8, h - 4);

      // Bottom-right: ETA
      ctx.textAlign = "right";
      if (drone.eta > 0) {
        ctx.fillStyle = "rgba(255, 200, 0, 0.8)";
        const etaMin = Math.floor(drone.eta / 60);
        const etaSec = drone.eta % 60;
        ctx.fillText(`ETA ${etaMin}m ${etaSec}s`, w - 8, h - 14);
      } else if (drone.status === "on-scene") {
        ctx.fillStyle = "rgba(0, 230, 118, 0.8)";
        ctx.fillText("ON STATION", w - 8, h - 14);
      }

      // Target location
      ctx.fillStyle = "rgba(216, 234, 244, 0.5)";
      ctx.fillText(`TGT ${incident.locationName}`, w - 8, h - 4);

      // ── REC indicator (blinking) ──
      if (Math.floor(frame / 10) % 2 === 0) {
        ctx.fillStyle = "#FF4444";
        ctx.beginPath();
        ctx.arc(w - 10, h - 30, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255, 68, 68, 0.6)";
      ctx.fillText("REC", w - 16, h - 26);

      // ── Corner brackets ──
      const cornerLen = 16;
      ctx.strokeStyle = "rgba(0, 200, 255, 0.25)";
      ctx.lineWidth = 1.5;
      // Top-left
      ctx.beginPath();
      ctx.moveTo(4, 4 + cornerLen);
      ctx.lineTo(4, 4);
      ctx.lineTo(4 + cornerLen, 4);
      ctx.stroke();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(w - 4 - cornerLen, 4);
      ctx.lineTo(w - 4, 4);
      ctx.lineTo(w - 4, 4 + cornerLen);
      ctx.stroke();
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(4, h - 4 - cornerLen);
      ctx.lineTo(4, h - 4);
      ctx.lineTo(4 + cornerLen, h - 4);
      ctx.stroke();
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(w - 4 - cornerLen, h - 4);
      ctx.lineTo(w - 4, h - 4);
      ctx.lineTo(w - 4, h - 4 - cornerLen);
      ctx.stroke();
    }

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, [drone, incident]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
}

export function DronePOVFeed({ onClose }: { onClose?: () => void }) {
  const link = usePovDrone();

  if (!link) {
    return (
      <div className="h-full flex items-center justify-center px-3 bg-void/80 border border-noise/15">
        <div className="flex items-center gap-2 text-dim">
          <Radio className="w-3 h-3 opacity-50" />
          <span className="font-mono text-[9px] tracking-wide">
            DRONE PAYLOAD — standby (no active dispatch)
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 bg-void border border-noise/20 overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-2 py-1 bg-static/90 border-b border-noise/20 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-ops animate-pulse" />
          <span className="font-mono text-[9px] text-pulse tracking-wider">
            {link.drone.name} — PAYLOAD FEED
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-critical/20 text-critical border border-critical/30">
            LIVE SIM
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-dim hover:text-signal transition-colors"
              aria-label="Close POV feed"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Canvas feed */}
      <div className="flex-1 min-h-0">
        <PovCanvas drone={link.drone} incident={link.incident} />
      </div>
    </div>
  );
}
