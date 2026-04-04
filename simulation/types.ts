/**
 * Core types for the NETRA simulation engine.
 */

import type { LatLng } from "@/lib/netra-constants";

export type DroneStatus = "idle" | "dispatched" | "en-route" | "on-scene" | "returning" | "charging";
export type IncidentSeverity = "critical" | "high" | "medium" | "low";
export type IncidentType =
  | "crowd_gathering"
  | "road_accident"
  | "unauthorized_entry"
  | "suspicious_vehicle"
  | "abandoned_object"
  | "traffic_violation"
  | "fire_breakout";

export type IncidentStatus = "detected" | "drone_dispatched" | "drone_arriving" | "monitoring" | "resolved";

export interface Drone {
  id: string;
  name: string;
  position: LatLng;
  basePosition: LatLng;
  status: DroneStatus;
  battery: number;       // 0-100
  altitude: number;      // meters
  speed: number;         // km/h
  heading: number;       // degrees
  assignedIncident: string | null;
  waypoints: LatLng[];
  currentWaypointIndex: number;
  eta: number;           // seconds
}

export interface Incident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  position: LatLng;
  locationName: string;
  timestamp: number;
  status: IncidentStatus;
  assignedDrone: string | null;
  description: string;
  detectionConfidence: number; // 0-1
  resolveAtTick: number;      // auto-resolve at this tick
  /** Source of this incident: CV detector, simulation engine, or manual trigger */
  source?: "yolov8_detector" | "simulation" | "manual";
  /** Camera ID if CV-detected */
  camera_id?: string;
  /** Human-readable camera name */
  camera_name?: string;
  /** Detection confidence from CV model */
  confidence?: number;
  /** YOLO class names that triggered this incident */
  detected_classes?: string[];
}

export interface Alert {
  id: string;
  incidentId: string;
  timestamp: number;
  message: string;
  severity: IncidentSeverity;
  type: "detection" | "dispatch" | "arrival" | "resolution" | "system";
}

export interface SimulationStats {
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  avgResponseTime: number;
  dronesActive: number;
  dronesIdle: number;
  responseTimes: number[];
}
