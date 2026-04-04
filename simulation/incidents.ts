/**
 * Incident generator — creates random incidents at Indian city coordinates.
 */

import type { IncidentType, IncidentSeverity, Incident } from "./types";
import {
  INCIDENT_ZONES,
  INCIDENT_TYPE_WEIGHTS,
  INCIDENT_TYPE_LABELS,
  type LatLng,
} from "@/lib/netra-constants";

let incidentCounter = 0;

export interface IncidentSeed {
  type: IncidentType;
  severity: IncidentSeverity;
  position: LatLng;
  locationName: string;
  description: string;
  detectionConfidence: number;
  resolveAfterTicks?: number;
  /** CV metadata — propagated to Incident */
  source?: "yolov8_detector" | "simulation" | "manual";
  camera_id?: string;
  camera_name?: string;
  confidence?: number;
  detected_classes?: string[];
}

/**
 * Generate a random incident.
 */
export function generateIncident(currentTick: number): Incident {
  incidentCounter++;

  const zone = INCIDENT_ZONES[Math.floor(Math.random() * INCIDENT_ZONES.length)];
  const type = pickWeightedType();
  const severity = getSeverityForType(type);

  // Add slight position jitter
  const position: LatLng = [
    zone.position[0] + (Math.random() - 0.5) * 0.004,
    zone.position[1] + (Math.random() - 0.5) * 0.004,
  ];

  const description = generateDescription(type, zone.name);

  return {
    ...buildIncident(
      {
        type,
        severity,
        position,
        locationName: zone.name,
        description,
        detectionConfidence: 0.75 + Math.random() * 0.20,
      },
      currentTick
    ),
  };
}

/**
 * Build an incident from external payload (camera/AI/webhook).
 */
export function buildIncident(seed: IncidentSeed, currentTick: number): Incident {
  incidentCounter++;

  return {
    id: `INC-${String(incidentCounter).padStart(4, "0")}`,
    type: seed.type,
    severity: seed.severity,
    position: seed.position,
    locationName: seed.locationName,
    timestamp: Date.now(),
    status: "detected",
    assignedDrone: null,
    description: seed.description,
    detectionConfidence: seed.detectionConfidence,
    resolveAtTick:
      currentTick +
      (seed.resolveAfterTicks ?? 30 + Math.floor(Math.random() * 40)),
    // CV metadata
    ...(seed.source && { source: seed.source }),
    ...(seed.camera_id && { camera_id: seed.camera_id }),
    ...(seed.camera_name && { camera_name: seed.camera_name }),
    ...(seed.confidence != null && { confidence: seed.confidence }),
    ...(seed.detected_classes && { detected_classes: seed.detected_classes }),
  };
}

function pickWeightedType(): IncidentType {
  const r = Math.random();
  let cumulative = 0;
  const entries = Object.entries(INCIDENT_TYPE_WEIGHTS) as [IncidentType, number][];

  for (const [type, weight] of entries) {
    cumulative += weight;
    if (r <= cumulative) return type;
  }

  return "road_accident";
}

function getSeverityForType(type: IncidentType): IncidentSeverity {
  const r = Math.random();
  switch (type) {
    case "road_accident":
      return r < 0.4 ? "critical" : r < 0.7 ? "high" : "medium";
    case "crowd_gathering":
      return r < 0.2 ? "critical" : r < 0.5 ? "high" : "medium";
    case "unauthorized_entry":
      return r < 0.3 ? "high" : r < 0.7 ? "medium" : "low";
    case "suspicious_vehicle":
      return r < 0.3 ? "high" : "medium";
    case "abandoned_object":
      return r < 0.4 ? "high" : "medium";
    case "traffic_violation":
      return r < 0.1 ? "high" : r < 0.4 ? "medium" : "low";
    case "fire_breakout":
      return r < 0.5 ? "critical" : r < 0.8 ? "high" : "medium";
    default:
      return "medium";
  }
}

function generateDescription(type: IncidentType, location: string): string {
  const label = INCIDENT_TYPE_LABELS[type];
  const descriptions: Record<IncidentType, string[]> = {
    crowd_gathering: [
      `Unusual crowd formation detected near ${location}`,
      `Sudden crowd surge observed at ${location} area`,
      `Abnormal gathering detected in ${location} vicinity`,
    ],
    road_accident: [
      `Vehicle collision reported near ${location}`,
      `Road accident detected at ${location} junction`,
      `Fallen individual detected on road near ${location}`,
    ],
    unauthorized_entry: [
      `Unauthorized movement in restricted zone near ${location}`,
      `Perimeter breach detected at ${location}`,
      `Intrusion alert triggered near ${location}`,
    ],
    suspicious_vehicle: [
      `Suspicious vehicle stopped near ${location}`,
      `Unidentified vehicle lingering at ${location}`,
      `Vehicle exhibiting unusual behavior at ${location}`,
    ],
    abandoned_object: [
      `Unattended package detected near ${location}`,
      `Abandoned object reported at ${location}`,
      `Suspicious item left at ${location} area`,
    ],
    traffic_violation: [
      `Traffic signal violation detected at ${location}`,
      `Wrong-way driving observed near ${location}`,
      `Speed violation captured at ${location} zone`,
    ],
    fire_breakout: [
      `Fire detected near ${location} — smoke and flames confirmed`,
      `Active fire breakout at ${location} area`,
      `Thermal anomaly confirmed as fire near ${location}`,
    ],
  };

  const options = descriptions[type];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Should we generate an incident this tick?
 * ~15% chance per tick, but not more than once every 3 ticks.
 */
let lastIncidentTick = 0;

export function shouldGenerateIncident(currentTick: number): boolean {
  if (currentTick - lastIncidentTick < 3) return false;
  if (Math.random() < 0.15) {
    lastIncidentTick = currentTick;
    return true;
  }
  return false;
}
