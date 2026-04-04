"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Polygon, Polyline, Popup, useMap } from "react-leaflet";
import { RiskHeatmapLayer } from "@/dashboard/RiskHeatmapLayer";
import { useSimulationStore, shallow } from "@/store/simulation-store";
import {
  MAP_CENTER,
  MAP_ZOOM,
  MAP_MAX_BOUNDS,
  DARK_TILE_URL,
  TILE_ATTRIBUTION,
  NO_FLY_ZONES,
  SEVERITY_COLORS,
} from "@/lib/netra-constants";
import type { Drone, Incident } from "@/simulation/types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { CCTVMarkers } from "@/dashboard/CCTVMarkers";

/* ── Individual drone marker ─────────────────────────────────────── */
const DroneMarkerItem = memo(function DroneMarkerItem({
  drone,
  isSelected,
  selectDrone,
  selectIncident,
}: {
  drone: Drone;
  isSelected: boolean;
  selectDrone: (id: string | null) => void;
  selectIncident: (id: string | null) => void;
}) {
  const isActive = drone.status !== "idle" && drone.status !== "charging";

  const handleClick = useCallback(() => {
    selectIncident(null);
    selectDrone(isSelected ? null : drone.id);
  }, [drone.id, isSelected, selectDrone, selectIncident]);

  return (
    <CircleMarker
      center={drone.position}
      radius={isSelected ? 8 : 6}
      pathOptions={{
        color: isSelected ? "#F0EEE8" : "#C8F23A",
        fillColor: isActive ? "#C8F23A" : "#3B3B3B",
        fillOpacity: 0.9,
        weight: isSelected ? 2 : 1,
      }}
      eventHandlers={{ click: handleClick }}
    >
      <Popup autoPan={false}>
        <div className="text-xs">
          <strong>{drone.name}</strong>
          <br />
          Status: {drone.status}
          <br />
          Battery: {Math.round(drone.battery)}%
          {drone.eta > 0 && (
            <>
              <br />
              ETA: {drone.eta}s
            </>
          )}
        </div>
      </Popup>
    </CircleMarker>
  );
});

/* ── Drone markers list – only re-renders when positions/status change ── */
function DroneMarkers() {
  // Fingerprint: only re-render when position, status, battery, or eta change
  const drones = useSimulationStore(
    (s) => s.drones,
    (a, b) =>
      a.length === b.length &&
      a.every(
        (d, i) =>
          d.id === b[i].id &&
          d.position[0] === b[i].position[0] &&
          d.position[1] === b[i].position[1] &&
          d.status === b[i].status &&
          Math.round(d.battery) === Math.round(b[i].battery) &&
          d.eta === b[i].eta,
      ),
  );
  const selectedDrone = useSimulationStore((s) => s.selectedDrone);
  const selectDrone = useSimulationStore((s) => s.selectDrone);
  const selectIncident = useSimulationStore((s) => s.selectIncident);

  return (
    <>
      {drones.map((drone) => (
        <DroneMarkerItem
          key={drone.id}
          drone={drone}
          isSelected={selectedDrone === drone.id}
          selectDrone={selectDrone}
          selectIncident={selectIncident}
        />
      ))}
    </>
  );
}

/* ── Individual incident marker ──────────────────────────────────── */
const IncidentMarkerItem = memo(function IncidentMarkerItem({
  incident,
  isSelected,
  selectIncident,
  selectDrone,
}: {
  incident: Incident;
  isSelected: boolean;
  selectIncident: (id: string | null) => void;
  selectDrone: (id: string | null) => void;
}) {
  const color = SEVERITY_COLORS[incident.severity];

  const handleClick = useCallback(() => {
    selectDrone(null);
    selectIncident(isSelected ? null : incident.id);
  }, [incident.id, isSelected, selectDrone, selectIncident]);

  return (
    <CircleMarker
      center={incident.position}
      radius={isSelected ? 12 : 8}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: 0.4,
        weight: isSelected ? 2 : 1.5,
        dashArray: isSelected ? undefined : "4 4",
      }}
      eventHandlers={{ click: handleClick }}
    >
      <Popup autoPan={false}>
        <div className="text-xs">
          <strong>{incident.id}</strong>
          <br />
          {incident.description}
          <br />
          Severity: {incident.severity}
          <br />
          Status: {incident.status}
        </div>
      </Popup>
    </CircleMarker>
  );
});

/* ── Incident markers list – only re-renders when active incidents change ── */
function IncidentMarkers() {
  const incidents = useSimulationStore(
    (s) => s.incidents,
    (a, b) =>
      a.length === b.length &&
      a.every(
        (inc, i) =>
          inc.id === b[i].id &&
          inc.position[0] === b[i].position[0] &&
          inc.position[1] === b[i].position[1] &&
          inc.status === b[i].status &&
          inc.severity === b[i].severity,
      ),
  );
  const selectedIncident = useSimulationStore((s) => s.selectedIncident);
  const selectIncident = useSimulationStore((s) => s.selectIncident);
  const selectDrone = useSimulationStore((s) => s.selectDrone);

  const activeIncidents = useMemo(
    () => incidents.filter((i) => i.status !== "resolved"),
    [incidents],
  );

  return (
    <>
      {activeIncidents.map((incident) => (
        <IncidentMarkerItem
          key={incident.id}
          incident={incident}
          isSelected={selectedIncident === incident.id}
          selectIncident={selectIncident}
          selectDrone={selectDrone}
        />
      ))}
    </>
  );
}

/* ── Individual flight path polyline ─────────────────────────────── */
const FlightPathItem = memo(function FlightPathItem({
  drone,
}: {
  drone: Drone;
}) {
  return (
    <Polyline
      positions={drone.waypoints}
      pathOptions={{
        color: "#C8F23A",
        weight: 1.5,
        opacity: 0.6,
        dashArray: "6 6",
      }}
    />
  );
});

/* ── Flight paths list – only re-renders when waypoints/status change ── */
function FlightPaths() {
  const drones = useSimulationStore(
    (s) => s.drones,
    (a, b) =>
      a.length === b.length &&
      a.every(
        (d, i) =>
          d.id === b[i].id &&
          d.status === b[i].status &&
          d.waypoints.length === b[i].waypoints.length &&
          d.position[0] === b[i].position[0] &&
          d.position[1] === b[i].position[1],
      ),
  );

  const activeDrones = useMemo(
    () => drones.filter((d) => d.waypoints.length > 0 && (d.status === "en-route" || d.status === "dispatched")),
    [drones],
  );

  return (
    <>
      {activeDrones.map((drone) => (
        <FlightPathItem key={`path-${drone.id}`} drone={drone} />
      ))}
    </>
  );
}

function NoFlyZones() {
  return (
    <>
      {NO_FLY_ZONES.map((zone) => (
        <Polygon
          key={zone.name}
          positions={zone.polygon}
          pathOptions={{
            color: "#FF4444",
            fillColor: "#FF4444",
            fillOpacity: 0.08,
            weight: 1,
            dashArray: "4 4",
            opacity: 0.4,
          }}
        >
          <Popup>
            <div className="text-xs">
              <strong>NO-FLY ZONE</strong>
              <br />
              {zone.name}
            </div>
          </Popup>
        </Polygon>
      ))}
    </>
  );
}

function IncidentTargeting() {
  const map = useMap();
  const targetingMode = useSimulationStore((s) => s.targetingMode);
  const setTargetingMode = useSimulationStore((s) => s.setTargetingMode);
  const showToast = useSimulationStore((s) => s.showToast);

  useEffect(() => {
    const container = map.getContainer();

    if (targetingMode) {
      container.classList.add("targeting-active");
    } else {
      container.classList.remove("targeting-active");
    }

    return () => container.classList.remove("targeting-active");
  }, [targetingMode, map]);

  useEffect(() => {
    if (!targetingMode) return;

    const handler = async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setTargetingMode(false);

      const { triggerIncident } = await import("@/lib/trigger-incident");
      const result = await triggerIncident(lat, lng);
      showToast(result);
    };

    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [targetingMode, map, setTargetingMode, showToast]);

  return null;
}

function MapUpdater() {
  const selectedDrone = useSimulationStore((s) => s.selectedDrone);
  const selectedIncident = useSimulationStore((s) => s.selectedIncident);
  const drones = useSimulationStore((s) => s.drones);
  const incidents = useSimulationStore((s) => s.incidents);
  const map = useMap();

  // Use refs so flyTo only fires when the *selection* changes, not on every tick
  const dronesRef = useRef(drones);
  dronesRef.current = drones;
  const incidentsRef = useRef(incidents);
  incidentsRef.current = incidents;

  useEffect(() => {
    if (selectedDrone) {
      const drone = dronesRef.current.find((d: Drone) => d.id === selectedDrone);
      if (drone) {
        map.flyTo(drone.position, 14, { duration: 0.5 });
      }
    }
    // Only fly when the selected ID changes
  }, [selectedDrone, map]);

  useEffect(() => {
    if (selectedIncident) {
      const incident = incidentsRef.current.find((i: Incident) => i.id === selectedIncident);
      if (incident) {
        map.flyTo(incident.position, 14, { duration: 0.5 });
      }
    }
    // Only fly when the selected ID changes
  }, [selectedIncident, map]);

  return null;
}


function TargetingBadge() {
  const targetingMode = useSimulationStore((s) => s.targetingMode);

  if (!targetingMode) return null;

  return (
    <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[1001] pointer-events-none">
      <div className="flex items-center gap-2 bg-pulse/15 border border-pulse/50 backdrop-blur-md px-4 py-1.5 rounded">
        <span className="w-2 h-2 rounded-full bg-pulse animate-pulse" />
        <span className="font-mono text-[10px] text-pulse tracking-wider">
          CLICK MAP TO PLACE INCIDENT
        </span>
      </div>
    </div>
  );
}

export function MapPanel() {
  return (
    <div className="dashboard-panel h-full relative">
      <div className="dashboard-panel-header absolute top-0 left-0 right-0 z-[1000] bg-static/80 backdrop-blur-sm">
        <span>Operational Map — Pune Metropolitan Region</span>
      </div>

      <TargetingBadge />

      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={true}
        minZoom={11}
        maxZoom={16}
        maxBounds={MAP_MAX_BOUNDS}
        maxBoundsViscosity={1.0}
      >
        <TileLayer url={DARK_TILE_URL} attribution={TILE_ATTRIBUTION} />
        <RiskHeatmapLayer />
        <NoFlyZones />
        <FlightPaths />
        <DroneMarkers />
        <IncidentMarkers />
        <CCTVMarkers />
        <IncidentTargeting />
        <MapUpdater />
      </MapContainer>
    </div>
  );
}

