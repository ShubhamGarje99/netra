"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { INCIDENT_TYPE_LABELS } from "@/lib/netra-constants";
import type { IncidentType, Incident } from "@/simulation/types";
import { useSimulationStore } from "@/store/simulation-store";

interface VideoFeedCardProps {
  cameraId: string;
  location: string;
}

const STREAM_BASE = "http://localhost:5001";

// Fallback Canvas Component
function OfflineCanvas({ cameraId }: { cameraId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    let rafId: number;
    let offset = 0;
    
    function render() {
      if (!canvas || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      
      // Dark background
      ctx.fillStyle = "#0A0A0A";
      ctx.fillRect(0, 0, w, h);
      
      // Animated crosshair
      ctx.strokeStyle = "rgba(40, 60, 50, 0.5)";
      ctx.lineWidth = 1;
      
      offset = (offset + 0.5) % 20;
      
      ctx.beginPath();
      for(let y = offset; y < h; y += 20) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      for(let x = offset; x < w; x += 20) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      ctx.stroke();
      
      // Text
      ctx.fillStyle = "rgba(200, 242, 58, 0.4)";
      ctx.font = "14px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`AWAITING FEED`, w / 2, h / 2 - 10);
      
      ctx.font = "10px monospace";
      ctx.fillStyle = "rgba(240, 238, 232, 0.3)";
      ctx.fillText(cameraId, w / 2, h / 2 + 10);
      
      rafId = requestAnimationFrame(render);
    }
    
    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [cameraId]);

  return <canvas ref={canvasRef} width={320} height={180} className="w-full h-full block" />;
}

export function VideoFeedCard({ cameraId, location }: VideoFeedCardProps) {
  const [streamStatus, setStreamStatus] = useState<"loading" | "live" | "offline">("loading");
  const [lastIncidentFlash, setLastIncidentFlash] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  const selectedCamera = useSimulationStore((s) => s.selectedCamera);
  const isSelected = selectedCamera === cameraId;

  // Watch store for incidents from this camera
  const incidents = useSimulationStore(s => s.incidents);
  const recentIncident = useMemo(() => {
    return incidents.find(i => 
      (i.camera_id === cameraId || i.description?.includes(cameraId)) && 
      Date.now() - i.timestamp < 10000 &&
      i.status !== "resolved"
    );
  }, [incidents, cameraId]);

  useEffect(() => {
    if (recentIncident) {
      setLastIncidentFlash(true);
      const timer = setTimeout(() => setLastIncidentFlash(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [recentIncident?.id]);

  // Poll snapshots instead of holding persistent MJPEG connections.
  // Browsers limit HTTP/1.1 connections to ~6 per host, so holding 11
  // persistent MJPEG streams causes most to starve and show "OFFLINE".
  // Snapshot polling uses short-lived requests that close immediately.
  useEffect(() => {
    let cancelled = false;
    let consecutiveErrors = 0;

    async function poll() {
      while (!cancelled) {
        try {
          const response = await fetch(
            `${STREAM_BASE}/snapshot/${cameraId}?t=${Date.now()}`,
            { cache: "no-store" }
          );

          if (!response.ok || response.headers.get("content-type")?.includes("json")) {
            // JSON response = error payload from server
            consecutiveErrors++;
            if (consecutiveErrors > 5) {
              setStreamStatus("offline");
            }
            await sleep(1000);
            continue;
          }

          const blob = await response.blob();
          if (cancelled) break;

          const url = URL.createObjectURL(blob);
          setImgSrc((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
          setStreamStatus("live");
          consecutiveErrors = 0;

          await sleep(150); // ~6-7 fps visual — smooth enough, low overhead
        } catch {
          consecutiveErrors++;
          if (consecutiveErrors > 5) {
            setStreamStatus("offline");
          }
          await sleep(2000);
        }
      }
    }

    poll();
    return () => {
      cancelled = true;
      setImgSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [cameraId]);

  const borderStyle = isSelected
    ? "2px solid #00FFB2"
    : lastIncidentFlash
      ? "2px solid #00FFB2"
      : "1px solid #1e2d3d";

  return (
    <div className="relative bg-void overflow-hidden transition-all duration-300"
         style={{ border: borderStyle, aspectRatio: "4/3" }}>
      
      {imgSrc && streamStatus === "live" && (
        <img
          src={imgSrc}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            display: "block"
          }}
          alt={`Stream ${cameraId}`}
        />
      )}
      
      {streamStatus !== "live" && (
        <OfflineCanvas cameraId={cameraId} />
      )}

      <div className="absolute top-1.5 left-2 font-mono text-[10px] text-[#00FFB2] z-10 drop-shadow-md">
        {cameraId}
      </div>
      
      <div className="absolute top-1.5 right-2 flex items-center gap-1 z-10" style={{ background: "rgba(0,0,0,0.4)", padding: "2px 4px", borderRadius: "4px" }}>
        <span className="inline-block rounded-full" style={{
          width: 6, height: 6,
          background: streamStatus === "live" ? "#00FFB2" : "#444",
          animation: streamStatus === "live" ? "pulse 2s infinite" : "none"
        }} />
        <span className="font-mono text-[9px]" style={{
          color: streamStatus === "live" ? "#00FFB2" : "#444"
        }}>
          {streamStatus === "live" ? "LIVE" : streamStatus === "loading" ? "CONNECTING..." : "OFFLINE"}
        </span>
      </div>

      <div className="absolute bottom-6 left-2 right-2 px-1 py-0.5 z-10 w-fit drop-shadow-md">
        <span className="font-mono text-[8px] text-dim">{location}</span>
      </div>

      {recentIncident && (
        <div className="absolute bottom-0 left-0 right-0 py-1 px-2 z-20 text-center" style={{
          background: "rgba(255, 59, 59, 0.85)"
        }}>
          <span className="font-mono text-[9px] text-white tracking-wider animate-pulse">
            ⚠ {recentIncident.type?.replace(/_/g, " ").toUpperCase()} 
            {recentIncident.detectionConfidence ? ` · ${Math.round(recentIncident.detectionConfidence * 100)}%` : ""}
          </span>
        </div>
      )}
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
