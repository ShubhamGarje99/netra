"use client";

import { useEffect, useState } from "react";
import { useSimulationStore } from "@/store/simulation-store";
import { IncidentIngestPayload } from "@/lib/server/simulation-runtime";

export function TerminalLog() {
  const incidents = useSimulationStore((s) => s.incidents);
  const [logContent, setLogContent] = useState<string>("");

  useEffect(() => {
    if (incidents.length === 0) {
      setLogContent(`{\n  "status": "awaiting_feed",\n  "system": "netra-core-v2"\n}`);
      return;
    }
    
    // Grab the latest incident
    const latest = incidents[incidents.length - 1];
    
    // Construct a mock payload that looks like what hits the API
    const payload: IncidentIngestPayload = {
      type: latest.type,
      severity: latest.severity,
      lat: latest.position[0],
      lng: latest.position[1],
      locationName: latest.locationName,
      description: latest.description,
      detectionConfidence: latest.detectionConfidence,
      resolveAfterTicks: latest.resolveAtTick - Date.now() / 1000 // roughly
    };

    setLogContent(JSON.stringify(payload, null, 2));

  }, [incidents]);

  return (
    <div className="w-full bg-[#0A0A0F] border border-[#1F2433] rounded overflow-hidden flex flex-col font-mono text-[11px] leading-relaxed select-text shadow-2xl">
      <div className="bg-[#161A25] border-b border-[#1F2433] px-3 py-2 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF3B3B] opacity-50" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#F5C542] opacity-50" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#00FFB2] opacity-50" />
        </div>
        <div className="ml-2 text-[#888888] font-mono text-[10px] tracking-widest">POST /api/ingest</div>
      </div>
      <div className="p-4 relative">
        <pre className="text-[#00FFB2] whitespace-pre-wrap break-all relative z-10 w-full overflow-x-hidden block">
          {logContent}
          <span className="inline-block w-2 bg-[#00FFB2] h-[1em] ml-1 align-baseline animate-pulse transition-none select-none"></span>
        </pre>
      </div>
    </div>
  );
}
