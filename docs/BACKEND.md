# NETRA Backend — API Documentation

## Overview

The NETRA backend is a **FastAPI** service that powers the drone surveillance platform. It provides REST endpoints for drone & incident management and a WebSocket channel for real-time telemetry streaming.

| Attribute       | Value                          |
| --------------- | ------------------------------ |
| **Framework**   | FastAPI 0.115                  |
| **Runtime**     | Python 3.12                    |
| **ASGI Server** | Uvicorn                        |
| **Default Port**| `8000`                         |

---

## Quick Start

### Local (without Docker)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### With Docker Compose

```bash
# From the project root
docker compose up --build
```

The frontend will be at `http://localhost:3000` and the backend at `http://localhost:8000`.

---

## API Reference

### Health Check

| Method | Path      | Description            |
| ------ | --------- | ---------------------- |
| `GET`  | `/health` | Returns `{"status": "ok"}` |

### Drones

| Method | Path                | Description                        |
| ------ | ------------------- | ---------------------------------- |
| `GET`  | `/api/drones`       | List all drones with latest status |
| `GET`  | `/api/drones/{id}`  | Get details for a specific drone   |

### Incidents

| Method | Path               | Description               |
| ------ | ------------------ | ------------------------- |
| `GET`  | `/api/incidents`   | List all reported incidents |
| `POST` | `/api/incidents`   | Report a new incident      |

### Telemetry (WebSocket)

| Protocol | Path             | Description                        |
| -------- | ---------------- | ---------------------------------- |
| `WS`     | `/ws/telemetry`  | Real-time drone telemetry stream   |

#### WebSocket Message Protocol

**Server → Client:**

```json
{"type": "position", "drone_id": "alpha-01", "lat": 18.520, "lng": 73.856, "alt": 120.5}
{"type": "battery",  "drone_id": "alpha-01", "level": 87}
```

**Client → Server:**

```json
{"type": "ping"}
```

**Server → Client (reply):**

```json
{"type": "pong"}
```

---

## Project Structure

```
backend/
├── Dockerfile
├── requirements.txt
└── app/
    ├── __init__.py
    ├── main.py              # FastAPI app factory & middleware
    └── routers/
        ├── __init__.py
        ├── drones.py        # /api/drones endpoints
        ├── incidents.py     # /api/incidents endpoints
        └── telemetry.py     # /ws/telemetry WebSocket
```

---

## Environment Variables

| Variable       | Default       | Description                             |
| -------------- | ------------- | --------------------------------------- |
| `ENVIRONMENT`  | `development` | Set to `production` in deployed builds  |
| `PORT`         | `8000`        | Uvicorn listen port                     |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |

---

## Interactive Docs

When running locally, FastAPI auto-generates interactive API docs:

- **Swagger UI** → `http://localhost:8000/docs`
- **ReDoc** → `http://localhost:8000/redoc`
