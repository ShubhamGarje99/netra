import { describe, it, expect } from "vitest";
import { findNearestAvailableDrone, dispatchDrone } from "@/simulation/dispatch";
import type { Drone, Incident } from "@/simulation/types";
import type { LatLng } from "@/lib/netra-constants";

function makeDrone(overrides: Partial<Drone> = {}): Drone {
  return {
    id: "drone-1",
    name: "TEST-01",
    position: [18.5314, 73.8446] as LatLng,  // Shivajinagar
    basePosition: [18.5314, 73.8446] as LatLng,
    status: "idle",
    battery: 100,
    altitude: 0,
    speed: 72,
    heading: 0,
    assignedIncident: null,
    waypoints: [],
    currentWaypointIndex: 0,
    eta: 0,
    ...overrides,
  };
}

function makeIncident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: "INC-TEST-001",
    type: "road_accident",
    severity: "critical",
    position: [18.5362, 73.8935] as LatLng,  // Koregaon Park
    locationName: "Koregaon Park",
    timestamp: Date.now(),
    status: "detected",
    assignedDrone: null,
    description: "Test road accident incident",
    detectionConfidence: 0.95,
    resolveAtTick: 100,
    ...overrides,
  };
}

describe("dispatch", () => {
  // ── findNearestAvailableDrone ─────────────────────────────
  describe("findNearestAvailableDrone", () => {
    it("returns the closest idle drone with sufficient battery", () => {
      const close = makeDrone({ id: "d1", position: [18.535, 73.890] });
      const far = makeDrone({ id: "d2", position: [18.590, 73.740] });
      const result = findNearestAvailableDrone([18.536, 73.893], [close, far]);
      expect(result).not.toBeNull();
      expect(result!.id).toBe("d1");
    });

    it("returns null when no drones are available", () => {
      const busy = makeDrone({ status: "en-route" });
      expect(findNearestAvailableDrone([18.536, 73.893], [busy])).toBeNull();
    });

    it("skips drones with low battery", () => {
      const low = makeDrone({ id: "low", battery: 15 });
      const ok = makeDrone({ id: "ok", battery: 80, position: [18.59, 73.74] });
      const result = findNearestAvailableDrone([18.536, 73.893], [low, ok]);
      expect(result).not.toBeNull();
      expect(result!.id).toBe("ok");
    });

    it("returns null for empty fleet", () => {
      expect(findNearestAvailableDrone([18.536, 73.893], [])).toBeNull();
    });
  });

  // ── dispatchDrone (integration) ──────────────────────────
  describe("dispatchDrone", () => {
    it("sets drone status to en-route and assigns incident", () => {
      const drone = makeDrone();
      const incident = makeIncident();
      const { drone: updated } = dispatchDrone(drone, incident);

      expect(updated.status).toBe("en-route");
      expect(updated.assignedIncident).toBe(incident.id);
    });

    it("sets incident status to drone_dispatched", () => {
      const drone = makeDrone();
      const incident = makeIncident();
      const { incident: updated } = dispatchDrone(drone, incident);

      expect(updated.status).toBe("drone_dispatched");
      expect(updated.assignedDrone).toBe(drone.id);
    });

    it("creates a dispatch alert with correct metadata", () => {
      const drone = makeDrone();
      const incident = makeIncident();
      const { alert } = dispatchDrone(drone, incident);

      expect(alert.type).toBe("dispatch");
      expect(alert.incidentId).toBe(incident.id);
      expect(alert.severity).toBe(incident.severity);
      expect(alert.message).toContain(drone.name);
      expect(alert.message).toContain(incident.locationName);
    });

    it("computes waypoints and a positive ETA", () => {
      const drone = makeDrone();
      const incident = makeIncident();
      const { drone: updated } = dispatchDrone(drone, incident);

      expect(updated.waypoints.length).toBeGreaterThanOrEqual(2);
      expect(updated.waypoints[0]).toEqual(drone.position);
      expect(updated.waypoints[updated.waypoints.length - 1]).toEqual(incident.position);
      expect(updated.eta).toBeGreaterThan(0);
    });

    it("sets altitude to 120m on dispatch", () => {
      const drone = makeDrone({ altitude: 0 });
      const incident = makeIncident();
      const { drone: updated } = dispatchDrone(drone, incident);
      expect(updated.altitude).toBe(120);
    });

    it("end-to-end: inject incident → find drone → dispatch → verify state", () => {
      // Fleet of 3 drones
      const fleet = [
        makeDrone({ id: "d1", name: "GARUDA-01", position: [18.5314, 73.8446], battery: 90 }),
        makeDrone({ id: "d2", name: "VAYU-02", position: [18.5600, 73.8100], battery: 85 }),
        makeDrone({ id: "d3", name: "CHAKRA-03", position: [18.4800, 73.8500], battery: 10 }), // low battery
      ];

      const incident = makeIncident({
        id: "INC-E2E",
        position: [18.5350, 73.8500],
        locationName: "Test Zone",
      });

      // Step 1: Find nearest available drone
      const nearest = findNearestAvailableDrone(incident.position, fleet);
      expect(nearest).not.toBeNull();
      expect(nearest!.id).toBe("d1"); // closest with sufficient battery

      // Step 2: Dispatch
      const { drone: dispatched, incident: updated, alert } = dispatchDrone(nearest!, incident);

      // Step 3: Verify entire state
      expect(dispatched.status).toBe("en-route");
      expect(dispatched.assignedIncident).toBe("INC-E2E");
      expect(dispatched.eta).toBeGreaterThan(0);
      expect(dispatched.waypoints.length).toBeGreaterThanOrEqual(2);

      expect(updated.status).toBe("drone_dispatched");
      expect(updated.assignedDrone).toBe("d1");

      expect(alert.type).toBe("dispatch");
      expect(alert.message).toContain("GARUDA-01");
      expect(alert.message).toContain("Test Zone");
    });
  });
});
