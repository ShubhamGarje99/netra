import os
import time
import requests
import random
import threading
from ultralytics import YOLO

from stream_server import app, frame_buffer, frame_lock
from inference_pipeline import CameraPipeline

# Camera config for actual footage
CAMERA_SOURCES = {
    "CAM-01": {
        "name": "Incident Zone Alpha",
        "source": "footage/crash1.mp4",
        "lat": 18.5195, "lng": 73.8553,
        "loop": True,
        "start_offset_seconds": 0,
    },
    "CAM-02": {
        "name": "Incident Zone Beta",
        "source": "footage/crash2.mp4",
        "lat": 18.5314, "lng": 73.8446,
        "loop": True,
        "start_offset_seconds": 0,
    },
}

def handle_incident(incident: dict, camera_id: str, config: dict):
    payload = {
        **incident,
        "lat": config["lat"] + random.uniform(-0.003, 0.003),
        "lng": config["lng"] + random.uniform(-0.003, 0.003),
        "locationName": config["name"],
        "camera_id": camera_id,
        "camera_name": config["name"],
        "source": "yolov8_detector",
        "detectionConfidence": incident.get("confidence", 0.85)
    }
    
    try:
        r = requests.post(
            "http://localhost:3000/api/incidents",
            json=payload,
            timeout=3
        )
        print(f"[{camera_id}] → INCIDENT: {incident['type']} "
              f"sev={incident['severity']} conf={incident['confidence']:.2f} "
              f"HTTP {r.status_code}")
    except requests.exceptions.ConnectionError:
        print(f"[{camera_id}] WARNING: Next.js not reachable — "
              f"incident {incident['type']} dropped")
    except Exception as e:
        print(f"[{camera_id}] Dispatch error: {type(e).__name__}: {e}")

def main():
    print("=" * 60)
    print("STARTING NETRA DETECTOR PIPELINE")
    print("=" * 60)
    
    # Check model 
    MODEL_CANDIDATES = ["best.pt", "yolov8n.pt"]
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
    pipelines = {}
    missing_sources = []
    
    for cam_id, config in CAMERA_SOURCES.items():
        if not os.path.exists(config["source"]):
            missing_sources.append(cam_id)
            continue
            
        pipeline = CameraPipeline(
            camera_id=cam_id,
            config=config,
            model=model,
            frame_buffer=frame_buffer,
            frame_lock=frame_lock,
            on_incident=handle_incident
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
