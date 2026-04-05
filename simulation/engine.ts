/**
 * SimulationEngine — The heart of the NETRA simulation.
 * Runs a 1Hz tick loop: generates incidents, dispatches drones,
 * updates positions, manages battery & charging, resolves incidents.
 */

import type { Drone, Incident, Alert, SimulationStats, DispatchLogEntry } from "./types";
import { initializeFleet, updateDronePosition, clampBattery, CHARGE_RATE, LOW_BATTERY_THRESHOLD } from "./drones";
import { buildIncident, type IncidentSeed, generateIncident, shouldGenerateIncident } from "./incidents";
import { findBestDrone, dispatchDrone, returnToBase, estimateRequiredBattery } from "./dispatch";
import { calculateRoute, routeDistance } from "./pathfinding";
import { haversineDistance } from "./pathfinding";

export type EngineCallback = (state: {
  drones: Drone[];
  incidents: Incident[];
  alerts: Alert[];
  stats: SimulationStats;
  dispatchLogs: DispatchLogEntry[];
}) => void;

export class SimulationEngine {
  private drones: Drone[];
  private incidents: Incident[];
  private alerts: Alert[];
  private tickCount: number = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private callback: EngineCallback;
  private responseTimes: number[] = [];
  private autoGenerateIncidents: boolean = false;
  private dispatchLogs: DispatchLogEntry[] = [];

  constructor(callback: EngineCallback) {
    this.drones = initializeFleet();
    this.incidents = [];
    this.alerts = [];
    this.callback = callback;

    // Initial system alert
    this.alerts.push({
      id: `ALT-SYS-INIT`,
      incidentId: "",
      timestamp: Date.now(),
      message: "NETRA System Online — 8 drones initialized, monitoring active",
      severity: "low",
      type: "system",
    });
  }

  start() {
    if (this.intervalId) return;
    this.emit();

    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);
  }

  isRunning() {
    return Boolean(this.intervalId);
  }

  setAutoGenerateIncidents(enabled: boolean) {
    this.autoGenerateIncidents = enabled;
  }

  hydrate(data: {
    drones: Drone[];
    incidents: Incident[];
    alerts: Alert[];
    responseTimes?: number[];
    tickCount?: number;
  }) {
    this.drones = [...data.drones];
    this.incidents = [...data.incidents];
    this.alerts = [...data.alerts];
    this.responseTimes = [...(data.responseTimes ?? [])];
    this.tickCount = data.tickCount ?? this.tickCount;
    this.emit();
  }

  getRuntimeMeta() {
    return {
      tickCount: this.tickCount,
      responseTimes: [...this.responseTimes],
    };
  }

  getState() {
    const active = this.incidents.filter((i) => i.status !== "resolved");
    const resolvedCount = this.incidents.filter((i) => i.status === "resolved").length;
    const dronesActive = this.drones.filter((d) => d.status !== "idle" && d.status !== "charging").length;

    return {
      drones: [...this.drones],
      incidents: [...this.incidents],
      alerts: [...this.alerts],
      dispatchLogs: [...this.dispatchLogs],
      stats: {
        totalIncidents: this.incidents.length,
        activeIncidents: active.length,
        resolvedIncidents: resolvedCount,
        avgResponseTime:
          this.responseTimes.length > 0
            ? Math.round(
                this.responseTimes.reduce((a, b) => a + b, 0) /
                  this.responseTimes.length
              )
            : 0,
        dronesActive,
        dronesIdle: this.drones.length - dronesActive,
        responseTimes: [...this.responseTimes].slice(-10),
      },
    } as {
      drones: Drone[];
      incidents: Incident[];
      alerts: Alert[];
      stats: SimulationStats;
      dispatchLogs: DispatchLogEntry[];
    };
  }

  injectIncident(seed: IncidentSeed) {
    const incident = buildIncident(seed, this.tickCount);
    this.incidents.push(incident);

    this.alerts.push({
      id: `ALT-${Date.now()}-ext`,
      incidentId: incident.id,
      timestamp: Date.now(),
      message: `EXTERNAL ALERT: ${incident.description} [${Math.round(incident.detectionConfidence * 100)}% confidence]`,
      severity: incident.severity,
      type: "detection",
    });

    this.dispatchPendingIncidents();
    this.emit();

    return incident;
  }

  /**
   * Force a drone's battery to a specific level (demo / testing only).
   * This is a pure state mutation — does not alter dispatch logic.
   */
  forceDroneBattery(droneId: string, battery: number) {
    this.drones = this.drones.map((d) =>
      d.id === droneId ? { ...d, battery: clampBattery(battery) } : d
    );
    this.emit();
  }

  pushSystemAlert(message: string, severity: "critical" | "high" | "medium" | "low" = "medium") {
    this.alerts.push({
      id: `ALT-${Date.now()}-sys`,
      incidentId: "",
      timestamp: Date.now(),
      message,
      severity,
      type: "system",
    });

    this.emit();
  }

  private tryDispatchIncident(incidentId: string) {
    const incident = this.incidents.find((inc) => inc.id === incidentId);
    if (!incident || incident.assignedDrone || incident.status !== "detected") return;

    const { drone: best, score, allScores } = findBestDrone(incident.position, this.drones, incident);
    if (!best) return;

    const result = dispatchDrone(best, incident);
    this.drones = this.drones.map((d) =>
      d.id === result.drone.id ? result.drone : d
    );
    this.incidents = this.incidents.map((inc) =>
      inc.id === result.incident.id ? result.incident : inc
    );
    this.alerts.push(result.alert);

    // Build dispatch decision log entry for explainability
    const requiredBattery = estimateRequiredBattery(
      best.position, incident.position, best.basePosition,
    );
    const distKm = haversineDistance(best.position, incident.position);
    const etaSecs = Math.round(distKm / (best.speed / 3600));

    const logEntry: DispatchLogEntry = {
      incidentId: incident.id,
      timestamp: Date.now(),
      selectedDroneId: best.id,
      score,
      eta: etaSecs,
      batteryAfter: Math.round(best.battery - requiredBattery),
      runnersUp: allScores.filter((s) => s.droneId !== best.id).slice(0, 3),
    };
    this.dispatchLogs.push(logEntry);
    // Keep only last 10 entries
    if (this.dispatchLogs.length > 10) {
      this.dispatchLogs = this.dispatchLogs.slice(-10);
    }
  }

  private incidentPriorityScore(incident: Incident) {
    const typeWeight: Record<Incident["type"], number> = {
      fire_breakout: 320,
      crowd_gathering: 300,
      road_accident: 260,
      suspicious_vehicle: 220,
      unauthorized_entry: 200,
      abandoned_object: 170,
      traffic_violation: 140,
    };

    const severityWeight: Record<Incident["severity"], number> = {
      critical: 90,
      high: 60,
      medium: 30,
      low: 10,
    };

    const ageSeconds = Math.floor((Date.now() - incident.timestamp) / 1000);
    return typeWeight[incident.type] + severityWeight[incident.severity] + Math.min(45, ageSeconds);
  }

  private dispatchPendingIncidents() {
    const pending = this.incidents
      .filter((incident) => incident.status === "detected" && !incident.assignedDrone)
      .sort((a, b) => this.incidentPriorityScore(b) - this.incidentPriorityScore(a));

    for (const incident of pending) {
      this.tryDispatchIncident(incident.id);
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick() {
    this.tickCount++;

    // 1. Generate new incidents
    if (this.autoGenerateIncidents && shouldGenerateIncident(this.tickCount)) {
      const incident = generateIncident(this.tickCount);
      this.incidents.push(incident);

      // Detection alert
      this.alerts.push({
        id: `ALT-${Date.now()}-det`,
        incidentId: incident.id,
        timestamp: Date.now(),
        message: `ALERT: ${incident.description} [${Math.round(incident.detectionConfidence * 100)}% confidence]`,
        severity: incident.severity,
        type: "detection",
      });

      // Auto-dispatch
      this.tryDispatchIncident(incident.id);
    }

    // 2. Try to dispatch undispatched incidents using priority order
    this.dispatchPendingIncidents();

    // 3. Update drone positions (battery drain happens inside updateDronePosition)
    this.drones = this.drones.map((drone) => {
      if (drone.status === "idle" || drone.status === "charging") return drone;

      const updated = updateDronePosition(drone);

      // Check arrival at incident
      if (
        (updated.status === "en-route" || updated.status === "dispatched") &&
        updated.currentWaypointIndex >= updated.waypoints.length &&
        updated.assignedIncident
      ) {
        // Arrived at incident
        this.alerts.push({
          id: `ALT-${Date.now()}-arr-${updated.id}`,
          incidentId: updated.assignedIncident,
          timestamp: Date.now(),
          message: `${updated.name} arrived at incident location — monitoring active`,
          severity: "low",
          type: "arrival",
        });

        // Update incident status
        this.incidents = this.incidents.map((inc) =>
          inc.id === updated.assignedIncident
            ? { ...inc, status: "monitoring" as const }
            : inc
        );

        return { ...updated, status: "on-scene" as const, eta: 0 };
      }

      // Check arrival at base (returning)
      if (
        updated.status === "returning" &&
        updated.currentWaypointIndex >= updated.waypoints.length
      ) {
        return {
          ...updated,
          status: "idle" as const,
          altitude: 0,
          waypoints: [],
          currentWaypointIndex: 0,
          position: updated.basePosition,
        };
      }

      return updated;
    });

    // 4. Low-battery auto-return — force drones below threshold back to base
    this.drones = this.drones.map((drone) => {
      if (
        drone.battery <= LOW_BATTERY_THRESHOLD &&
        drone.battery > 0 &&
        (drone.status === "en-route" || drone.status === "on-scene" || drone.status === "dispatched")
      ) {
        // Release the incident
        if (drone.assignedIncident) {
          this.incidents = this.incidents.map((inc) =>
            inc.id === drone.assignedIncident
              ? { ...inc, status: "detected" as const, assignedDrone: null }
              : inc
          );
        }

        this.alerts.push({
          id: `ALT-${Date.now()}-lowbat-${drone.id}`,
          incidentId: drone.assignedIncident ?? "",
          timestamp: Date.now(),
          message: `⚠ ${drone.name} LOW BATTERY (${Math.round(drone.battery)}%) — aborting mission, returning to base`,
          severity: "high",
          type: "system",
        });

        return returnToBase(drone);
      }

      // Dead drone — emergency landing at current position
      if (drone.battery <= 0 && drone.status !== "idle" && drone.status !== "charging") {
        // Release the incident
        if (drone.assignedIncident) {
          this.incidents = this.incidents.map((inc) =>
            inc.id === drone.assignedIncident
              ? { ...inc, status: "detected" as const, assignedDrone: null }
              : inc
          );
        }

        this.alerts.push({
          id: `ALT-${Date.now()}-dead-${drone.id}`,
          incidentId: drone.assignedIncident ?? "",
          timestamp: Date.now(),
          message: `🔴 ${drone.name} BATTERY DEPLETED — emergency landing at current position`,
          severity: "critical",
          type: "system",
        });

        return {
          ...drone,
          status: "charging" as const,
          altitude: 0,
          assignedIncident: null,
          waypoints: [],
          currentWaypointIndex: 0,
          eta: 0,
          battery: 0,
        };
      }

      return drone;
    });

    // 5. Auto-resolve incidents
    for (const incident of this.incidents) {
      if (
        incident.status === "monitoring" &&
        this.tickCount >= incident.resolveAtTick
      ) {
        this.incidents = this.incidents.map((inc) =>
          inc.id === incident.id ? { ...inc, status: "resolved" as const } : inc
        );

        // Calculate response time
        const responseTime = Math.round((Date.now() - incident.timestamp) / 1000);
        this.responseTimes.push(responseTime);

        this.alerts.push({
          id: `ALT-${Date.now()}-res-${incident.id}`,
          incidentId: incident.id,
          timestamp: Date.now(),
          message: `Incident ${incident.id} at ${incident.locationName} resolved — drone returning to base`,
          severity: "low",
          type: "resolution",
        });

        // Return assigned drone to base
        if (incident.assignedDrone) {
          this.drones = this.drones.map((d) => {
            if (d.id === incident.assignedDrone) {
              return returnToBase(d);
            }
            return d;
          });
        }
      }
    }

    // 6. Battery management — charging cycle
    this.drones = this.drones.map((d) => {
      // Idle drones with battery < 100 → enter charging state
      if (d.status === "idle" && d.battery < 100) {
        return {
          ...d,
          status: "charging" as const,
          battery: clampBattery(d.battery + CHARGE_RATE),
        };
      }

      // Charging drones → recharge until 100%
      if (d.status === "charging") {
        const newBattery = clampBattery(d.battery + CHARGE_RATE);
        if (newBattery >= 100) {
          return {
            ...d,
            status: "idle" as const,
            battery: 100,
          };
        }
        return { ...d, battery: newBattery };
      }

      return d;
    });

    // 7. Keep alerts list manageable
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-80);
    }

    // 8. Remove old resolved incidents (keep last 20)
    const resolved = this.incidents.filter((i) => i.status === "resolved");
    if (resolved.length > 20) {
      const toRemove = new Set(
        resolved.slice(0, resolved.length - 20).map((i) => i.id)
      );
      this.incidents = this.incidents.filter((i) => !toRemove.has(i.id));
    }

    this.emit();
  }

  private emit() {
    this.callback(this.getState());
  }

  destroy() {
    this.stop();
  }
}
