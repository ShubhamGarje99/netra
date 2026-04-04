/**
 * Drone fleet manager — initializes and updates drone positions.
 *
 * Battery drain is now status-aware and always clamped to [0, 100].
 */

import type { Drone } from "./types";
import { DRONE_FLEET, type LatLng } from "@/lib/netra-constants";
import { bearing } from "./pathfinding";

// ── Battery drain rates (percentage points per tick / per second) ─────────

/** Flying at full speed toward incident. */
const DRAIN_EN_ROUTE = 0.08;
/** Hovering on-scene (lower power). */
const DRAIN_ON_SCENE = 0.03;
/** Flying back to base (slightly less urgent). */
const DRAIN_RETURNING = 0.06;
/** Dispatched (same as en-route). */
const DRAIN_DISPATCHED = 0.08;

/** Recharge rate when in `charging` status (percentage points per tick). */
export const CHARGE_RATE = 0.5;

/** Battery threshold below which a drone should auto-return. */
export const LOW_BATTERY_THRESHOLD = 15;

/**
 * Get the battery drain rate for a given drone status.
 */
function drainRateForStatus(status: string): number {
  switch (status) {
    case "en-route":    return DRAIN_EN_ROUTE;
    case "dispatched":  return DRAIN_DISPATCHED;
    case "on-scene":    return DRAIN_ON_SCENE;
    case "returning":   return DRAIN_RETURNING;
    default:            return 0; // idle, charging
  }
}

/**
 * Clamp a battery value to [0, 100].
 */
export function clampBattery(battery: number): number {
  return Math.max(0, Math.min(100, battery));
}

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
 * Battery is drained based on status and always clamped to [0, 100].
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

  // Drain battery based on current status — always clamped
  const drain = drainRateForStatus(drone.status);
  const newBattery = clampBattery(drone.battery - drain);

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
        battery: newBattery,
      };
    }
    return {
      ...drone,
      position: target,
      currentWaypointIndex: nextIdx,
      heading: bearing(target, drone.waypoints[nextIdx]),
      battery: newBattery,
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
    battery: newBattery,
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
