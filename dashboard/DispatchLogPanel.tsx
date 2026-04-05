"use client";

import { useSimulationStore } from "@/store/simulation-store";
import { Brain, ChevronRight } from "lucide-react";

/**
 * Dispatch Decision Log — Explainability UI.
 * Surfaces the AI's scoring math for each dispatch decision.
 */
export function DispatchLogPanel() {
  const dispatchLogs = useSimulationStore((s) => s.dispatchLogs);
  const drones = useSimulationStore((s) => s.drones);

  const getDroneName = (id: string) => {
    const drone = drones.find((d) => d.id === id);
    return drone?.name ?? id;
  };

  const sorted = [...dispatchLogs].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="flex flex-col h-full">
      <div className="dashboard-panel-header flex items-center gap-2 shrink-0">
        <Brain className="w-3 h-3" />
        <span>AI Dispatch Log</span>
        <span className="ml-auto text-[9px] text-dim font-mono">
          {sorted.length}/10 decisions
        </span>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5 font-mono text-[9px]"
        data-lenis-prevent
      >
        {sorted.length === 0 && (
          <div className="text-dim text-center py-6 text-[10px]">
            No dispatch decisions yet
          </div>
        )}

        {sorted.map((entry, idx) => {
          const time = new Date(entry.timestamp).toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          });

          return (
            <div
              key={`${entry.incidentId}-${entry.timestamp}-${idx}`}
              className="border border-noise/20 bg-void/40 p-2 rounded-sm"
            >
              {/* Header */}
              <div className="flex items-center gap-1.5 mb-1">
                <ChevronRight className="w-2.5 h-2.5 text-pulse" />
                <span className="text-pulse tracking-wider">
                  {entry.incidentId}
                </span>
                <span className="text-dim">→</span>
                <span className="text-signal font-semibold">
                  {getDroneName(entry.selectedDroneId)}
                </span>
                <span className="ml-auto text-dim">{time}</span>
              </div>

              {/* Score details */}
              <div className="flex gap-3 text-dim ml-4">
                <span>
                  Score:{" "}
                  <span className="text-pulse">{entry.score.toFixed(3)}</span>
                </span>
                <span>
                  ETA:{" "}
                  <span className="text-signal/80">{entry.eta}s</span>
                </span>
                <span>
                  Post-Battery:{" "}
                  <span
                    style={{
                      color: entry.batteryAfter > 30 ? "#C8F23A" : "#FF4444",
                    }}
                  >
                    {entry.batteryAfter}%
                  </span>
                </span>
              </div>

              {/* Runners up */}
              {entry.runnersUp.length > 0 && (
                <div className="ml-4 mt-1 text-dim/60">
                  <span className="text-dim/40">Runners-up: </span>
                  {entry.runnersUp.map((r, i) => (
                    <span key={r.droneId}>
                      {i > 0 && " · "}
                      <span className="text-dim/70">
                        {getDroneName(r.droneId)}
                      </span>{" "}
                      <span className="text-dim/40">({r.score.toFixed(3)})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
