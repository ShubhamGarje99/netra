"""
NETRA — Incident Rule Engine for YOLOv8 detections on Indian roads.

Maps raw YOLO detections to typed incidents with severity levels,
per-camera-per-type cooldowns, and severity escalation.
"""

from __future__ import annotations

import time
from typing import Dict, List


class IncidentRuleEngine:
    """Analyzes per-frame detections and returns structured incident dicts."""

    COOLDOWN_SECONDS = 30

    # Class name groups (matching Roboflow Indian Roads dataset + COCO fallback)
    VEHICLE_CLASSES = {"Car", "Truck", "Bus", "Auto", "Two-wheeler",
                       # COCO fallback names
                       "car", "truck", "bus", "motorcycle"}
    PERSON_CLASSES = {"person", "Person_2", "Person"}
    ANIMAL_CLASSES = {"Animal", "cow", "dog", "horse", "sheep", "cat", "bird", "elephant", "bear"}
    INFORMAL_CLASSES = {"Rikshaw", "Carts"}

    SEVERITY_ORDER = ["low", "medium", "high", "critical"]

    def __init__(self):
        # cooldowns[camera_id][incident_type] = last_fired_timestamp
        self._cooldowns: Dict[str, Dict[str, float]] = {}

    def _escalate(self, severity: str) -> str:
        """Escalate severity one level."""
        idx = self.SEVERITY_ORDER.index(severity)
        if idx < len(self.SEVERITY_ORDER) - 1:
            return self.SEVERITY_ORDER[idx + 1]
        return severity

    def _check_cooldown(self, camera_id: str, incident_type: str) -> bool:
        """Return True if the incident type is NOT in cooldown for this camera."""
        now = time.time()
        cam_cooldowns = self._cooldowns.setdefault(camera_id, {})
        last = cam_cooldowns.get(incident_type, 0.0)
        return (now - last) >= self.COOLDOWN_SECONDS

    def _mark_cooldown(self, camera_id: str, incident_type: str):
        """Record that we just fired this incident type for this camera."""
        self._cooldowns.setdefault(camera_id, {})[incident_type] = time.time()

    def analyze(
        self,
        detections: List[dict],
        frame_shape: tuple,
        camera_id: str,
    ) -> List[dict]:
        """
        Analyze a list of detections and return incident dicts.

        Each detection dict has:
            class: str, conf: float, bbox: [x1,y1,x2,y2], area_fraction: float

        Returns list of incident dicts:
            type, severity, description, confidence, detected_classes, source
        """
        incidents: List[dict] = []

        # Classify detections by group
        vehicles = [d for d in detections if d["class"] in self.VEHICLE_CLASSES]
        persons = [d for d in detections if d["class"] in self.PERSON_CLASSES]
        animals = [d for d in detections if d["class"] in self.ANIMAL_CLASSES]
        informals = [d for d in detections if d["class"] in self.INFORMAL_CLASSES]

        # Rule 1: Any Animal detected → animal_obstruction (high)
        if animals:
            avg_conf = sum(d["conf"] for d in animals) / len(animals)
            classes = list(set(d["class"] for d in animals))
            # Also include any vehicles in the scene for context
            classes.extend(set(d["class"] for d in vehicles[:3]))
            severity = "high"

            # Severity escalation
            if any(d["conf"] > 0.92 and d["area_fraction"] > 0.40 for d in animals):
                severity = self._escalate(severity)

            incidents.append({
                "type": "animal_obstruction",
                "severity": severity,
                "description": f"Animal detected on road — {', '.join(set(d['class'] for d in animals))}",
                "confidence": avg_conf,
                "detected_classes": list(set(classes)),
                "source": "yolov8_detector",
            })

        # Rule 2: Person count >= 3 → pedestrian_crowd (medium)
        if len(persons) >= 3:
            avg_conf = sum(d["conf"] for d in persons) / len(persons)
            classes = list(set(d["class"] for d in persons))
            severity = "medium"

            if any(d["conf"] > 0.92 and d["area_fraction"] > 0.40 for d in persons):
                severity = self._escalate(severity)

            incidents.append({
                "type": "pedestrian_crowd",
                "severity": severity,
                "description": f"Pedestrian crowd detected — {len(persons)} persons visible",
                "confidence": avg_conf,
                "detected_classes": classes,
                "source": "yolov8_detector",
            })

        # Rule 3: Vehicle count >= 10 → traffic_congestion (medium)
        if len(vehicles) >= 10:
            avg_conf = sum(d["conf"] for d in vehicles) / len(vehicles)
            classes = list(set(d["class"] for d in vehicles))
            severity = "medium"

            if any(d["conf"] > 0.92 and d["area_fraction"] > 0.40 for d in vehicles):
                severity = self._escalate(severity)

            incidents.append({
                "type": "traffic_congestion",
                "severity": severity,
                "description": f"Heavy traffic congestion — {len(vehicles)} vehicles detected",
                "confidence": avg_conf,
                "detected_classes": classes,
                "source": "yolov8_detector",
            })

        # Rule 4: Rikshaw or Carts + any person in same frame → informal_vehicle_hazard (low)
        if informals and persons:
            all_dets = informals + persons
            avg_conf = sum(d["conf"] for d in all_dets) / len(all_dets)
            classes = list(set(d["class"] for d in all_dets))
            severity = "low"

            if any(d["conf"] > 0.92 and d["area_fraction"] > 0.40 for d in all_dets):
                severity = self._escalate(severity)

            incidents.append({
                "type": "informal_vehicle_hazard",
                "severity": severity,
                "description": f"Informal vehicle near pedestrians — {', '.join(set(d['class'] for d in informals))}",
                "confidence": avg_conf,
                "detected_classes": classes,
                "source": "yolov8_detector",
            })

        # Rule 5: Truck/Bus with area_fraction > 0.35 and conf > 0.85 → oversized_vehicle_obstruction (high)
        oversized = [
            d for d in detections
            if d["class"] in {"Truck", "Bus", "truck", "bus"}
            and d["area_fraction"] > 0.35
            and d["conf"] > 0.85
        ]
        if oversized:
            avg_conf = sum(d["conf"] for d in oversized) / len(oversized)
            classes = list(set(d["class"] for d in oversized))
            severity = "high"

            if any(d["conf"] > 0.92 and d["area_fraction"] > 0.40 for d in oversized):
                severity = self._escalate(severity)

            incidents.append({
                "type": "oversized_vehicle_obstruction",
                "severity": severity,
                "description": f"Oversized vehicle blocking road — {', '.join(classes)}",
                "confidence": avg_conf,
                "detected_classes": classes,
                "source": "yolov8_detector",
            })

        # Apply cooldowns — only return incidents not in cooldown
        allowed: List[dict] = []
        for inc in incidents:
            if self._check_cooldown(camera_id, inc["type"]):
                self._mark_cooldown(camera_id, inc["type"])
                allowed.append(inc)

        return allowed
