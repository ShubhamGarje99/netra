# NETRA — Real Backend

> FastAPI service powering the NETRA drone-surveillance platform.

---

## Architecture

```
backend/
├── Dockerfile              # Python 3.12-slim + OpenCV system deps
├── requirements.txt        # Pinned Python dependencies
└── app/
    ├── __init__.py
    ├── main.py             # FastAPI app, CORS, router registration
    └── routers/
        ├── __init__.py
        ├── drones.py       # REST — drone CRUD
        ├── incidents.py    # REST — incident management
        └── telemetry.py    # WebSocket — real-time telemetry stream
```

---

## API Surface

### REST Endpoints

| Method | Path                     | Description                          |
| ------ | ------------------------ | ------------------------------------ |
| `GET`  | `/health`                | Liveness probe — returns `{"status": "ok"}` |
| `GET`  | `/api/drones/`           | List all registered drones           |
| `GET`  | `/api/drones/{drone_id}` | Get details for a single drone       |
| `GET`  | `/api/incidents/`        | List all reported incidents          |
| `POST` | `/api/incidents/`        | Report a new incident                |

### WebSocket

| Path              | Description                                    |
| ----------------- | ---------------------------------------------- |
| `ws://…/ws/telemetry` | Bi-directional telemetry stream (JSON frames) |

**Telemetry protocol (JSON over WS):**

```jsonc
// Server → Client
{"type": "position", "drone_id": "…", "lat": …, "lng": …, "alt": …}
{"type": "battery",  "drone_id": "…", "level": …}

// Client → Server
{"type": "ping"}
// Server → Client (reply)
{"type": "pong"}
```

---

## Running Locally

### Bare-metal

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Docker (standalone)

```bash
docker build -t netra-backend ./backend
docker run -p 8000:8000 netra-backend
```

### Docker Compose (full stack)

```bash
docker compose up          # frontend :3000  +  backend :8000
docker compose up backend  # backend only
```

---

## Key Dependencies

| Package                   | Version   | Purpose                          |
| ------------------------- | --------- | -------------------------------- |
| `fastapi`                 | 0.115.12  | Web framework                    |
| `uvicorn[standard]`       | 0.34.2    | ASGI server                      |
| `pydantic`                | 2.11.3    | Data validation & serialisation  |
| `websockets`              | 15.0.1    | WebSocket transport              |
| `opencv-python-headless`  | 4.11.0.86 | Video/image processing           |
| `numpy`                   | 2.2.4     | Numerical operations             |
| `httpx`                   | 0.28.1    | Async HTTP client                |

---

## Docker Details

- **Base image:** `python:3.12-slim`
- **System packages:** `libgl1`, `libglib2.0-0` (OpenCV), `curl` (health checks)
- **Runs as:** non-root `appuser` (UID 1001)
- **Port:** `8000`
- **Health check:** `curl -f http://localhost:8000/health`
- **Volume:** `drone-data` mounted at `/app/data`

---

## CORS

The backend accepts requests from `http://localhost:3000` (the Next.js frontend) with credentials, all methods, and all headers.

---

## What's Next

- [ ] Persist drones & incidents to a database (Postgres / SQLite)
- [ ] Add authentication (JWT / API-key)
- [ ] Broadcast live telemetry from drone hardware via the WebSocket
- [ ] Stream MJPEG video feeds through a dedicated endpoint
- [ ] Add structured logging and OpenTelemetry traces
