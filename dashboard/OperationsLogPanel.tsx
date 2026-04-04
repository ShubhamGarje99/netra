"use client";

import { useMemo, useRef, useEffect } from "react";
import { useSimulationStore } from "@/store/simulation-store";
import { ScrollText } from "lucide-react";

/**
 * Scrollable timestamped log from the simulation runtime (alerts = detections, dispatch, arrivals, resolutions, system).
 */
export function OperationsLogPanel() {
  const alerts = useSimulationStore((s) => s.alerts);
  const scrollRef = useRef<HTMLDivElement>(null);

  const entries = useMemo(
    () => [...alerts].sort((a, b) => b.timestamp - a.timestamp).slice(0, 160),
    [alerts]
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [alerts.length]);

  return (
    <div className="dashboard-panel flex flex-col h-full min-h-0 border-t border-noise/20">
      <div className="dashboard-panel-header flex items-center gap-2 shrink-0">
        <ScrollText className="w-3 h-3" />
        <span>Operations Log</span>
        <span className="ml-auto text-[9px] text-dim font-mono">alerts + system</span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1 font-mono text-[9px] leading-snug"
        data-lenis-prevent
      >
        {entries.map((a) => {
          const t = new Date(a.timestamp).toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          });
          return (
            <div key={a.id} className="border-l border-noise/25 pl-2 py-0.5">
              <div className="text-dim">
                {t}{" "}
                <span className="text-pulse/80 uppercase tracking-wider">[{a.type}]</span>{" "}
                <span className="text-signal/60">{a.incidentId || "—"}</span>
              </div>
              <div className="text-signal/90">{a.message}</div>
            </div>
          );
        })}
        {entries.length === 0 && (
          <div className="text-dim text-center py-6">No log entries yet</div>
        )}
      </div>
    </div>
  );
}
