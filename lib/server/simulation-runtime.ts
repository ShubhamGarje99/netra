import { SimulationEngine } from "@/simulation/engine";
import type { PoolClient } from "pg";
import type { IncidentSeverity, IncidentType } from "@/simulation/types";
import type { IncidentSeed } from "@/simulation/incidents";
import {
  acquireLeadershipLock,
  initPersistenceSchema,
  isPersistenceEnabled,
  loadPersistedRuntimeState,
  recordDetectorEvent,
  releaseLeadershipLock,
  savePersistedRuntimeState,
  setDesiredRunning,
  type DetectorEventRecord,
  type PersistedRuntimeState,
} from "@/lib/server/postgres";

interface StreamPayload {
  type: "state" | "heartbeat";
  timestamp: number;
  running: boolean;
  autoGenerateIncidents: boolean;
  detectorOnline?: boolean | null;
  state?: ReturnType<SimulationEngine["getState"]>;
}

type Subscriber = (payload: StreamPayload) => void;

const INCIDENT_TYPES: IncidentType[] = [
  "crowd_gathering",
  "road_accident",
  "unauthorized_entry",
  "suspicious_vehicle",
  "abandoned_object",
  "traffic_violation",
  "fire_breakout",
];

const INCIDENT_SEVERITIES: IncidentSeverity[] = ["critical", "high", "medium", "low"];

function isIncidentType(value: string): value is IncidentType {
  return INCIDENT_TYPES.includes(value as IncidentType);
}

function isIncidentSeverity(value: string): value is IncidentSeverity {
  return INCIDENT_SEVERITIES.includes(value as IncidentSeverity);
}

export interface IncidentIngestPayload {
  type: string;
  severity: string;
  lat: number;
  lng: number;
  locationName: string;
  description: string;
  detectionConfidence?: number;
  resolveAfterTicks?: number;
  /** CV pipeline metadata */
  source?: "yolov8_detector" | "simulation" | "manual";
  camera_id?: string;
  camera_name?: string;
  confidence?: number;
  detected_classes?: string[];
}

export class SimulationRuntime {
  private readonly engine: SimulationEngine;
  private readonly subscribers = new Set<Subscriber>();
  private readonly autoGenerateIncidents: boolean;
  private readonly detectorHealthUrl: string;
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private detectorHeartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private leaderClient: PoolClient | null = null;
  private isLeader: boolean = false;
  private detectorOnline: boolean | null = null;
  private desiredRunning: boolean = true;
  private latestSnapshot: ReturnType<SimulationEngine["getState"]>;
  private lastPersistedAt = 0;
  private persistIntervalId: ReturnType<typeof setInterval> | null = null;
  private followerPollIntervalId: ReturnType<typeof setInterval> | null = null;
  private leadershipRetryIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.autoGenerateIncidents = process.env.NETRA_AUTO_GENERATE_INCIDENTS !== "false";
    this.detectorHealthUrl = process.env.DETECTOR_HEALTH_URL ?? "http://localhost:5001/health";

    this.engine = new SimulationEngine((state) => {
      this.latestSnapshot = state;
      this.broadcast({
        type: "state",
        timestamp: Date.now(),
        running: this.isLeader ? this.engine.isRunning() : this.desiredRunning,
        autoGenerateIncidents: this.autoGenerateIncidents,
        state,
      });

      void this.persistState();
    });

    this.latestSnapshot = this.engine.getState();
    this.engine.setAutoGenerateIncidents(this.autoGenerateIncidents);
  }

  async init() {
    if (isPersistenceEnabled()) {
      await initPersistenceSchema();
      await this.hydrateFromPersistence();
      await this.tryBecomeLeader();
      this.startLeadershipRetryLoop();
      this.startFollowerPolling();
    } else {
      this.isLeader = true;
      this.engine.start();
      this.desiredRunning = true;
    }

    this.startHeartbeat();
    this.startDetectorHeartbeat();
    this.startPersistLoop();
  }

  getSnapshot() {
    return {
      running: this.desiredRunning,
      autoGenerateIncidents: this.autoGenerateIncidents,
      detectorOnline: this.detectorOnline,
      state: this.latestSnapshot,
      persistenceEnabled: isPersistenceEnabled(),
      leader: this.isLeader,
    };
  }

  start() {
    this.desiredRunning = true;

    if (this.isLeader) {
      this.engine.start();
    }

    if (isPersistenceEnabled()) {
      void setDesiredRunning(true);
      void this.persistState(true);
    }
  }

  stop() {
    this.desiredRunning = false;

    if (this.isLeader) {
      this.engine.stop();
    }

    if (isPersistenceEnabled()) {
      void setDesiredRunning(false);
      void this.persistState(true);
    }
  }

  ingestIncident(payload: IncidentIngestPayload) {
    if (!isIncidentType(payload.type)) {
      throw new Error("Invalid incident type");
    }
    if (!isIncidentSeverity(payload.severity)) {
      throw new Error("Invalid incident severity");
    }
    if (!Number.isFinite(payload.lat) || !Number.isFinite(payload.lng)) {
      throw new Error("Invalid coordinates");
    }
    if (!payload.locationName?.trim()) {
      throw new Error("locationName is required");
    }
    if (!payload.description?.trim()) {
      throw new Error("description is required");
    }

    const confidence = payload.detectionConfidence ?? 0.85;
    const clampedConfidence = Math.min(1, Math.max(0, confidence));

    const seed: IncidentSeed = {
      type: payload.type,
      severity: payload.severity,
      position: [payload.lat, payload.lng],
      locationName: payload.locationName.trim(),
      description: payload.description.trim(),
      detectionConfidence: clampedConfidence,
      resolveAfterTicks: payload.resolveAfterTicks,
      // CV metadata pass-through
      source: payload.source,
      camera_id: payload.camera_id,
      camera_name: payload.camera_name,
      confidence: payload.confidence,
      detected_classes: payload.detected_classes,
    };

    if (!this.isLeader && isPersistenceEnabled()) {
      throw new Error("This instance is follower-only. Send ingest to leader node.");
    }

    return this.engine.injectIncident(seed);
  }

  /**
   * Force a drone's battery to a specific level (demo / testing only).
   */
  forceDroneBattery(droneId: string, battery: number) {
    if (!this.isLeader && isPersistenceEnabled()) {
      throw new Error("This instance is follower-only.");
    }
    this.engine.forceDroneBattery(droneId, battery);
  }

  async recordDetectorEvent(event: DetectorEventRecord) {
    await recordDetectorEvent(event);
  }

  subscribe(subscriber: Subscriber) {
    this.subscribers.add(subscriber);

    subscriber({
      type: "state",
      timestamp: Date.now(),
      running: this.desiredRunning,
      autoGenerateIncidents: this.autoGenerateIncidents,
      state: this.latestSnapshot,
    });

    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  private broadcast(payload: StreamPayload) {
    for (const subscriber of this.subscribers) {
      subscriber(payload);
    }
  }

  private startHeartbeat() {
    if (this.heartbeatIntervalId) return;

    this.heartbeatIntervalId = setInterval(() => {
      this.broadcast({
        type: "heartbeat",
        timestamp: Date.now(),
        running: this.desiredRunning,
        autoGenerateIncidents: this.autoGenerateIncidents,
        detectorOnline: this.detectorOnline,
      });
    }, 5000);
  }

  private startDetectorHeartbeat() {
    if (this.detectorHeartbeatIntervalId) return;

    void this.refreshDetectorHeartbeat();
    this.detectorHeartbeatIntervalId = setInterval(() => {
      void this.refreshDetectorHeartbeat();
    }, 4000);
  }

  private async refreshDetectorHeartbeat() {
    const shouldWriteAlerts = !isPersistenceEnabled() || this.isLeader;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    let online = false;
    try {
      const response = await fetch(this.detectorHealthUrl, {
        cache: "no-store",
        signal: controller.signal,
      });
      online = response.ok;
    } catch {
      online = false;
    } finally {
      clearTimeout(timeoutId);
    }

    if (this.detectorOnline === online) return;
    this.detectorOnline = online;

    if (shouldWriteAlerts) {
      if (online) {
        this.engine.pushSystemAlert(
          "Detector heartbeat restored. AI incident ingestion active.",
          "low"
        );
      } else {
        this.engine.pushSystemAlert(
          "CRITICAL: Detector heartbeat lost. AI ingestion unavailable.",
          "critical"
        );
      }
    }

    this.broadcast({
      type: "heartbeat",
      timestamp: Date.now(),
      running: this.desiredRunning,
      autoGenerateIncidents: this.autoGenerateIncidents,
      detectorOnline: this.detectorOnline,
    });
  }

  private async hydrateFromPersistence() {
    const persisted = await loadPersistedRuntimeState();
    if (!persisted || !Array.isArray(persisted.state.drones)) {
      return;
    }

    this.desiredRunning = persisted.desiredRunning;

    this.engine.hydrate({
      drones: persisted.state.drones as ReturnType<SimulationEngine["getState"]>["drones"],
      incidents: persisted.state.incidents as ReturnType<SimulationEngine["getState"]>["incidents"],
      alerts: persisted.state.alerts as ReturnType<SimulationEngine["getState"]>["alerts"],
      responseTimes: persisted.meta.responseTimes,
      tickCount: persisted.meta.tickCount,
    });

    this.latestSnapshot = this.engine.getState();
  }

  private async tryBecomeLeader() {
    if (!isPersistenceEnabled() || this.isLeader) return;

    const client = await acquireLeadershipLock();
    if (!client) return;

    this.leaderClient = client;
    this.isLeader = true;

    if (this.desiredRunning) {
      this.engine.start();
    } else {
      this.engine.stop();
    }
  }

  private startLeadershipRetryLoop() {
    if (!isPersistenceEnabled() || this.leadershipRetryIntervalId) return;

    this.leadershipRetryIntervalId = setInterval(() => {
      if (!this.isLeader) {
        void this.tryBecomeLeader();
      }
    }, 3000);
  }

  private startFollowerPolling() {
    if (!isPersistenceEnabled() || this.followerPollIntervalId) return;

    this.followerPollIntervalId = setInterval(() => {
      if (this.isLeader) return;
      void this.refreshFromPersistence();
    }, 2000);
  }

  private startPersistLoop() {
    if (!isPersistenceEnabled() || this.persistIntervalId) return;

    this.persistIntervalId = setInterval(() => {
      void this.persistState();
    }, 1500);
  }

  private async refreshFromPersistence() {
    const persisted = await loadPersistedRuntimeState();
    if (!persisted || persisted.updatedAt <= this.lastPersistedAt) return;
    if (!Array.isArray(persisted.state.drones) || !Array.isArray(persisted.state.incidents) || !Array.isArray(persisted.state.alerts)) {
      return;
    }

    this.lastPersistedAt = persisted.updatedAt;
    this.desiredRunning = persisted.desiredRunning;

    const previousSerialized = JSON.stringify(this.latestSnapshot);

    this.latestSnapshot = {
      drones: persisted.state.drones as ReturnType<SimulationEngine["getState"]>["drones"],
      incidents: persisted.state.incidents as ReturnType<SimulationEngine["getState"]>["incidents"],
      alerts: persisted.state.alerts as ReturnType<SimulationEngine["getState"]>["alerts"],
      dispatchLogs: (persisted.state as Record<string, unknown>).dispatchLogs as ReturnType<SimulationEngine["getState"]>["dispatchLogs"] ?? [],
      stats: persisted.state.stats,
    };

    if (JSON.stringify(this.latestSnapshot) !== previousSerialized) {
      this.broadcast({
        type: "state",
        timestamp: Date.now(),
        running: this.desiredRunning,
        autoGenerateIncidents: this.autoGenerateIncidents,
        state: this.latestSnapshot,
        detectorOnline: this.detectorOnline,
      });
    }
  }

  private async persistState(force = false) {
    if (!isPersistenceEnabled() || !this.isLeader) return;

    const persisted = await loadPersistedRuntimeState();
    if (persisted && persisted.desiredRunning !== this.desiredRunning) {
      this.desiredRunning = persisted.desiredRunning;
      if (this.desiredRunning) {
        this.engine.start();
      } else {
        this.engine.stop();
      }
    }

    const now = Date.now();
    if (!force && now - this.lastPersistedAt < 900) return;

    const state = this.engine.getState();
    const meta = this.engine.getRuntimeMeta();

    const payload: PersistedRuntimeState = {
      running: this.engine.isRunning(),
      desiredRunning: this.desiredRunning,
      autoGenerateIncidents: this.autoGenerateIncidents,
      state,
      meta,
      updatedAt: now,
    };

    await savePersistedRuntimeState(payload);
    this.lastPersistedAt = now;
  }

  async destroy() {
    this.engine.stop();
    if (this.heartbeatIntervalId) clearInterval(this.heartbeatIntervalId);
    if (this.detectorHeartbeatIntervalId) clearInterval(this.detectorHeartbeatIntervalId);
    if (this.persistIntervalId) clearInterval(this.persistIntervalId);
    if (this.followerPollIntervalId) clearInterval(this.followerPollIntervalId);
    if (this.leadershipRetryIntervalId) clearInterval(this.leadershipRetryIntervalId);
    await releaseLeadershipLock(this.leaderClient);
    this.leaderClient = null;
    this.isLeader = false;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __netraRuntimePromise: Promise<SimulationRuntime> | undefined;
}

export function getSimulationRuntime() {
  if (!global.__netraRuntimePromise) {
    global.__netraRuntimePromise = (async () => {
      const runtime = new SimulationRuntime();
      await runtime.init();
      return runtime;
    })();
  }

  return global.__netraRuntimePromise;
}
