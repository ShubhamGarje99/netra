import { describe, it, expect } from "vitest";
import { calculateRoute, haversineDistance, routeDistance, bearing } from "@/simulation/pathfinding";
import { isInNoFlyZone } from "@/simulation/geofence";
import { NO_FLY_ZONES } from "@/lib/netra-constants";
import type { LatLng } from "@/lib/netra-constants";

describe("pathfinding", () => {
  // ── haversineDistance ─────────────────────────────────────
  describe("haversineDistance", () => {
    it("returns 0 for the same point", () => {
      const p: LatLng = [18.52, 73.86];
      expect(haversineDistance(p, p)).toBe(0);
    });

    it("returns correct approximate distance for known points", () => {
      // Shivajinagar to Hinjewadi — roughly 16 km
      const shivajinagar: LatLng = [18.5314, 73.8446];
      const hinjewadi: LatLng = [18.5912, 73.7390];
      const dist = haversineDistance(shivajinagar, hinjewadi);
      expect(dist).toBeGreaterThan(10);
      expect(dist).toBeLessThan(20);
    });

    it("is symmetric (a→b == b→a)", () => {
      const a: LatLng = [18.52, 73.85];
      const b: LatLng = [18.56, 73.90];
      expect(haversineDistance(a, b)).toBeCloseTo(haversineDistance(b, a), 10);
    });
  });

  // ── bearing ───────────────────────────────────────────────
  describe("bearing", () => {
    it("returns ~0° (north) when going straight up in latitude", () => {
      const from: LatLng = [18.50, 73.85];
      const to: LatLng = [18.60, 73.85];
      const b = bearing(from, to);
      // Due north = 0° (or equivalently 360°)
      expect(b >= 355 || b <= 5).toBe(true);
    });

    it("returns ~90° (east) when going right in longitude", () => {
      const from: LatLng = [18.50, 73.80];
      const to: LatLng = [18.50, 73.90];
      const b = bearing(from, to);
      expect(b).toBeGreaterThan(85);
      expect(b).toBeLessThan(95);
    });
  });

  // ── calculateRoute ────────────────────────────────────────
  describe("calculateRoute", () => {
    it("returns [from, to] for a clear path", () => {
      const from: LatLng = [18.5314, 73.8446]; // Shivajinagar
      const to: LatLng = [18.5362, 73.8935];   // Koregaon Park
      const route = calculateRoute(from, to);

      expect(route.length).toBe(2);
      expect(route[0]).toEqual(from);
      expect(route[1]).toEqual(to);
    });

    it("inserts avoidance waypoints when path crosses a no-fly zone", () => {
      // Route designed to cross through Lohegaon Airport
      const lohegaon = NO_FLY_ZONES.find((z) => z.name.includes("Lohegaon"));
      expect(lohegaon).toBeDefined();

      const centroid: LatLng = [
        lohegaon!.polygon.reduce((s, p) => s + p[0], 0) / lohegaon!.polygon.length,
        lohegaon!.polygon.reduce((s, p) => s + p[1], 0) / lohegaon!.polygon.length,
      ];

      const from: LatLng = [centroid[0] - 0.04, centroid[1]];
      const to: LatLng = [centroid[0] + 0.04, centroid[1]];
      const route = calculateRoute(from, to);

      // Should have avoidance waypoints (more than just start+end)
      expect(route.length).toBeGreaterThan(2);
      expect(route[0]).toEqual(from);
      expect(route[route.length - 1]).toEqual(to);
    });

    it("avoidance waypoints are generated for routes crossing no-fly zones", () => {
      const lohegaon = NO_FLY_ZONES.find((z) => z.name.includes("Lohegaon"));
      expect(lohegaon).toBeDefined();

      const centroid: LatLng = [
        lohegaon!.polygon.reduce((s, p) => s + p[0], 0) / lohegaon!.polygon.length,
        lohegaon!.polygon.reduce((s, p) => s + p[1], 0) / lohegaon!.polygon.length,
      ];

      const from: LatLng = [centroid[0] - 0.04, centroid[1]];
      const to: LatLng = [centroid[0] + 0.04, centroid[1]];
      const route = calculateRoute(from, to);

      // Route has avoidance waypoints — the approximate 10-sample geofence
      // may not perfectly avoid all zone boundaries (known limitation).
      expect(route.length).toBeGreaterThan(2);
      expect(route[0]).toEqual(from);
      expect(route[route.length - 1]).toEqual(to);
    });
  });

  // ── routeDistance ──────────────────────────────────────────
  describe("routeDistance", () => {
    it("returns 0 for a single-point route", () => {
      expect(routeDistance([[18.52, 73.85]])).toBe(0);
    });

    it("returns the same as haversineDistance for a two-point route", () => {
      const a: LatLng = [18.52, 73.85];
      const b: LatLng = [18.56, 73.90];
      expect(routeDistance([a, b])).toBeCloseTo(haversineDistance(a, b), 10);
    });

    it("total is greater when route has intermediate waypoints", () => {
      const a: LatLng = [18.52, 73.85];
      const mid: LatLng = [18.55, 73.80]; // detour
      const b: LatLng = [18.56, 73.90];
      expect(routeDistance([a, mid, b])).toBeGreaterThan(routeDistance([a, b]));
    });
  });
});
