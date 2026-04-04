"use client";

import { useSimulationStore } from "@/store/simulation-store";
import { SEVERITY_COLORS, INCIDENT_TYPE_LABELS } from "@/lib/netra-constants";
import { Clock } from "lucide-react";

export function IncidentTimeline() {
  const incidents = useSimulationStore((s) => s.incidents);
  const selectIncident = useSimulationStore((s) => s.selectIncident);

  const sorted = [...incidents]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 15);

  return (
    <div className="dashboard-panel flex flex-col h-full">
      <div className="dashboard-panel-header flex items-center gap-2 flex-wrap">
        <Clock className="w-3 h-3" />
        <span>Incident Timeline</span>
        <span className="ml-auto text-[8px] text-dim font-mono font-normal">status history</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3" data-lenis-prevent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-2 top-0 bottom-0 w-px bg-noise/30" />

          {sorted.map((incident) => {
            const color = SEVERITY_COLORS[incident.severity];
            const time = new Date(incident.timestamp).toLocaleTimeString("en-IN", {
              timeZone: "Asia/Kolkata",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            });

            return (
              <button
                key={incident.id}
                className="relative pl-6 pb-4 w-full text-left hover:bg-noise/10 rounded transition-colors"
                onClick={() => selectIncident(incident.id)}
              >
                {/* Dot */}
                <div
                  className="absolute left-1 top-1 w-2.5 h-2.5 rounded-full border-2"
                  style={{
                    borderColor: color,
                    backgroundColor: incident.status === "resolved" ? "transparent" : color,
                  }}
                />

                {/* Content */}
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[10px] text-dim">{time}</span>
                  <span
                    className="font-mono text-[9px] tracking-wider uppercase px-1 py-0.5"
                    style={{ color, backgroundColor: `${color}15` }}
                  >
                    {incident.status}
                  </span>
                </div>

                <p className="font-mono text-[10px] text-signal/80 leading-tight">
                  {incident.id} — {INCIDENT_TYPE_LABELS[incident.type]}
                </p>
                <p className="font-sans text-[10px] text-dim leading-tight">
                  {incident.locationName}
                  {incident.assignedDrone && ` → ${incident.assignedDrone}`}
                </p>
              </button>
            );
          })}

          {sorted.length === 0 && (
            <div className="font-mono text-[10px] text-dim text-center py-8 pl-6">
              No incidents recorded
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
