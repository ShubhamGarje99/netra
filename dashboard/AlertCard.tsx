"use client";

import type { Alert } from "@/simulation/types";
import { useSimulationStore } from "@/store/simulation-store";
import { SEVERITY_COLORS } from "@/lib/netra-constants";

interface AlertCardProps {
  alert: Alert;
}

export function AlertCard({ alert }: AlertCardProps) {
  const selectIncident = useSimulationStore((s) => s.selectIncident);
  const color = SEVERITY_COLORS[alert.severity];

  const time = new Date(alert.timestamp).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <button
      className="w-full text-left p-2 border-l-2 bg-void/50 hover:bg-noise/20 transition-colors"
      style={{ borderLeftColor: color }}
      onClick={() => alert.incidentId && selectIncident(alert.incidentId)}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span
          className="font-mono text-[9px] tracking-wider uppercase px-1 py-0.5"
          style={{ color, backgroundColor: `${color}15` }}
        >
          {alert.severity}
        </span>
        <span className="font-mono text-[9px] text-dim">{time}</span>
      </div>
      <p className="font-sans text-[11px] text-signal/80 leading-tight">
        {alert.message}
      </p>
    </button>
  );
}
