import { describe, it, expect } from "vitest";
import {
  findBestDrone,
  findNearestAvailableDrone,
  dispatchDrone,
  scoreDroneForIncident,
  estimateRequiredBattery,
} from "@/simulation/dispatch";
import { clampBattery, updateDronePosition } from "@/simulation/drones";
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
  // ── findBestDrone (scored selection) ────────────────────────
  describe("findBestDrone", () => {
    it("returns the best-scored idle drone with sufficient battery", () => {
      const close = makeDrone({ id: "d1", position: [18.535, 73.890] });
      const far = makeDrone({ id: "d2", position: [18.590, 73.740] });
      const result = findBestDrone([18.536, 73.893], [close, far]);
      expect(result.drone).not.toBeNull();
      expect(result.drone!.id).toBe("d1");
    });

    it("returns null when no drones are available", () => {
      const busy = makeDrone({ status: "en-route" });
      expect(findBestDrone([18.536, 73.893], [busy]).drone).toBeNull();
    });

    it("skips drones with low battery", () => {
      const low = makeDrone({ id: "low", battery: 15 });
      const ok = makeDrone({ id: "ok", battery: 80, position: [18.59, 73.74] });
      const result = findBestDrone([18.536, 73.893], [low, ok]);
      expect(result.drone).not.toBeNull();
      expect(result.drone!.id).toBe("ok");
    });

    it("returns null for empty fleet", () => {
      expect(findBestDrone([18.536, 73.893], []).drone).toBeNull();
    });

    it("prefers a faster drone slightly farther away when ETA is lower", () => {
      // Slow drone, very close
      const slow = makeDrone({ id: "slow", speed: 30, position: [18.536, 73.890], battery: 100 });
      // Fast drone, slightly farther
      const fast = makeDrone({ id: "fast", speed: 78, position: [18.540, 73.880], battery: 100 });
      const incident = makeIncident({ position: [18.538, 73.895] });
      const result = findBestDrone(incident.position, [slow, fast], incident);
      // The faster drone should win because its ETA is significantly lower
      // despite being slightly farther
      expect(result.drone).not.toBeNull();
      expect(result.drone!.id).toBe("fast");
    });

    it("rejects a drone that cannot make the round-trip", () => {
      // Drone is far from incident AND its base — not enough battery for round trip
      const drone = makeDrone({
        id: "low-range",
        battery: 25, // just above 20% min but not enough for round trip
        position: [18.4, 73.7],
        basePosition: [18.4, 73.7],
      });
      const incident = makeIncident({ position: [18.6, 74.0] }); // ~35km away
      const result = findBestDrone(incident.position, [drone], incident);
      expect(result.drone).toBeNull();
    });

    it("for critical incidents, prefers high-battery drones (severity bonus)", () => {
      // Two drones at same distance, one with more battery
      const highBat = makeDrone({
        id: "high-bat",
        battery: 95,
        position: [18.535, 73.890],
        speed: 72,
      });
      const lowBat = makeDrone({
        id: "low-bat",
        battery: 45,
        position: [18.535, 73.890],
        speed: 72,
      });
      const incident = makeIncident({ severity: "critical", position: [18.536, 73.893] });
      const result = findBestDrone(incident.position, [lowBat, highBat], incident);
      expect(result.drone).not.toBeNull();
      expect(result.drone!.id).toBe("high-bat");
    });

    it("legacy alias findNearestAvailableDrone still works", () => {
      const drone = makeDrone();
      const result = findNearestAvailableDrone([18.536, 73.893], [drone]);
      expect(result.drone).not.toBeNull();
    });
  });

  // ── scoreDroneForIncident ──────────────────────────────────
  describe("scoreDroneForIncident", () => {
    it("returns null for non-idle drones", () => {
      const drone = makeDrone({ status: "en-route" });
      const incident = makeIncident();
      expect(scoreDroneForIncident(drone, incident)).toBeNull();
    });

    it("returns null for drones with battery <= 20", () => {
      const drone = makeDrone({ battery: 20 });
      const incident = makeIncident();
      expect(scoreDroneForIncident(drone, incident)).toBeNull();
    });

    it("returns a positive score for eligible drones", () => {
      const drone = makeDrone({ battery: 90 });
      const incident = makeIncident();
      const score = scoreDroneForIncident(drone, incident);
      expect(score).not.toBeNull();
      expect(score!).toBeGreaterThan(0);
    });

    it("closer drone gets higher ETA component", () => {
      const incident = makeIncident();
      const close = makeDrone({ id: "close", position: [18.535, 73.890], battery: 90 });
      const far = makeDrone({ id: "far", position: [18.590, 73.740], battery: 90 });
      const scoreClose = scoreDroneForIncident(close, incident)!;
      const scoreFar = scoreDroneForIncident(far, incident)!;
      expect(scoreClose).toBeGreaterThan(scoreFar);
    });
  });

  // ── estimateRequiredBattery ────────────────────────────────
  describe("estimateRequiredBattery", () => {
    it("includes reserve margin", () => {
      const required = estimateRequiredBattery(
        [18.53, 73.84],
        [18.53, 73.85], // ~1km
        [18.53, 73.84], // back to start
      );
      // Should include the 15% reserve
      expect(required).toBeGreaterThanOrEqual(15);
    });

    it("longer trips need more battery", () => {
      const short = estimateRequiredBattery(
        [18.53, 73.84],
        [18.53, 73.85],
        [18.53, 73.84],
      );
      const long = estimateRequiredBattery(
        [18.53, 73.84],
        [18.60, 73.95],
        [18.53, 73.84],
      );
      expect(long).toBeGreaterThan(short);
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

      // Step 1: Find best drone
      const best = findBestDrone(incident.position, fleet, incident);
      expect(best.drone).not.toBeNull();
      expect(best.drone!.id).toBe("d1"); // closest with sufficient battery + best score

      // Step 2: Dispatch
      const { drone: dispatched, incident: updated, alert } = dispatchDrone(best.drone!, incident);

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

  // ── Battery logic ──────────────────────────────────────────
  describe("battery", () => {
    it("clampBattery never returns below 0", () => {
      expect(clampBattery(-5)).toBe(0);
      expect(clampBattery(-0.01)).toBe(0);
    });

    it("clampBattery never returns above 100", () => {
      expect(clampBattery(105)).toBe(100);
      expect(clampBattery(100.1)).toBe(100);
    });

    it("clampBattery passes through valid values", () => {
      expect(clampBattery(50)).toBe(50);
      expect(clampBattery(0)).toBe(0);
      expect(clampBattery(100)).toBe(100);
    });

    it("updateDronePosition drains battery for en-route drones", () => {
      const drone = makeDrone({
        status: "en-route",
        battery: 50,
        waypoints: [[18.535, 73.890], [18.540, 73.900]],
        currentWaypointIndex: 0,
      });
      const updated = updateDronePosition(drone);
      expect(updated.battery).toBeLessThan(50);
      expect(updated.battery).toBeGreaterThanOrEqual(0);
    });

    it("updateDronePosition never produces negative battery", () => {
      const drone = makeDrone({
        status: "en-route",
        battery: 0.01,
        waypoints: [[18.535, 73.890], [18.540, 73.900]],
        currentWaypointIndex: 0,
      });
      const updated = updateDronePosition(drone);
      expect(updated.battery).toBeGreaterThanOrEqual(0);
    });
  });
});
