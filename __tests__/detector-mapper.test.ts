import { describe, it, expect } from "vitest";
import {
  mapDetectorEventToIncident,
  type DetectorEventPayload,
} from "@/lib/server/detector-mapper";

function makeEvent(
  label: string,
  confidence = 0.85,
  cameraId = "CAM-FC-01"
): DetectorEventPayload {
  return {
    sourceType: "yolov8",
    cameraId,
    detections: [{ label, confidence }],
  };
}

describe("detector-mapper", () => {
  // ── Crowd gathering ──────────────────────────────────────
  it("maps 'crowd' to crowd_gathering / high", () => {
    const result = mapDetectorEventToIncident(makeEvent("crowd"));
    expect(result).not.toBeNull();
    expect(result!.ingestPayload.type).toBe("crowd_gathering");
    expect(result!.ingestPayload.severity).toBe("high");
  });

  it("maps 'mob' to crowd_gathering / high", () => {
    const result = mapDetectorEventToIncident(makeEvent("mob"));
    expect(result).not.toBeNull();
    expect(result!.ingestPayload.type).toBe("crowd_gathering");
  });

  // ── Road accident ────────────────────────────────────────
  it("maps 'accident' to road_accident / critical", () => {
    const result = mapDetectorEventToIncident(makeEvent("accident"));
    expect(result).not.toBeNull();
    expect(result!.ingestPayload.type).toBe("road_accident");
    expect(result!.ingestPayload.severity).toBe("critical");
  });

  it("maps 'fallen_person' to road_accident / critical", () => {
    const result = mapDetectorEventToIncident(makeEvent("fallen_person"));
    expect(result).not.toBeNull();
    expect(result!.ingestPayload.type).toBe("road_accident");
    expect(result!.ingestPayload.severity).toBe("critical");
  });

  // ── Unauthorized entry ───────────────────────────────────
  it("maps 'restricted_zone_entry' to unauthorized_entry / critical", () => {
    const result = mapDetectorEventToIncident(makeEvent("restricted_zone_entry"));
    expect(result).not.toBeNull();
    expect(result!.ingestPayload.type).toBe("unauthorized_entry");
    expect(result!.ingestPayload.severity).toBe("critical");
  });

  it("maps 'intrusion' to unauthorized_entry / high", () => {
    const result = mapDetectorEventToIncident(makeEvent("intrusion"));
    expect(result).not.toBeNull();
    expect(result!.ingestPayload.type).toBe("unauthorized_entry");
    expect(result!.ingestPayload.severity).toBe("high");
  });

  // ── Suspicious vehicle ───────────────────────────────────
  it("maps 'vehicle_stop' to suspicious_vehicle / high", () => {
    const result = mapDetectorEventToIncident(makeEvent("vehicle_stop"));
    expect(result).not.toBeNull();
    expect(result!.ingestPayload.type).toBe("suspicious_vehicle");
    expect(result!.ingestPayload.severity).toBe("high");
  });

  // ── Abandoned object ─────────────────────────────────────
  it("maps 'abandoned_object' to abandoned_object / high", () => {
    const result = mapDetectorEventToIncident(makeEvent("abandoned_object"));
    expect(result).not.toBeNull();
    expect(result!.ingestPayload.type).toBe("abandoned_object");
    expect(result!.ingestPayload.severity).toBe("high");
  });

  // ── Traffic violation ────────────────────────────────────
  it("maps 'traffic_violation' to traffic_violation / medium", () => {
    const result = mapDetectorEventToIncident(makeEvent("traffic_violation"));
    expect(result).not.toBeNull();
    expect(result!.ingestPayload.type).toBe("traffic_violation");
    expect(result!.ingestPayload.severity).toBe("medium");
  });

  // ── Edge cases ───────────────────────────────────────────
  it("returns null for empty detections", () => {
    const result = mapDetectorEventToIncident({
      sourceType: "yolov8",
      cameraId: "CAM-FC-01",
      detections: [],
    });
    expect(result).toBeNull();
  });

  it("returns null for an unrecognised label", () => {
    const result = mapDetectorEventToIncident(makeEvent("random_unknown_thing"));
    expect(result).toBeNull();
  });

  it("resolves location from camera registry", () => {
    const result = mapDetectorEventToIncident(makeEvent("crowd", 0.9, "CAM-FC-01"));
    expect(result).not.toBeNull();
    expect(result!.ingestPayload.lat).toBeGreaterThan(18);
    expect(result!.ingestPayload.lng).toBeGreaterThan(73);
    expect(result!.ingestPayload.locationName).toBeDefined();
  });

  it("uses explicit lat/lng when provided", () => {
    const result = mapDetectorEventToIncident({
      sourceType: "yolov8",
      lat: 18.55,
      lng: 73.88,
      detections: [{ label: "accident", confidence: 0.92 }],
    });
    expect(result).not.toBeNull();
    expect(result!.ingestPayload.lat).toBe(18.55);
    expect(result!.ingestPayload.lng).toBe(73.88);
  });

  it("clamps confidence to [0, 1]", () => {
    const result = mapDetectorEventToIncident(makeEvent("crowd", 1.5));
    expect(result).not.toBeNull();
    expect(result!.ingestPayload.detectionConfidence).toBeLessThanOrEqual(1);
  });
});
