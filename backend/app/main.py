"""
NETRA Backend — FastAPI application entry point.

Provides REST + WebSocket APIs for drone telemetry,
incident management, and video-feed relay.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import drones, incidents, telemetry

app = FastAPI(
    title="NETRA API",
    version="0.1.0",
    description="Backend services for the NETRA drone surveillance platform.",
)

# ── CORS ────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health check ────────────────────────────────────────────────────────
@app.get("/health", tags=["ops"])
async def health():
    return {"status": "ok"}


# ── Register routers ───────────────────────────────────────────────────
app.include_router(drones.router,    prefix="/api/drones",    tags=["drones"])
app.include_router(incidents.router, prefix="/api/incidents", tags=["incidents"])
app.include_router(telemetry.router, prefix="/ws",            tags=["telemetry"])
