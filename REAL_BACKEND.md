# NETRA Backend Mode

This project now runs with a server-authoritative simulation runtime, detector ingest endpoints, and PostgreSQL persistence.

## What changed

- Simulation state is generated and owned by backend runtime (`lib/server/simulation-runtime.ts`).
- Dashboard clients subscribe to live server updates via Server-Sent Events.
- Incidents can be ingested from external systems over HTTP (`POST /api/incidents`).
- Detector output can be posted directly (`POST /api/detector/events`) and is mapped to incident taxonomy.
- Runtime snapshots and detector events are persisted in PostgreSQL.
- In multi-instance deployment, one node acquires Postgres advisory lock and acts as leader (tick loop); others run follower mode and stream persisted state.

## Environment

Copy `.env.example` values into your own environment and adjust:

- `DATABASE_URL=postgres://...` to enable durable state.
- `DATABASE_SSL=true` only when your managed Postgres requires TLS.
- `ENABLE_MOCK_GENERATOR=false` to disable random demo incidents.
- `NETRA_INGEST_API_KEY=...` to require API key auth on `POST /api/incidents`.
- `NETRA_DETECTOR_API_KEY=...` to require API key auth on `POST /api/detector/events`.

If `DATABASE_URL` is unset, runtime still works but falls back to single-node in-memory mode.

## API Endpoints

- `GET /api/simulation/state`
  - Returns current running state and simulation snapshot.

- `POST /api/simulation/control`
  - Payload: `{ "action": "start" }` or `{ "action": "stop" }`

- `GET /api/simulation/stream`
  - SSE stream for live simulation updates.

- `POST /api/detector/events`
  - Ingest model/camera detections, auto-map to supported incident classes, and create incidents when mapping is valid.

- `GET /api/incidents`
  - Returns current incident list from backend state.

- `POST /api/incidents`
  - Ingest external incident payload:

```json
{
  "type": "road_accident",
  "severity": "high",
  "lat": 28.6289,
  "lng": 77.2418,
  "locationName": "ITO Junction",
  "description": "Collision detected by camera CAM-ITO-04",
  "detectionConfidence": 0.92,
  "resolveAfterTicks": 45
}
```

## Example ingest request

```bash
curl -X POST http://localhost:3000/api/incidents \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY_IF_CONFIGURED" \
  -d '{
    "type": "road_accident",
    "severity": "high",
    "lat": 28.6289,
    "lng": 77.2418,
    "locationName": "ITO Junction",
    "description": "Collision detected by camera CAM-ITO-04",
    "detectionConfidence": 0.92
  }'
```

## Example detector event request

```bash
curl -X POST http://localhost:3000/api/detector/events \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_DETECTOR_KEY_IF_CONFIGURED" \
  -d '{
    "sourceType": "camera",
    "cameraId": "CAM-ITO-04",
    "detections": [
      { "label": "accident", "confidence": 0.93 }
    ]
  }'
```

Detector mapping supports labels for:

- crowd gathering
- road accident / fallen person
- unauthorized entry
- suspicious vehicle
- abandoned object
- traffic violations

## Production notes

- For production, run Postgres in HA mode and pin all app nodes to the same database.
- If deploying serverless, move tick runtime to a dedicated always-on worker and keep route handlers stateless.
- Add TLS and mTLS between detector services and ingest APIs for secure field deployment.
