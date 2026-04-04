"use client";

import type { Drone } from "@/simulation/types";
import { useSimulationStore } from "@/store/simulation-store";
import { Battery, Gauge, Mountain, Clock } from "lucide-react";

interface DroneCardProps {
  drone: Drone;
}

const STATUS_COLORS: Record<string, string> = {
  idle: "#C8F23A",
  "en-route": "#FF8C00",
  dispatched: "#FF8C00",
  "on-scene": "#FF4444",
  returning: "#FFD700",
  charging: "#00BFFF",
};

export function DroneCard({ drone }: DroneCardProps) {
  const selectedDrone = useSimulationStore((s) => s.selectedDrone);
  const selectDrone = useSimulationStore((s) => s.selectDrone);
  const isSelected = selectedDrone === drone.id;
  const statusColor = STATUS_COLORS[drone.status] || "#757575";

  return (
    <button
      className={`w-full text-left p-2.5 border transition-all ${
        isSelected
          ? "border-pulse/60 bg-pulse/5"
          : "border-noise/20 bg-void/30 hover:border-noise/40"
      }`}
      onClick={() => selectDrone(isSelected ? null : drone.id)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[11px] text-signal tracking-wider">
          {drone.name}
        </span>
        <span
          className="font-mono text-[9px] tracking-wider uppercase px-1.5 py-0.5"
          style={{ color: statusColor, backgroundColor: `${statusColor}15` }}
        >
          {drone.status}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {/* Battery */}
        <div className="flex items-center gap-1.5">
          <Battery className="w-3 h-3 text-dim" />
          <div className="flex-1">
            <div className="h-1 bg-noise/30 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(0, drone.battery)}%`,
                  backgroundColor:
                    drone.status === "charging"
                      ? "#00BFFF"
                      : drone.battery > 30
                        ? "#C8F23A"
                        : "#FF4444",
                  transition: "width 0.5s ease, background-color 0.3s ease",
                }}
              />
            </div>
          </div>
          <span className="font-mono text-[9px] text-dim">{Math.max(0, Math.round(drone.battery))}%</span>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-1">
          <Gauge className="w-3 h-3 text-dim" />
          <span className="font-mono text-[9px] text-dim">
            {drone.status === "idle" || drone.status === "charging" ? "0" : drone.speed} km/h
          </span>
        </div>

        {/* Altitude */}
        <div className="flex items-center gap-1">
          <Mountain className="w-3 h-3 text-dim" />
          <span className="font-mono text-[9px] text-dim">{drone.altitude}m</span>
        </div>

        {/* ETA */}
        {drone.eta > 0 && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-dim" />
            <span className="font-mono text-[9px] text-high">
              ETA {drone.eta}s
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
