/**
 * Drone fleet manager — initializes and updates drone positions.
 */

import type { Drone } from "./types";
import { DRONE_FLEET, type LatLng } from "@/lib/netra-constants";
import { bearing } from "./pathfinding";

/**
 * Create the initial drone fleet — all idle at base positions.
 */
export function initializeFleet(): Drone[] {
  return DRONE_FLEET.map((config) => ({
    id: config.id,
    name: config.name,
    position: [...config.base] as LatLng,
    basePosition: [...config.base] as LatLng,
    status: "idle" as const,
    battery: 95 + Math.floor(Math.random() * 6), // 95-100
    altitude: 0,
    speed: config.speed,
    heading: Math.floor(Math.random() * 360),
    assignedIncident: null,
    waypoints: [],
    currentWaypointIndex: 0,
    eta: 0,
  }));
}

/**
 * Move a drone along its waypoints for one tick (1 second).
 * Returns updated drone.
 */
export function updateDronePosition(drone: Drone): Drone {
  if (
    drone.waypoints.length === 0 ||
    drone.currentWaypointIndex >= drone.waypoints.length
  ) {
    return drone;
  }

  const target = drone.waypoints[drone.currentWaypointIndex];
  const speedKmPerSec = drone.speed / 3600;

  // Convert km/s to lat/lng delta (rough: 1 degree ≈ 111 km)
  const deltaPerSec = speedKmPerSec / 111;

  const dlat = target[0] - drone.position[0];
  const dlng = target[1] - drone.position[1];
  const dist = Math.sqrt(dlat * dlat + dlng * dlng);

  // Threshold: if within ~50m
  if (dist < 0.0005) {
    const nextIdx = drone.currentWaypointIndex + 1;
    if (nextIdx >= drone.waypoints.length) {
      // Arrived at final waypoint
      return {
        ...drone,
        position: target,
        currentWaypointIndex: nextIdx,
        heading: bearing(drone.position, target),
        altitude: drone.status === "returning" ? 0 : 120,
      };
    }
    return {
      ...drone,
      position: target,
      currentWaypointIndex: nextIdx,
      heading: bearing(target, drone.waypoints[nextIdx]),
    };
  }

  // Move toward target
  const ratio = Math.min(deltaPerSec / dist, 1);
  const newPos: LatLng = [
    drone.position[0] + dlat * ratio,
    drone.position[1] + dlng * ratio,
  ];

  // Recalculate ETA
  const remainingDist = calculateRemainingDistance(drone);
  const etaSeconds = remainingDist / speedKmPerSec;

  return {
    ...drone,
    position: newPos,
    heading: bearing(drone.position, target),
    altitude: drone.status === "idle" ? 0 : 120,
    eta: Math.round(etaSeconds),
    battery: drone.battery - (drone.status === "idle" ? 0 : 0.05),
  };
}

function calculateRemainingDistance(drone: Drone): number {
  if (drone.waypoints.length === 0) return 0;

  let total = 0;
  const current = drone.position;
  const remaining = drone.waypoints.slice(drone.currentWaypointIndex);

  if (remaining.length === 0) return 0;

  // Distance from current position to current waypoint
  const dlat = remaining[0][0] - current[0];
  const dlng = remaining[0][1] - current[1];
  total += Math.sqrt(dlat * dlat + dlng * dlng) * 111; // rough km

  // Distance between remaining waypoints
  for (let i = 0; i < remaining.length - 1; i++) {
    const d0 = remaining[i];
    const d1 = remaining[i + 1];
    const dl = d1[0] - d0[0];
    const dn = d1[1] - d0[1];
    total += Math.sqrt(dl * dl + dn * dn) * 111;
  }

  return total;
}
