/**
 * Drone dispatch — nearest available drone assignment.
 */

import type { Drone, Incident, Alert } from "./types";
import type { LatLng } from "@/lib/netra-constants";
import { haversineDistance, routeDistance } from "./pathfinding";
import { calculateRoute } from "./pathfinding";

/**
 * Find the nearest available drone to an incident.
 */
export function findNearestAvailableDrone(
  incidentPosition: LatLng,
  drones: Drone[]
): Drone | null {
  const available = drones.filter(
    (d) => d.status === "idle" && d.battery > 20
  );

  if (available.length === 0) return null;

  let nearest: Drone | null = null;
  let minDist = Infinity;

  for (const drone of available) {
    const dist = haversineDistance(drone.position, incidentPosition);
    if (dist < minDist) {
      minDist = dist;
      nearest = drone;
    }
  }

  return nearest;
}

/**
 * Dispatch a drone to an incident.
 * Returns updated drone, incident, and dispatch alert.
 */
export function dispatchDrone(
  drone: Drone,
  incident: Incident
): { drone: Drone; incident: Incident; alert: Alert } {
  const route = calculateRoute(drone.position, incident.position);
  const distance = routeDistance(route);
  const etaSeconds = Math.round((distance / (drone.speed / 3600)));

  const updatedDrone: Drone = {
    ...drone,
    status: "en-route",
    assignedIncident: incident.id,
    waypoints: route,
    currentWaypointIndex: 1, // skip start position (index 0 = current pos)
    eta: etaSeconds,
    altitude: 120,
  };

  const updatedIncident: Incident = {
    ...incident,
    status: "drone_dispatched",
    assignedDrone: drone.id,
  };

  const alert: Alert = {
    id: `ALT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    incidentId: incident.id,
    timestamp: Date.now(),
    message: `${drone.name} dispatched to ${incident.locationName} — ETA ${formatETA(etaSeconds)}`,
    severity: incident.severity,
    type: "dispatch",
  };

  return { drone: updatedDrone, incident: updatedIncident, alert };
}

/**
 * Create a return-to-base route for a drone.
 */
export function returnToBase(drone: Drone): Drone {
  const route = calculateRoute(drone.position, drone.basePosition);

  return {
    ...drone,
    status: "returning",
    assignedIncident: null,
    waypoints: route,
    currentWaypointIndex: 1,
    eta: 0,
  };
}

function formatETA(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
