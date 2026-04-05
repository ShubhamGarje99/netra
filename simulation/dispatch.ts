/**
 * Drone dispatch — weighted multi-factor scoring system.
 *
 * Selection is no longer distance-only. Each candidate drone is scored:
 *
 *   score = w₁·etaScore + w₂·batteryAdequacy + w₃·speedNorm + w₄·severityBonus
 *
 * A hard feasibility gate rejects drones that can't make the round-trip
 * (incident + return to base) with a 15% reserve margin.
 */

import type { Drone, Incident, Alert, IncidentSeverity } from "./types";
import type { LatLng } from "@/lib/netra-constants";
import { BASE_LOCATIONS } from "@/lib/netra-constants";
import { haversineDistance, routeDistance } from "./pathfinding";
import { calculateRoute } from "./pathfinding";

// ── Constants ────────────────────────────────────────────────────────────────

/** Battery consumed per km of flight (percentage points). ~200 km full range. */
export const BATTERY_DRAIN_PER_KM = 0.5;

/** Minimum battery reserve after completing a mission (percentage points). */
const BATTERY_RESERVE_PCT = 15;

/** Minimum battery to be considered for dispatch at all. */
const MIN_DISPATCH_BATTERY = 20;

/** Scoring weights — must sum to 1.0 */
const W_ETA       = 0.40;
const W_BATTERY   = 0.30;
const W_SPEED     = 0.15;
const W_SEVERITY  = 0.15;

/** Max ETA we normalise against (seconds). Anything above scores 0. */
const MAX_ETA_SECONDS = 600; // 10 minutes

/** Max fleet speed for normalisation (km/h). */
const MAX_FLEET_SPEED = 80;

// ── Scoring helpers ──────────────────────────────────────────────────────────

/**
 * Estimate the battery required for a round-trip mission:
 *   drone → incident → base, plus a reserve margin.
 */
export function estimateRequiredBattery(
  dronePos: LatLng,
  incidentPos: LatLng,
  basePos: LatLng,
): number {
  const toIncident = haversineDistance(dronePos, incidentPos);
  const toBase     = haversineDistance(incidentPos, basePos);
  const totalKm    = toIncident + toBase;
  return totalKm * BATTERY_DRAIN_PER_KM + BATTERY_RESERVE_PCT;
}

/**
 * Score a single drone for a given incident. Higher = better.
 * Returns null if the drone fails the hard feasibility gate.
 */
export function scoreDroneForIncident(
  drone: Drone,
  incident: Incident,
): number | null {
  // ── Hard gate ──────────────────────────────────────────────────────────
  if (drone.status !== "idle") return null;
  if (drone.battery <= MIN_DISPATCH_BATTERY) return null;

  const requiredBattery = estimateRequiredBattery(
    drone.position,
    incident.position,
    drone.basePosition,
  );
  if (drone.battery < requiredBattery) return null;

  // ── Soft scoring ───────────────────────────────────────────────────────

  // 1. ETA score (lower ETA = higher score)
  const distKm    = haversineDistance(drone.position, incident.position);
  const etaSecs   = (distKm / (drone.speed / 3600));
  const etaScore  = Math.max(0, 1 - etaSecs / MAX_ETA_SECONDS);

  // 2. Battery adequacy (surplus after round-trip)
  const surplus       = (drone.battery - requiredBattery) / 100;
  const batteryScore  = Math.max(0, Math.min(1, surplus));

  // 3. Speed normalised
  const speedScore = drone.speed / MAX_FLEET_SPEED;

  // 4. Severity bonus — for critical / high incidents, prefer high-battery drones
  let severityScore = 0.5; // neutral
  const sevWeight: Record<IncidentSeverity, number> = {
    critical: 1.0,
    high: 0.75,
    medium: 0.4,
    low: 0.2,
  };
  if (drone.battery > 70) {
    severityScore = sevWeight[incident.severity];
  } else {
    // Lower battery drones get a reduced severity bonus
    severityScore = sevWeight[incident.severity] * (drone.battery / 100);
  }

  return (
    W_ETA      * etaScore +
    W_BATTERY  * batteryScore +
    W_SPEED    * speedScore +
    W_SEVERITY * severityScore
  );
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Extended result from findBestDrone — includes scoring data for explainability. */
export interface DispatchResult {
  drone: Drone | null;
  score: number;
  allScores: { droneId: string; score: number }[];
}

/**
 * Find the best drone to dispatch to an incident using the weighted scoring
 * formula. Returns null drone when no drone passes the feasibility gate.
 * Now also returns allScores for dispatch decision logging.
 */
export function findBestDrone(
  incidentPosition: LatLng,
  drones: Drone[],
  incident?: Incident,
): DispatchResult {
  // Build a lightweight Incident stub for scoring if one isn't provided
  // (backwards compat — callers in tests may not pass a full incident).
  const inc: Incident = incident ?? {
    id: "TEMP",
    type: "road_accident",
    severity: "medium",
    position: incidentPosition,
    locationName: "",
    timestamp: Date.now(),
    status: "detected",
    assignedDrone: null,
    description: "",
    detectionConfidence: 0.9,
    resolveAtTick: 0,
  };

  let bestDrone: Drone | null = null;
  let bestScore = -Infinity;
  const allScores: { droneId: string; score: number }[] = [];

  for (const drone of drones) {
    const score = scoreDroneForIncident(drone, inc);
    if (score !== null) {
      allScores.push({ droneId: drone.id, score: Math.round(score * 1000) / 1000 });
      if (score > bestScore) {
        bestScore = score;
        bestDrone = drone;
      }
    }
  }

  // Sort allScores descending for readability
  allScores.sort((a, b) => b.score - a.score);

  return { drone: bestDrone, score: Math.round(bestScore * 1000) / 1000, allScores };
}

/**
 * Legacy alias — keeps older call-sites working.
 * @deprecated Use `findBestDrone` instead.
 */
export const findNearestAvailableDrone = findBestDrone;

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
 * Find the nearest base location (HQ or Charge Pod) to a given position.
 * Iterates the full BASE_LOCATIONS array — HQ and pod are treated equally.
 */
export function getNearestBase(position: LatLng): { id: string; position: LatLng; type: "hq" | "pod" } {
  let nearest = BASE_LOCATIONS[0];
  let minDist = Infinity;

  for (const base of BASE_LOCATIONS) {
    const d = haversineDistance(position, [base.lat, base.lng]);
    if (d < minDist) {
      minDist = d;
      nearest = base;
    }
  }

  return { id: nearest.id, position: [nearest.lat, nearest.lng], type: nearest.type };
}

/**
 * Check whether a position is within charging range of any base (HQ or Pod).
 * Uses a 500m threshold — roughly the footprint of a charge pad.
 */
const BASE_PROXIMITY_KM = 0.5;
export function isNearBase(position: LatLng): boolean {
  for (const base of BASE_LOCATIONS) {
    if (haversineDistance(position, [base.lat, base.lng]) <= BASE_PROXIMITY_KM) {
      return true;
    }
  }
  return false;
}

/**
 * Create a return-to-base route for a drone.
 * Routes to the nearest base (HQ or Charge Pod) instead of always the home base.
 */
export function returnToBase(drone: Drone): Drone {
  const nearest = getNearestBase(drone.position);
  const route = calculateRoute(drone.position, nearest.position);

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
