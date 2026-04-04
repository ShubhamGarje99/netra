"use client";

import { useEffect, useRef } from "react";
import { useSimulationStore } from "@/store/simulation-store";
import { AlertCard } from "./AlertCard";
import { Bell } from "lucide-react";

export function AlertPanel() {
  const alerts = useSimulationStore((s) => s.alerts);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new alerts
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [alerts.length]);

  const displayAlerts = alerts.slice(-30).reverse();

  return (
    <div className="dashboard-panel flex flex-col h-full">
      <div className="dashboard-panel-header flex items-center gap-2">
        <Bell className="w-3 h-3" />
        <span>Live Alerts</span>
        <span className="ml-auto text-critical text-[10px] tabular-nums" title="Buffered runtime alerts">
          {alerts.length}*
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1" data-lenis-prevent>
        {displayAlerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
        {displayAlerts.length === 0 && (
          <div className="font-mono text-[10px] text-dim text-center py-8">
            No alerts yet — monitoring...
          </div>
        )}
      </div>
      <p className="shrink-0 px-2 pb-1.5 font-mono text-[8px] text-dim/80 leading-tight">
        *Count = in-memory buffer (detector + simulation), not a marketing metric.
      </p>
    </div>
  );
}
