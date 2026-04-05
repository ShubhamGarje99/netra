"use client";

import { Circle, Popup } from "react-leaflet";
import { useMemo } from "react";
import { useSimulationStore } from "@/store/simulation-store";
import { INCIDENT_ZONES } from "@/lib/netra-constants";
import { haversineKm } from "@/lib/geo";

const RADIUS_KM = 2.2;

/**
 * Predictive-style risk overlay: zone base risk + recent incident density near each landmark.
 */
export function RiskHeatmapLayer() {
  const incidents = useSimulationStore((s) => s.incidents);

  const layers = useMemo(() => {
    return INCIDENT_ZONES.map((zone) => {
      const nearby = incidents.filter(
        (inc) => haversineKm(inc.position, zone.position) <= RADIUS_KM && inc.status !== "resolved"
      ).length;
      const base = zone.riskLevel === "high" ? 0.14 : zone.riskLevel === "medium" ? 0.1 : 0.06;
      const boost = Math.min(0.22, nearby * 0.045);
      const fillOpacity = Math.min(0.38, base + boost);
      
      // Use logarithmic growth to prevent circles from becoming overwhelmingly large
      const radiusGrowth = Math.log1p(nearby) * 250;
      const radiusM = 650 + (zone.riskLevel === "high" ? 180 : 0) + radiusGrowth;

      const color =
        zone.riskLevel === "high" ? "#FF4444" : zone.riskLevel === "medium" ? "#FF8C00" : "#C8F23A";

      return { zone, nearby, fillOpacity, radiusM, color };
    });
  }, [incidents]);

  return (
    <>
      {layers.map(({ zone, nearby, fillOpacity, radiusM, color }) => (
        <Circle
          key={`heat-${zone.name}`}
          center={zone.position}
          radius={radiusM}
          pathOptions={{
            color,
            fillColor: color,
            fillOpacity,
            weight: 1,
            opacity: 0.35,
          }}
        >
          <Popup>
            <div className="text-xs font-sans">
              <strong>{zone.name}</strong>
              <br />
              Base risk: {zone.riskLevel}
              <br />
              Active incidents ≤{RADIUS_KM} km: {nearby}
            </div>
          </Popup>
        </Circle>
      ))}
    </>
  );
}
