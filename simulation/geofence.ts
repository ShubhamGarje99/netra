/**
 * Geofence logic — no-fly zone point-in-polygon, inflation and visibility graph.
 */

import type { LatLng } from "@/lib/netra-constants";
import { NO_FLY_ZONES } from "@/lib/netra-constants";
import pc from "polygon-clipping";

export function isInsidePolygon(point: LatLng, polygon: LatLng[]): boolean {
  const [px, py] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

export function isInNoFlyZone(point: LatLng): boolean {
  return NO_FLY_ZONES.some((zone) => isInsidePolygon(point, zone.polygon));
}

export function segmentsIntersect(a: LatLng, b: LatLng, c: LatLng, d: LatLng): boolean {
  const ccw = (p1: LatLng, p2: LatLng, p3: LatLng) => {
    return (p3[1] - p1[1]) * (p2[0] - p1[0]) > (p2[1] - p1[1]) * (p3[0] - p1[0]);
  };
  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
}

export function doesPathCrossZone(from: LatLng, to: LatLng, polygon: LatLng[]): boolean {
  if (isInsidePolygon(from, polygon) || isInsidePolygon(to, polygon)) return true;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (segmentsIntersect(from, to, polygon[i], polygon[j])) return true;
  }
  return false;
}

export function doesPathCrossNoFlyZone(from: LatLng, to: LatLng): boolean {
  return NO_FLY_ZONES.some((zone) => doesPathCrossZone(from, to, zone.polygon));
}

export function distanceSq(a: LatLng, b: LatLng): number {
  const dx = a[1] - b[1];
  const dy = a[0] - b[0];
  return dx * dx + dy * dy;
}

export function inflatePolygon(polygon: LatLng[], padding: number): LatLng[] {
  const centroid: LatLng = [
    polygon.reduce((s, p) => s + p[0], 0) / polygon.length,
    polygon.reduce((s, p) => s + p[1], 0) / polygon.length,
  ];

  return polygon.map(p => {
    const pdx = p[1] - centroid[1];
    const pdy = p[0] - centroid[0];
    const len = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
    return [p[0] + (pdy / len) * padding, p[1] + (pdx / len) * padding];
  });
}

// ── Visibility Graph Logic ──────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  point: LatLng;
}

export interface VisibilityEdge {
  targetId: string;
  cost: number;
}

export const INFLATED_ZONES: LatLng[][] = (function () {
  const padding = 0.003; // ~300m
  const pcInput = NO_FLY_ZONES.map(z => {
    const inflated = inflatePolygon(z.polygon, padding);
    const ring = [...inflated, inflated[0]]; // close the ring for polygon-clipping
    return [ring.map(p => [p[0], p[1]] as [number, number])] as pc.Polygon;
  });

  if (pcInput.length === 0) return [];
  
  let unionResult: any = pcInput[0];
  for (let i = 1; i < pcInput.length; i++) {
    unionResult = pc.union(unionResult as any, pcInput[i] as any);
  }
  
  const result: LatLng[][] = [];
  for (const poly of unionResult) {
    const outerRing = poly[0];
    outerRing.pop(); // Remove the last duplicate point
    result.push(outerRing.map((p: any) => [p[0], p[1]] as LatLng));
  }
  return result;
})();

export const VISIBILITY_NODES: GraphNode[] = [];
INFLATED_ZONES.forEach((zone, zIdx) => {
  zone.forEach((p, pIdx) => {
    VISIBILITY_NODES.push({ id: `Z${zIdx}_P${pIdx}`, point: p });
  });
});

export const STATIC_VISIBILITY_GRAPH: Map<string, VisibilityEdge[]> = new Map();

export function buildStaticGraph() {
  STATIC_VISIBILITY_GRAPH.clear();
  VISIBILITY_NODES.forEach(n => {
    STATIC_VISIBILITY_GRAPH.set(n.id, []);
  });

  for (let i = 0; i < VISIBILITY_NODES.length; i++) {
    for (let j = i + 1; j < VISIBILITY_NODES.length; j++) {
      const a = VISIBILITY_NODES[i];
      const b = VISIBILITY_NODES[j];
      
      if (!doesPathCrossNoFlyZone(a.point, b.point)) {
        const cost = Math.sqrt(distanceSq(a.point, b.point));
        STATIC_VISIBILITY_GRAPH.get(a.id)!.push({ targetId: b.id, cost });
        STATIC_VISIBILITY_GRAPH.get(b.id)!.push({ targetId: a.id, cost });
      }
    }
  }
}

// Pre-compute line-of-sight graph for all static NFZ corner nodes on initialization
buildStaticGraph();

export function buildVisibilityGraph(
  start: LatLng, 
  end: LatLng
): { nodes: Map<string, LatLng>; edges: Map<string, VisibilityEdge[]> } {
  const graph: Map<string, VisibilityEdge[]> = new Map();
  STATIC_VISIBILITY_GRAPH.forEach((edges, id) => {
    graph.set(id, [...edges]);
  });
  
  const nodes = new Map<string, LatLng>();
  VISIBILITY_NODES.forEach(n => nodes.set(n.id, n.point));
  
  const startId = "START";
  const endId = "END";
  nodes.set(startId, start);
  nodes.set(endId, end);
  
  graph.set(startId, []);
  graph.set(endId, []);
  
  if (!doesPathCrossNoFlyZone(start, end)) {
    const cost = Math.sqrt(distanceSq(start, end));
    graph.get(startId)!.push({ targetId: endId, cost });
    graph.get(endId)!.push({ targetId: startId, cost });
  }
  
  VISIBILITY_NODES.forEach(n => {
    if (!doesPathCrossNoFlyZone(start, n.point)) {
      const cost = Math.sqrt(distanceSq(start, n.point));
      graph.get(startId)!.push({ targetId: n.id, cost });
      graph.get(n.id)!.push({ targetId: startId, cost });
    }
    if (!doesPathCrossNoFlyZone(end, n.point)) {
      const cost = Math.sqrt(distanceSq(end, n.point));
      graph.get(endId)!.push({ targetId: n.id, cost });
      graph.get(n.id)!.push({ targetId: endId, cost });
    }
  });
  
  return { nodes, edges: graph };
}
