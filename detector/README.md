# NETRA Detector Service

## Setup
```bash
pip install -r requirements.txt
```

## Download footage (run once)
```bash
python setup_footage.py
```

## Check footage exists
```bash
python check_footage.py
```

## Start service
```bash
python main.py
# Runs on http://localhost:8000
```

Or use the convenience script:
```bash
bash start.sh
```

## Endpoints

| Endpoint | Description |
|---|---|
| `GET /health` | Camera status + model info |
| `GET /status` | Detailed runtime status |
| `GET /stream/{id}` | MJPEG stream (CAM-FC-01 through CAM-SW-04 for samples, CAM-01 through CAM-04 for footage) |
| `GET /stream/drone/{id}` | Drone POV MJPEG stream |

## Camera IDs

### Sample-based (existing)
- `CAM-FC-01` — FC Road
- `CAM-JM-02` — JM Road
- `CAM-KP-03` — Koregaon Park (restricted)
- `CAM-SW-04` — Swargate (restricted)

### Footage-based (YOLOv8 CV pipeline)
- `CAM-01` — JM Road Junction
- `CAM-02` — Hinjewadi Highway
- `CAM-03` — Magarpatta Entry
- `CAM-04` — Kharadi IT Park

## Model
- Uses `yolov8n.pt` (auto-downloads if not present)
- Place `best.pt` (Roboflow Indian roads YOLOv8 weights) in this directory for better detection on Indian traffic

## Architecture
- Sample cameras: On-demand MJPEG stream per HTTP request
- Footage cameras: Background inference threads that populate a shared frame buffer
- Rule engine: Analyzes detections for animal obstruction, pedestrian crowd, traffic congestion, etc.
- Dispatcher: Posts incidents to the NETRA dashboard via `/api/detector/events`
