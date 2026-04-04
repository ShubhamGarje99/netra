"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { INCIDENT_TYPE_LABELS } from "@/lib/netra-constants";
import type { IncidentType, Incident } from "@/simulation/types";
import { useSimulationStore } from "@/store/simulation-store";

interface VideoFeedCardProps {
  cameraId: string;
  location: string;
}

interface ActiveDetection {
  x: number;
  y: number;
  w: number;
  h: number;
  type: IncidentType;
  confidence: number;
  appearedAt: number;
}

const DETECTION_DISPLAY_DURATION = 5000; // 5 seconds

/**
 * Deterministic position for a detection based on incident ID.
 * Ensures the bounding box appears at a consistent spot per incident.
 */
function positionFromId(id: string, canvasW: number, canvasH: number) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  const absHash = Math.abs(hash);
  const w = 40 + (absHash % 40);
  const h = 30 + ((absHash >> 8) % 30);
  const x = 20 + ((absHash >> 4) % (canvasW - w - 40));
  const y = canvasH * 0.25 + ((absHash >> 12) % (canvasH * 0.55));
  return { x, y, w, h };
}

export function VideoFeedCard({ cameraId, location }: VideoFeedCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const movingDotsRef = useRef<{ x: number; y: number; dx: number; dy: number; size: number }[]>([]);
  const activeDetectionsRef = useRef<Map<string, ActiveDetection>>(new Map());
  const [streamAvailable, setStreamAvailable] = useState<boolean>(true);
  const [clockLabel, setClockLabel] = useState<string>("--:--:--");

  const detectorUrl = useMemo(
    () => (process.env.NEXT_PUBLIC_DETECTOR_URL || "http://localhost:8000").replace(/\/$/, ""),
    []
  );

  const streamSrc = `${detectorUrl}/stream/${cameraId}`;

  useEffect(() => {
    const format = () =>
      new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

    setClockLabel(format());
    const timer = window.setInterval(() => {
      setClockLabel(format());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  // Pull active incidents from store, filtered to this camera
  const incidents = useSimulationStore((s) => s.incidents);

  // Sync real incidents to active detections
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const now = Date.now();
    const cameraIncidents = incidents.filter((inc: Incident) => {
      // Match incidents to this camera by description (format: "Detector CAM-XX-YY: label")
      // or by proximity — for auto-generated incidents, show on nearest camera
      if (inc.description.includes(cameraId)) return true;
      return false;
    });

    const existing = activeDetectionsRef.current;

    // Add new detections
    for (const inc of cameraIncidents) {
      if (inc.status === "resolved") continue;
      if (!existing.has(inc.id)) {
        const pos = positionFromId(inc.id, canvas.width, canvas.height);
        existing.set(inc.id, {
          ...pos,
          type: inc.type,
          confidence: inc.detectionConfidence,
          appearedAt: now,
        });
      }
    }

    // Remove resolved incidents
    const activeIds = new Set(cameraIncidents.filter((i: Incident) => i.status !== "resolved").map((i: Incident) => i.id));
    for (const [id, det] of existing) {
      if (!activeIds.has(id) && now - det.appearedAt > DETECTION_DISPLAY_DURATION) {
        existing.delete(id);
      }
    }
  }, [incidents, cameraId]);

  useEffect(() => {
    if (streamAvailable) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    const w = canvas.width;
    const h = canvas.height;

    // Initialize moving dots (simulated vehicles/people)
    movingDotsRef.current = Array.from({ length: 8 }, () => ({
      x: Math.random() * w,
      y: h * 0.4 + Math.random() * h * 0.5,
      dx: (Math.random() - 0.5) * 2,
      dy: (Math.random() - 0.5) * 0.5,
      size: 1 + Math.random() * 2,
    }));

    let rafId: number;
    let lastTime = 0;
    const fps = 15;
    const interval = 1000 / fps;

    function render(timestamp: number) {
      rafId = requestAnimationFrame(render);

      if (timestamp - lastTime < interval) return;
      lastTime = timestamp;
      frameRef.current++;

      // Background: dark gradient
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#0A0A0A");
      grad.addColorStop(0.3, "#0E0E0E");
      grad.addColorStop(1, "#121212");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Buildings (static rectangles)
      ctx.fillStyle = "#1A1A1A";
      for (let i = 0; i < 6; i++) {
        const bx = i * (w / 6) + 5;
        const bh = 20 + Math.sin(i * 1.5) * 30 + 30;
        ctx.fillRect(bx, h * 0.3 - bh, w / 8, bh);
      }

      // Road lines
      ctx.strokeStyle = "#1E1E1E";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.65);
      ctx.lineTo(w, h * 0.65);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, h * 0.75);
      ctx.lineTo(w, h * 0.75);
      ctx.stroke();

      // Dashed center line
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = "#2A2A2A";
      ctx.beginPath();
      ctx.moveTo(0, h * 0.7);
      ctx.lineTo(w, h * 0.7);
      ctx.stroke();
      ctx.setLineDash([]);

      // Moving dots (vehicles/people)
      for (const dot of movingDotsRef.current) {
        dot.x += dot.dx;
        dot.y += dot.dy;
        if (dot.x < 0 || dot.x > w) dot.dx *= -1;
        if (dot.y < h * 0.4 || dot.y > h * 0.95) dot.dy *= -1;

        ctx.fillStyle = "#3B3B3B";
        ctx.fillRect(dot.x, dot.y, dot.size * 2, dot.size);
      }

      // Noise scatter
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = `rgba(200, 200, 200, ${Math.random() * 0.03})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }

      // Draw detection bounding boxes from real incidents
      const now = Date.now();
      for (const [, det] of activeDetectionsRef.current) {
        const age = now - det.appearedAt;
        const alpha = age < 300 ? age / 300 : 1; // fade in
        const pulseAlpha = 0.7 + 0.3 * Math.sin(now / 200); // pulsing effect for active detections

        // Bounding box
        ctx.strokeStyle = `rgba(200, 242, 58, ${alpha * pulseAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(det.x, det.y, det.w, det.h);

        // Corner markers
        const cornerLen = 6;
        ctx.lineWidth = 2;
        ctx.strokeStyle = `rgba(200, 242, 58, ${alpha})`;
        // Top-left
        ctx.beginPath();
        ctx.moveTo(det.x, det.y + cornerLen);
        ctx.lineTo(det.x, det.y);
        ctx.lineTo(det.x + cornerLen, det.y);
        ctx.stroke();
        // Top-right
        ctx.beginPath();
        ctx.moveTo(det.x + det.w - cornerLen, det.y);
        ctx.lineTo(det.x + det.w, det.y);
        ctx.lineTo(det.x + det.w, det.y + cornerLen);
        ctx.stroke();
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(det.x, det.y + det.h - cornerLen);
        ctx.lineTo(det.x, det.y + det.h);
        ctx.lineTo(det.x + cornerLen, det.y + det.h);
        ctx.stroke();
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(det.x + det.w - cornerLen, det.y + det.h);
        ctx.lineTo(det.x + det.w, det.y + det.h);
        ctx.lineTo(det.x + det.w, det.y + det.h - cornerLen);
        ctx.stroke();

        // Label
        const label = `${INCIDENT_TYPE_LABELS[det.type]} [${Math.round(det.confidence * 100)}%]`;
        ctx.font = "9px monospace";
        ctx.fillStyle = `rgba(200, 242, 58, ${alpha})`;
        const labelWidth = ctx.measureText(label).width;
        ctx.fillRect(det.x, det.y - 12, labelWidth + 6, 12);
        ctx.fillStyle = `rgba(8, 8, 8, ${alpha})`;
        ctx.fillText(label, det.x + 3, det.y - 3);
      }

      // HUD overlay
      ctx.font = "9px monospace";
      // Timestamp
      const timeStr = new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      });
      ctx.fillStyle = "rgba(200, 242, 58, 0.7)";
      ctx.fillText(timeStr, 4, 10);

      // Camera ID
      ctx.fillStyle = "rgba(240, 238, 232, 0.5)";
      ctx.textAlign = "right";
      ctx.fillText(cameraId, w - 4, 10);
      ctx.textAlign = "left";

      // AI model indicator
      ctx.fillStyle = "rgba(200, 242, 58, 0.4)";
      ctx.fillText("YOLOv8", 4, h - 16);

      // Active detections count
      const detCount = activeDetectionsRef.current.size;
      if (detCount > 0) {
        ctx.fillStyle = "rgba(255, 68, 68, 0.8)";
        ctx.fillText(`${detCount} DETECTION${detCount > 1 ? "S" : ""}`, 4, h - 28);
      }

      // REC indicator
      if (Math.floor(frameRef.current / 8) % 2 === 0) {
        ctx.fillStyle = "#FF4444";
        ctx.beginPath();
        ctx.arc(10, h - 8, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(255, 68, 68, 0.6)";
      ctx.fillText("REC", 16, h - 4);

      // Crosshair
      ctx.strokeStyle = "rgba(200, 242, 58, 0.1)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
    }

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [cameraId, streamAvailable]);

  return (
    <div className="relative bg-void border border-noise/20 overflow-hidden">
      {streamAvailable ? (
        <>
          <img
            src={streamSrc}
            alt={`${cameraId} live stream`}
            className="w-full h-full object-cover"
            onLoad={() => setStreamAvailable(true)}
            onError={() => setStreamAvailable(false)}
          />
          <div className="pointer-events-none absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-1 text-[9px] font-mono text-primary/80 bg-void/30">
            <span>{clockLabel}</span>
            <span className="text-dim">{cameraId}</span>
          </div>
          <div className="pointer-events-none absolute left-2 bottom-5 flex items-center gap-1 text-[9px] font-mono text-[#FF4444]/85">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#FF4444] animate-pulse" />
            <span>REC</span>
          </div>
          <div className="pointer-events-none absolute left-2 bottom-2 text-[9px] font-mono text-primary/70">YOLOv8 LIVE</div>
        </>
      ) : (
        <canvas
          ref={canvasRef}
          width={320}
          height={180}
          className="w-full h-full"
        />
      )}
      <div className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 bg-void/60">
        <span className="font-mono text-[8px] text-dim">{location}</span>
      </div>
    </div>
  );
}
