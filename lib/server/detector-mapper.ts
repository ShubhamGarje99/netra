import { CAMERA_FEEDS } from "@/lib/netra-constants";
import type { IncidentSeverity, IncidentType } from "@/simulation/types";
import type { IncidentIngestPayload } from "@/lib/server/simulation-runtime";

export interface DetectorSignal {
  label: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface DetectorEventPayload {
  sourceType?: string;
  sourceId?: string;
  cameraId?: string;
  timestamp?: number;
  lat?: number;
  lng?: number;
  detections?: DetectorSignal[];
}

interface MappingRule {
  labels: string[];
  type: IncidentType;
  severity: IncidentSeverity;
}

const MAPPING_RULES: MappingRule[] = [
  {
    labels: ["crowd", "crowd_surge", "mob", "gathering"],
    type: "crowd_gathering",
    severity: "high",
  },
  {
    labels: ["accident", "collision", "fallen_person", "crash"],
    type: "road_accident",
    severity: "critical",
  },
  {
    labels: ["restricted_zone_entry", "restricted_gathering", "geofence_breach"],
    type: "unauthorized_entry",
    severity: "critical",
  },
  {
    labels: ["intrusion", "unauthorized", "restricted_entry", "perimeter_breach"],
    type: "unauthorized_entry",
    severity: "high",
  },
  {
    labels: ["vehicle_stop", "stationary_vehicle", "stopped_vehicle"],
    type: "suspicious_vehicle",
    severity: "high",
  },
  {
    labels: ["suspicious_vehicle", "vehicle_loitering", "stalled_vehicle"],
    type: "suspicious_vehicle",
    severity: "medium",
  },
  {
    labels: ["abandoned_object", "abandoned_static", "left_bag", "unattended_item"],
    type: "abandoned_object",
    severity: "high",
  },
  {
    labels: ["traffic_violation", "wrong_way", "signal_jump", "over_speed"],
    type: "traffic_violation",
    severity: "medium",
  },
];

function toDetectorLabel(value: string) {
  return value.trim().toLowerCase();
}

function findRule(label: string) {
  const normalized = toDetectorLabel(label);
  return MAPPING_RULES.find((rule) =>
    rule.labels.some((candidate) => normalized.includes(candidate))
  );
}

function resolveLocation(payload: DetectorEventPayload) {
  const camera = payload.cameraId
    ? CAMERA_FEEDS.find((feed) => feed.id === payload.cameraId)
    : undefined;

  if (Number.isFinite(payload.lat) && Number.isFinite(payload.lng)) {
    return {
      lat: payload.lat as number,
      lng: payload.lng as number,
      locationName: camera?.location ?? `Geo(${payload.lat?.toFixed(4)}, ${payload.lng?.toFixed(4)})`,
      sourceId: payload.cameraId ?? payload.sourceId ?? "geo-source",
      sourceType: payload.sourceType ?? "detector",
    };
  }

  if (camera) {
    return {
      lat: camera.position[0],
      lng: camera.position[1],
      locationName: camera.location,
      sourceId: camera.id,
      sourceType: payload.sourceType ?? "camera",
    };
  }

  return null;
}

export function mapDetectorEventToIncident(payload: DetectorEventPayload): {
  ingestPayload: IncidentIngestPayload;
  sourceId: string;
  sourceType: string;
} | null {
  const detections = payload.detections ?? [];
  if (detections.length === 0) return null;

  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const best = sorted[0];
  const rule = findRule(best.label);
  const location = resolveLocation(payload);

  if (!rule || !location) return null;

  const confidence = Number.isFinite(best.confidence)
    ? Math.min(1, Math.max(0, best.confidence))
    : 0.75;

  // Collect detected class names
  const detectedClasses = sorted.map(d => d.label);

  // Find camera feed info for camera name
  const cameraFeed = payload.cameraId
    ? CAMERA_FEEDS.find((f) => f.id === payload.cameraId)
    : undefined;

  return {
    sourceId: location.sourceId,
    sourceType: location.sourceType,
    ingestPayload: {
      type: rule.type,
      severity: rule.severity,
      lat: location.lat,
      lng: location.lng,
      locationName: location.locationName,
      description: `Detector ${location.sourceId}: ${best.label}`,
      detectionConfidence: confidence,
      resolveAfterTicks: 45,
      // CV metadata
      source: payload.sourceType === "yolov8" ? "yolov8_detector" : undefined,
      camera_id: payload.cameraId,
      camera_name: cameraFeed?.location,
      confidence,
      detected_classes: detectedClasses,
    },
  };
}
