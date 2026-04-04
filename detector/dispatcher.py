"""
NETRA — Incident Dispatcher.

Posts CV-detected incidents to the NETRA dashboard API.
Uses the existing /api/detector/events endpoint format for seamless integration.
"""

from __future__ import annotations

import random
from typing import Dict, List

import httpx

# Post to the existing detector events endpoint (not /api/incidents)
NETRA_DETECTOR_EVENTS_URL = "http://localhost:3000/api/detector/events"


# Map CV rule engine types to detector-mapper labels understood by the existing pipeline
INCIDENT_TYPE_TO_LABEL = {
    "animal_obstruction": "crowd",  # Maps to crowd_gathering → will show on dashboard
    "pedestrian_crowd": "crowd",
    "traffic_congestion": "traffic_violation",
    "informal_vehicle_hazard": "suspicious_vehicle",
    "oversized_vehicle_obstruction": "vehicle_stop",
}


def dispatch_incident(
    incident: dict,
    camera_id: str,
    camera_config: dict,
    client: httpx.Client | None = None,
) -> None:
    """
    Post an incident to the NETRA dashboard.

    Args:
        incident: Dict from IncidentRuleEngine.analyze() with keys:
            type, severity, description, confidence, detected_classes, source
        camera_id: e.g. "CAM-01"
        camera_config: Dict with lat, lng, name keys
        client: Optional httpx.Client to reuse connections
    """
    # Small random offset so incidents from same camera don't stack on exact same point
    lat = camera_config["lat"] + random.uniform(-0.003, 0.003)
    lng = camera_config["lng"] + random.uniform(-0.003, 0.003)

    # Map to a label the existing detector-mapper understands
    mapped_label = INCIDENT_TYPE_TO_LABEL.get(incident["type"], incident["type"])

    payload = {
        "sourceType": "yolov8",
        "cameraId": camera_id,
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        "detections": [
            {
                "label": mapped_label,
                "confidence": round(incident["confidence"], 3),
            }
        ],
    }

    own_client = client is None
    if own_client:
        client = httpx.Client(timeout=3.0)

    try:
        r = client.post(NETRA_DETECTOR_EVENTS_URL, json=payload)
        print(
            f"[{camera_id}] Dispatched {incident['type']} "
            f"(→ {mapped_label}) · conf={incident['confidence']:.2f} "
            f"· status={r.status_code}"
        )
    except Exception as e:
        print(f"[{camera_id}] Dispatch failed: {e}")
    finally:
        if own_client:
            client.close()
