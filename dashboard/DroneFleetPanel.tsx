"use client";

import { useSimulationStore } from "@/store/simulation-store";
import { DroneCard } from "./DroneCard";
import { Navigation } from "lucide-react";

export function DroneFleetPanel() {
  const drones = useSimulationStore((s) => s.drones);
  const stats = useSimulationStore((s) => s.stats);

  return (
    <div className="dashboard-panel flex flex-col h-full">
      <div className="dashboard-panel-header flex items-center gap-2">
        <Navigation className="w-3 h-3" />
        <span>Drone Fleet</span>
        <span className="ml-auto text-[10px]">
          <span className="text-pulse">{stats.dronesActive}</span>
          <span className="text-dim">/{drones.length}</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5" data-lenis-prevent>
        {drones.map((drone) => (
          <DroneCard key={drone.id} drone={drone} />
        ))}
      </div>
    </div>
  );
}
