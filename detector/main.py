import os
import time
import requests
import random
import threading
from ultralytics import YOLO

from .stream_server import app, frame_buffer, frame_lock
from .inference_pipeline import CameraPipeline

# Camera config for actual footage — positions spread across Pune metro
CAMERA_SOURCES = {
    "CAM-01": {
        "name": "Shivajinagar",
        "source": "footage/crash2.mp4",
        "lat": 18.5308,
        "lng": 73.8475,
        "loop": True,
        "start_offset_seconds": 10,
    },
    "CAM-02": {
        "name": "Hinjewadi Highway",
        "source": "footage/crash2.mp4",
        "lat": 18.5913,
        "lng": 73.7389,
        "loop": True,
        "start_offset_seconds": 0,
    },
    "CAM-03": {
        "name": "Magarpatta Entry",
        "source": "footage/fire1.mp4",
        "lat": 18.5089,
        "lng": 73.9260,
        "loop": True,
        "start_offset_seconds": 0,
    },
    "CAM-04": {
        "name": "Kharadi IT Park",
        "source": "footage/fire2.mp4",
        "lat": 18.5512,
        "lng": 73.9442,
        "loop": True,
        "start_offset_seconds": 0,
    },
    "CAM-05": {
        "name": "Swargate Junction",
        "source": "footage/crash3.mp4",
        "lat": 18.5016,
        "lng": 73.8636,
        "loop": True,
        "start_offset_seconds": 0,
        "duration_seconds": 15,
    },
    "CAM-06": {
        "name": "Pimpri-Chinchwad",
        "source": "footage/crowd1.mp4",
        "lat": 18.6298,
        "lng": 73.7997,
        "loop": True,
        "start_offset_seconds": 0,
    },
    "CAM-07": {
        "name": "Hadapsar",
        "source": "footage/crowd2.mp4",
        "lat": 18.5072,
        "lng": 73.9358,
        "loop": True,
        "start_offset_seconds": 0,
    },
}


# Maps detector internal types → Next.js IncidentType enum
TYPE_MAP = {
    "vehicle_collision": "road_accident",
    "crowd":             "crowd_gathering",
    "restricted_gathering": "crowd_gathering",
    "accident":          "road_accident",
    "intrusion":         "unauthorized_entry",
    "restricted_zone_entry": "unauthorized_entry",
    "suspicious_vehicle": "suspicious_vehicle",
    "abandoned_static":  "abandoned_object",
    "abandoned_object":  "abandoned_object",
    "vehicle_stop":      "suspicious_vehicle",
    "traffic_violation": "traffic_violation",
    "fallen_person":     "unauthorized_entry",
    "fire":              "fire_breakout",
    "fire_detected":     "fire_breakout",
}

# Maps detector severity → valid API severity
SEVERITY_MAP = {
    "critical": "critical",
    "high":     "high",
    "medium":   "medium",
    "low":      "low",
    # detector may send these
    "severe":   "critical",
    "moderate": "medium",
}


def handle_incident(incident: dict, camera_id: str, config: dict):
    api_type     = TYPE_MAP.get(incident.get("type", ""), "road_accident")
    api_severity = SEVERITY_MAP.get(incident.get("severity", "high"), "high")

    payload = {
        "type":               api_type,
        "severity":           api_severity,
        "lat":                config["lat"] + random.uniform(-0.003, 0.003),
        "lng":                config["lng"] + random.uniform(-0.003, 0.003),
        "locationName":       config["name"],
        "description":        incident.get("description", f"Detected: {incident.get('type', 'incident')}"),
        "source":             "yolov8_detector",
        "camera_id":          camera_id,
        "camera_name":        config["name"],
        "detectionConfidence": incident.get("confidence", 0.75),
        "detected_classes":   incident.get("detected_classes", []),
    }

    try:
        r = requests.post(
            "http://localhost:3000/api/incidents", json=payload, timeout=3
        )
        print(
            f"[{camera_id}] → INCIDENT: {incident['type']} "
            f"sev={incident['severity']} conf={incident['confidence']:.2f} "
            f"HTTP {r.status_code}"
        )
    except requests.exceptions.ConnectionError:
        print(
            f"[{camera_id}] WARNING: Next.js not reachable — "
            f"incident {incident['type']} dropped"
        )
    except Exception as e:
        print(f"[{camera_id}] Dispatch error: {type(e).__name__}: {e}")


def main():
    # Resolve paths relative to the detector package directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    print("=" * 60)
    print("STARTING NETRA DETECTOR PIPELINE")
    print("=" * 60)

    # Check model
    MODEL_CANDIDATES = [
        "runs/train/car_crash_v1/weights/best.pt",  # fine-tuned crash model
        "best.pt",                                   # fallback in cwd
        "yolov8n.pt",                                # generic COCO fallback
    ]
    model_path = None
    model = None
    for path in MODEL_CANDIDATES:
        if os.path.exists(path) or path == "yolov8n.pt":
            try:
                model = YOLO(path)
                model_path = path
                break
            except:
                pass

    if not model:
        print("CRITICAL: Failed to load any YOLO model.")
        return

    device = model.device.type

    # Check footage and init pipelines
    # CRITICAL: Each pipeline needs its OWN model instance.
    # ByteTrack's persist=True maintains internal state — sharing a model
    # across threads corrupts the tracker state (IDs reset every frame).
    pipelines = {}
    missing_sources = []

    for cam_id, config in CAMERA_SOURCES.items():
        if not os.path.exists(config["source"]):
            missing_sources.append(cam_id)
            continue

        # Clone the model for this pipeline so ByteTrack state is isolated
        cam_model = YOLO(model_path)

        pipeline = CameraPipeline(
            camera_id=cam_id,
            config=config,
            model=cam_model,
            frame_buffer=frame_buffer,
            frame_lock=frame_lock,
            on_incident=handle_incident,
        )
        pipelines[cam_id] = pipeline

    print("\n   NETRA DETECTOR STATUS")
    print("   " + "─" * 41)
    print(f"   Model:    {model_path} on {device.upper()}")

    cam_status_str = ""
    for cam_id in CAMERA_SOURCES:
        if cam_id in pipelines:
            cam_status_str += f"{cam_id} ✓ streaming  "
        else:
            cam_status_str += f"{cam_id} ✗ no footage "
    print(f"   Cameras:  {cam_status_str}")

    print("   Incidents: POST → http://localhost:3000/api/incidents")
    print("   Stream:    http://localhost:5001/stream/{camera_id}")
    print("   Health:    http://localhost:5001/health")
    print("   " + "─" * 41 + "\n")

    # Start active pipelines
    for pipeline in pipelines.values():
        pipeline.start()

    # Start stream server
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=5001, log_level="error")


if __name__ == "__main__":
    main()
