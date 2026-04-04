/**
 * India-specific constants for NETRA simulation.
 */

export type LatLng = [number, number];

export interface DroneConfig {
  id: string;
  name: string;
  base: LatLng;
  speed: number; // km/h
}

export interface IncidentZone {
  name: string;
  position: LatLng;
  riskLevel: "high" | "medium" | "low";
}

export interface NoFlyZone {
  name: string;
  polygon: LatLng[];
}

// ── Drone Fleet (8 drones across Pune) ──────────────────────────────────────

export const DRONE_FLEET: DroneConfig[] = [
  { id: "drone-1", name: "GARUDA-01",  base: [18.5308, 73.8475], speed: 72 },
  { id: "drone-2", name: "VAYU-02",    base: [18.5913, 73.7389], speed: 68 },
  { id: "drone-3", name: "CHAKRA-03",  base: [18.5018, 73.8777], speed: 75 },
  { id: "drone-4", name: "AGNI-04",    base: [18.5362, 73.8939], speed: 70 },
  { id: "drone-5", name: "INDRA-05",   base: [18.5510, 73.9476], speed: 65 },
  { id: "drone-6", name: "SURYA-06",   base: [18.5195, 73.8408], speed: 78 },
  { id: "drone-7", name: "TRISHUL-07", base: [18.5016, 73.8636], speed: 71 },
  { id: "drone-8", name: "KAVERI-08",  base: [18.5204, 73.9314], speed: 74 },
];

// ── Incident Zones (Pune landmarks) ─────────────────────────────────────────

export const INCIDENT_ZONES: IncidentZone[] = [
  { name: "FC Road",       position: [18.5195, 73.8408], riskLevel: "high" },
  { name: "JM Road",       position: [18.5214, 73.8543], riskLevel: "medium" },
  { name: "Koregaon Park", position: [18.5362, 73.8939], riskLevel: "high" },
  { name: "Swargate",      position: [18.5016, 73.8636], riskLevel: "high" },
  { name: "Hinjewadi",     position: [18.5913, 73.7389], riskLevel: "medium" },
  { name: "Shivajinagar",  position: [18.5308, 73.8475], riskLevel: "medium" },
  { name: "Magarpatta",    position: [18.5204, 73.9314], riskLevel: "medium" },
  { name: "Kalyani Nagar", position: [18.5528, 73.9006], riskLevel: "medium" },
  { name: "Camp",          position: [18.5018, 73.8777], riskLevel: "medium" },
  { name: "Kharadi",       position: [18.5510, 73.9476], riskLevel: "medium" },
  { name: "Shaniwar Wada", position: [18.5196, 73.8553], riskLevel: "low" },
  { name: "Pimpri",        position: [18.6298, 73.7997], riskLevel: "low" },
];

// ── No-Fly Zones ─────────────────────────────────────────────────────────────

export const NO_FLY_ZONES: NoFlyZone[] = [
  {
    name: "Lohegaon Airport",
    polygon: [
      [18.5940, 73.9070],
      [18.5940, 73.9320],
      [18.5700, 73.9320],
      [18.5700, 73.9070],
    ],
  },
  {
    name: "NDA Khadakwasla",
    polygon: [
      [18.4360, 73.7570],
      [18.4360, 73.7790],
      [18.4180, 73.7790],
      [18.4180, 73.7570],
    ],
  },
  {
    name: "Southern Command",
    polygon: [
      [18.5225, 73.8740],
      [18.5225, 73.8920],
      [18.5090, 73.8920],
      [18.5090, 73.8740],
    ],
  },
  {
    name: "Bhosari Industrial Belt",
    polygon: [
      [18.6490, 73.8280],
      [18.6490, 73.8520],
      [18.6320, 73.8520],
      [18.6320, 73.8280],
    ],
  },
];

// ── Map config ───────────────────────────────────────────────────────────────

/** Pune metropolitan core — keeps tiles away from Arabian Sea westward drift */
export const MAP_CENTER: LatLng = [18.521, 73.8675];
export const MAP_ZOOM = 12;
/** [[south, west], [north, east]] — relaxed PMR box to allow more panning */
export const MAP_MAX_BOUNDS: [[number, number], [number, number]] = [
  [18.22, 73.56],
  [18.82, 74.18],
];
export const DARK_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

// ── Incident types ───────────────────────────────────────────────────────────

export const INCIDENT_TYPES = [
  "crowd_gathering",
  "road_accident",
  "unauthorized_entry",
  "suspicious_vehicle",
  "abandoned_object",
  "traffic_violation",
] as const;

export type IncidentType = (typeof INCIDENT_TYPES)[number];

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  crowd_gathering: "Crowd Gathering",
  road_accident: "Road Accident",
  unauthorized_entry: "Unauthorized Entry",
  suspicious_vehicle: "Suspicious Vehicle",
  abandoned_object: "Abandoned Object",
  traffic_violation: "Traffic Violation",
};

export const INCIDENT_TYPE_WEIGHTS: Record<IncidentType, number> = {
  road_accident: 0.30,
  crowd_gathering: 0.20,
  traffic_violation: 0.20,
  suspicious_vehicle: 0.15,
  unauthorized_entry: 0.10,
  abandoned_object: 0.05,
};

export type IncidentSeverity = "critical" | "high" | "medium" | "low";

export const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  critical: "#FF4444",
  high: "#FF8C00",
  medium: "#FFD700",
  low: "#C8F23A",
};

// ── Camera feed labels ───────────────────────────────────────────────────────

export interface CameraFeed {
  id: string;
  location: string;
  position: LatLng;
  /** Georestricted / sensitive site — person presence maps to unauthorized_entry via CV pipeline */
  restrictedZone?: boolean;
}

export const CAMERA_FEEDS: CameraFeed[] = [
  // Existing sample-based cameras
  { id: "CAM-FC-01", location: "FC Road", position: [18.5195, 73.8408] },
  { id: "CAM-JM-02", location: "JM Road", position: [18.5214, 73.8543] },
  {
    id: "CAM-KP-03",
    location: "Koregaon Park (restricted)",
    position: [18.5362, 73.8939],
    restrictedZone: true,
  },
  {
    id: "CAM-SW-04",
    location: "Swargate (restricted)",
    position: [18.5016, 73.8636],
    restrictedZone: true,
  },
  // Footage-based cameras (YOLOv8 CV pipeline)
  { id: "CAM-01", location: "JM Road Junction", position: [18.5195, 73.8553] },
  { id: "CAM-02", location: "Hinjewadi Highway", position: [18.5913, 73.7389] },
  { id: "CAM-03", location: "Magarpatta Entry", position: [18.5089, 73.9260] },
  { id: "CAM-04", location: "Kharadi IT Park", position: [18.5512, 73.9442] },
];

export const RESTRICTED_CAMERA_IDS = new Set(
  CAMERA_FEEDS.filter((c) => c.restrictedZone).map((c) => c.id)
);
