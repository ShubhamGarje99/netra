"use client";

import { useEffect, useMemo, useState } from "react";
import { useSimulationStore } from "@/store/simulation-store";
import { BarChart3 } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { INCIDENT_TYPE_LABELS } from "@/lib/netra-constants";

const TYPE_COLORS: Record<string, string> = {
  crowd_gathering: "#C8F23A",
  road_accident: "#FF4444",
  unauthorized_entry: "#FF8C00",
  suspicious_vehicle: "#FFD700",
  abandoned_object: "#757575",
  traffic_violation: "#3B3B3B",
};

export function AnalyticsPanel() {
  const incidents = useSimulationStore((s) => s.incidents);
  const stats = useSimulationStore((s) => s.stats);

  // Defer chart rendering until after first layout paint to avoid
  // ResponsiveContainer measuring -1 dimensions before CSS layout.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Incident type distribution
  const pieData = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    for (const inc of incidents) {
      typeCounts[inc.type] = (typeCounts[inc.type] || 0) + 1;
    }

    return Object.entries(typeCounts).map(([type, count]) => ({
      name: INCIDENT_TYPE_LABELS[type as keyof typeof INCIDENT_TYPE_LABELS] || type,
      value: count,
      color: TYPE_COLORS[type] || "#757575",
    }));
  }, [incidents]);

  // Response time bar chart
  const responseData = useMemo(
    () =>
      stats.responseTimes.map((t, i) => ({
        name: `#${i + 1}`,
        time: t,
      })),
    [stats.responseTimes]
  );

  return (
    <div className="dashboard-panel flex flex-col h-full">
      <div className="dashboard-panel-header flex items-center gap-2">
        <BarChart3 className="w-3 h-3" />
        <span>Analytics</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4" data-lenis-prevent>
        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="font-display text-2xl text-pulse">{stats.totalIncidents}</div>
            <div className="font-mono text-[9px] text-dim">TOTAL</div>
          </div>
          <div className="text-center">
            <div className="font-display text-2xl text-critical">{stats.activeIncidents}</div>
            <div className="font-mono text-[9px] text-dim">ACTIVE</div>
          </div>
          <div className="text-center">
            <div className="font-display text-2xl text-signal">{stats.avgResponseTime}s</div>
            <div className="font-mono text-[9px] text-dim">AVG RESP</div>
          </div>
        </div>

        {/* Incident type pie chart */}
        {mounted && pieData.length > 0 && (
          <div>
            <div className="font-mono text-[9px] text-dim tracking-wider mb-2">INCIDENT DISTRIBUTION</div>
            <div className="h-28 min-h-[112px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={45}
                    paddingAngle={2}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-2 h-2" style={{ backgroundColor: d.color }} />
                  <span className="font-mono text-[8px] text-dim">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Response time bar chart */}
        {mounted && responseData.length > 0 && (
          <div>
            <div className="font-mono text-[9px] text-dim tracking-wider mb-2">RESPONSE TIMES (s)</div>
            <div className="h-24 min-h-[96px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={responseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3B3B3B" strokeOpacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#757575" }} />
                  <YAxis tick={{ fontSize: 8, fill: "#757575" }} />
                  <Bar dataKey="time" fill="#C8F23A" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
