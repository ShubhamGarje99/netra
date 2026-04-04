import { describe, it, expect } from "vitest";
import { isInsidePolygon, isInNoFlyZone, doesPathCrossNoFlyZone } from "@/simulation/geofence";
import { NO_FLY_ZONES } from "@/lib/netra-constants";
import type { LatLng } from "@/lib/netra-constants";

describe("geofence", () => {
  // ── isInsidePolygon ───────────────────────────────────────
  describe("isInsidePolygon", () => {
    const square: LatLng[] = [
      [0, 0],
      [0, 10],
      [10, 10],
      [10, 0],
    ];

    it("returns true for a point inside the polygon", () => {
      expect(isInsidePolygon([5, 5], square)).toBe(true);
    });

    it("returns false for a point outside the polygon", () => {
      expect(isInsidePolygon([15, 5], square)).toBe(false);
    });

    it("returns false for a point far away", () => {
      expect(isInsidePolygon([-10, -10], square)).toBe(false);
    });

    it("handles points near edges correctly", () => {
      // Just inside
      expect(isInsidePolygon([1, 1], square)).toBe(true);
      // Just outside
      expect(isInsidePolygon([-0.01, 5], square)).toBe(false);
    });
  });

  // ── isInNoFlyZone ────────────────────────────────────────
  describe("isInNoFlyZone", () => {
    it("returns true for a known point inside Lohegaon Airport no-fly zone", () => {
      // Lohegaon Airport centroid (inside its polygon)
      const lohegaon = NO_FLY_ZONES.find((z) => z.name.includes("Lohegaon"));
      expect(lohegaon).toBeDefined();

      const centroid: LatLng = [
        lohegaon!.polygon.reduce((s, p) => s + p[0], 0) / lohegaon!.polygon.length,
        lohegaon!.polygon.reduce((s, p) => s + p[1], 0) / lohegaon!.polygon.length,
      ];

      expect(isInNoFlyZone(centroid)).toBe(true);
    });

    it("returns false for downtown Pune (outside all no-fly zones)", () => {
      // Shivajinagar, central Pune — not in any no-fly zone
      const downtown: LatLng = [18.5314, 73.8446];
      expect(isInNoFlyZone(downtown)).toBe(false);
    });

    it("returns false for a point far outside Pune", () => {
      expect(isInNoFlyZone([19.0, 74.0])).toBe(false);
    });
  });

  // ── doesPathCrossNoFlyZone ───────────────────────────────
  describe("doesPathCrossNoFlyZone", () => {
    it("returns false for a path between two safe points", () => {
      // Shivajinagar to Koregaon Park — no no-fly zone between them
      const from: LatLng = [18.5314, 73.8446];
      const to: LatLng = [18.5362, 73.8935];
      expect(doesPathCrossNoFlyZone(from, to)).toBe(false);
    });

    it("returns true for a path crossing through a no-fly zone", () => {
      // Path that must cross Lohegaon Airport
      const lohegaon = NO_FLY_ZONES.find((z) => z.name.includes("Lohegaon"));
      expect(lohegaon).toBeDefined();

      const centroid: LatLng = [
        lohegaon!.polygon.reduce((s, p) => s + p[0], 0) / lohegaon!.polygon.length,
        lohegaon!.polygon.reduce((s, p) => s + p[1], 0) / lohegaon!.polygon.length,
      ];

      // Path from well south to well north of the airport centroid
      const from: LatLng = [centroid[0] - 0.05, centroid[1]];
      const to: LatLng = [centroid[0] + 0.05, centroid[1]];
      expect(doesPathCrossNoFlyZone(from, to)).toBe(true);
    });
  });
});
