# NETRA

NETRA is an advanced drone infrastructure and AI incident detection system designed to automate surveillance, analyze video feeds, and coordinate rapid drone dispatch in real time. It serves as a unified system representing cutting-edge capabilities in computer vision, operations research, server-authoritative simulation, and rich web interfaces.

![NETRA Concept](/public/favicon.ico) *A unified system for automated drone-assisted surveillance and response.*

## Features

- **AI Object & Incident Detection**: Ingests bounding box telemetry and object classifications from physical or simulated camera feeds (yolov8n-based detection patterns).
- **Server-Authoritative Simulation Engine**: Driven by a robust backend ticker that tracks drone locations, models multi-drone dispatch optimizations, and enforces state management.
- **Autonomous Drone Dispatch**: Includes advanced logic (utilizing algorithms like the Hungarian algorithm via `munkres-js`) to efficiently pair available drones to confirmed incidents based on range, battery, and status. Includes charge pod logistics and geofenced routing.
- **Real-Time Dashboard**: Features an expertly crafted layout with smooth visual tracking of incidents using Next.js, React Leaflet for 2D mapping, Three.js 3D capabilities, and real-time Server-Sent Events (SSE).
- **Hardened Backend Pipeline**: Built for production-like HA setup with PostgreSQL ensuring durable simulation snapshots and persistent advisory locking to prevent split-brain on multi-instance setups.

## Technology Stack
- **Frontend**: Next.js 16.2.0, React 19, TypeScript, Tailwind CSS
- **Maps & Vis**: Leaflet (`react-leaflet`), Three.js, Recharts, GSAP, Anime.js, Lenis
- **State**: Zustand
- **Backend**: Node.js (Next.js server routes), PostgreSQL (`pg`), HTTP Event Streams (SSE)
- **Math/Geo Ops**: `polygon-clipping`, `munkres-js`, `heap-js`

## Quick Start

### 1. Requirements
Ensure you have Node.js 20+ installed.

### 2. Configure Environment
Copy the example environment configuration to set up your keys and database bindings.
```bash
cp .env.example .env
```
Ensure that your `.env` contains valid configurations. See `REAL_BACKEND.md` for specific backend architecture options, including TLS configurations and optional api-key checks.

### 3. Installation
Install the project dependencies:
```bash
npm install
```

### 4. Running the Development Server
Start the frontend and backend integrated interface:
```bash
npm run dev
source venv/bin/activate && python main.py      
source detector/venv/bin/activate && python -m detector.main
```

Navigate to [http://localhost:3000](http://localhost:3000) to view the integrated NETRA dashboard.

## Ingest APIs

The application surfaces several integration endpoints to connect with external detectors (e.g. YOLO/PyTorch services):
- **Simulation Control**: `POST /api/simulation/control`
- **Detector Event Ingestion**: `POST /api/detector/events`
- **Direct Incident Ingestion**: `POST /api/incidents`

For detailed payload schemas, check `REAL_BACKEND.md`.

## Testing
Run the suite of automated tests:
```bash
npm run test
```

## Contributing
All development adheres to standard Next.js 16+ practices. Ensure you are familiar with the App Router configuration and Server Actions where applicable. 
