"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useSimulationStore } from "@/store/simulation-store";
import { StatusBar } from "./StatusBar";
import { AlertPanel } from "./AlertPanel";
import { DroneFleetPanel } from "./DroneFleetPanel";
import { VideoFeedPanel } from "./VideoFeedPanel";
import { IncidentTimeline } from "./IncidentTimeline";
import { OperationsLogPanel } from "./OperationsLogPanel";
import { AnalyticsPanel } from "./AnalyticsPanel";
import { DronePOVFeed } from "./DronePOVFeed";
import { DispatchLogPanel } from "./DispatchLogPanel";
import { Toast } from "./Toast";
import { Camera, Brain, ChevronDown, ChevronUp } from "lucide-react";

// Dynamic import for Leaflet (SSR-incompatible)
const MapPanel = dynamic(() => import("./MapPanel").then((m) => m.MapPanel), {
  ssr: false,
  loading: () => (
    <div className="dashboard-panel h-full flex items-center justify-center">
      <span className="font-mono text-xs text-dim animate-blink">Loading map...</span>
    </div>
  ),
});

export function DashboardShell() {
  const [povOpen, setPovOpen] = useState(true);
  const [dispatchLogOpen, setDispatchLogOpen] = useState(false);

  const drones = useSimulationStore((s) => s.drones);
  const hasBusyDrone = drones.some(
    (d) =>
      d.assignedIncident &&
      (d.status === "on-scene" || d.status === "en-route" || d.status === "dispatched")
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-void overflow-hidden">
      {/* Toast notifications */}
      <Toast />

      {/* Status bar */}
      <StatusBar />

      {/* Main content */}
      <div className="flex-1 grid grid-rows-[60fr_40fr] gap-px bg-noise/10 overflow-hidden">
        {/* Top row: Map + Sidebar */}
        <div className="grid grid-cols-[1fr_280px_240px] gap-px overflow-hidden">
          {/* Map + POV overlay */}
          <div className="relative overflow-hidden">
            <MapPanel />

            {/* Drone POV — collapsible overlay on bottom-left of map */}
            {hasBusyDrone && (
              <div
                className={`
                  absolute bottom-2 left-2 z-[1000] transition-all duration-300 ease-in-out
                  ${povOpen ? "w-[320px] h-[220px]" : "w-auto h-auto"}
                `}
              >
                {povOpen ? (
                  <div className="w-full h-full rounded border border-pulse/30 overflow-hidden shadow-lg shadow-black/50 bg-void">
                    <DronePOVFeed onClose={() => setPovOpen(false)} />
                  </div>
                ) : (
                  <button
                    onClick={() => setPovOpen(true)}
                    className="
                      flex items-center gap-1.5 px-2.5 py-1.5 rounded border
                      border-pulse/40 bg-void/90 backdrop-blur-sm
                      font-mono text-[10px] text-pulse tracking-wider
                      hover:bg-pulse/10 hover:border-pulse/60 transition-all
                      shadow-md shadow-black/40
                    "
                  >
                    <Camera className="w-3 h-3" />
                    DRONE POV
                    <ChevronUp className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Dispatch Log — collapsible overlay on bottom-right of map */}
            <div
              className={`
                absolute bottom-2 right-2 z-[1000] transition-all duration-300 ease-in-out
                ${dispatchLogOpen ? "w-[380px] h-[260px]" : "w-auto h-auto"}
              `}
            >
              {dispatchLogOpen ? (
                <div className="w-full h-full rounded border border-pulse/30 overflow-hidden shadow-lg shadow-black/50 bg-surface flex flex-col">
                  <button
                    onClick={() => setDispatchLogOpen(false)}
                    className="absolute top-1 right-1 z-10 text-dim hover:text-signal text-xs px-1"
                  >
                    ✕
                  </button>
                  <DispatchLogPanel />
                </div>
              ) : (
                <button
                  onClick={() => setDispatchLogOpen(true)}
                  className="
                    flex items-center gap-1.5 px-2.5 py-1.5 rounded border
                    border-pulse/40 bg-void/90 backdrop-blur-sm
                    font-mono text-[10px] text-pulse tracking-wider
                    hover:bg-pulse/10 hover:border-pulse/60 transition-all
                    shadow-md shadow-black/40
                  "
                >
                  <Brain className="w-3 h-3" />
                  AI LOG
                  <ChevronUp className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Alert panel */}
          <AlertPanel />

          {/* Drone fleet */}
          <DroneFleetPanel />
        </div>

        {/* Bottom row: Video + Timeline + Analytics */}
        <div className="grid grid-cols-[2fr_1.25fr_1fr] gap-px overflow-hidden min-h-0">
          {/* Video feeds */}
          <VideoFeedPanel />

          {/* Incident timeline + operations log */}
          <div className="flex flex-col min-h-0 min-w-0 border-x border-noise/10">
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <IncidentTimeline />
            </div>
            <div className="h-[min(32%,140px)] min-h-[100px] max-h-[160px] shrink-0 flex flex-col">
              <OperationsLogPanel />
            </div>
          </div>

          {/* Analytics */}
          <AnalyticsPanel />
        </div>
      </div>
    </div>
  );
}
