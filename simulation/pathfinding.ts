/**
 * Pathfinding — waypoint navigation with no-fly zone avoidance.
 */

import type { LatLng } from "@/lib/netra-constants";
import { buildVisibilityGraph, distanceSq } from "./geofence";

function heuristicCostEstimate(a: LatLng, b: LatLng): number {
  return Math.sqrt(distanceSq(a, b));
}

/**
 * Calculate a route from `from` to `to`, avoiding no-fly zones using A* over a Visibility Graph.
 * Returns array of waypoints including start and end.
 */
export function calculateRoute(from: LatLng, to: LatLng): LatLng[] {
  const { nodes, edges } = buildVisibilityGraph(from, to);

  const startId = "START";
  const endId = "END";

  // A* Search queue (using Sets for fast lookup, scanning for lowest F-score)
  const openSet = new Set<string>([startId]);
  const cameFrom = new Map<string, string>();
  
  const gScore = new Map<string, number>();
  nodes.forEach((_, id) => gScore.set(id, Infinity));
  gScore.set(startId, 0);

  const fScore = new Map<string, number>();
  nodes.forEach((_, id) => fScore.set(id, Infinity));
  fScore.set(startId, heuristicCostEstimate(from, to));

  while (openSet.size > 0) {
    let currentId: string | null = null;
    let lowestFScore = Infinity;
    for (const id of openSet) {
      const score = fScore.get(id)!;
      if (score < lowestFScore) {
        lowestFScore = score;
        currentId = id;
      }
    }

    if (currentId === endId) {
      // Reconstruct path
      const path: LatLng[] = [nodes.get(endId)!];
      let curr = endId;
      while (cameFrom.has(curr)) {
        curr = cameFrom.get(curr)!;
        path.unshift(nodes.get(curr)!);
      }
      return path;
    }

    if (!currentId) break;

    openSet.delete(currentId);
    
    const neighbors = edges.get(currentId) || [];
    for (const neighbor of neighbors) {
      const tentativeGScore = gScore.get(currentId)! + neighbor.cost;
      if (tentativeGScore < gScore.get(neighbor.targetId)!) {
        cameFrom.set(neighbor.targetId, currentId);
        gScore.set(neighbor.targetId, tentativeGScore);
        const h = heuristicCostEstimate(nodes.get(neighbor.targetId)!, to);
        fScore.set(neighbor.targetId, tentativeGScore + h);
        openSet.add(neighbor.targetId);
      }
    }
  }

  // If pathfinding fails (no possible path), fallback to straight line
  return [from, to];
}

/**
 * Calculate Haversine distance between two points in km.
 */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Calculate total route distance in km.
 */
export function routeDistance(waypoints: LatLng[]): number {
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += haversineDistance(waypoints[i], waypoints[i + 1]);
  }
  return total;
}

/**
 * Calculate bearing from point A to point B in degrees.
 */
export function bearing(from: LatLng, to: LatLng): number {
  const dLon = toRad(to[1] - from[1]);
  const lat1 = toRad(from[0]);
  const lat2 = toRad(to[0]);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}
