"""Drone management endpoints."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_drones():
    """Return all registered drones and their latest status."""
    return []


@router.get("/{drone_id}")
async def get_drone(drone_id: str):
    """Return details for a single drone."""
    return {"drone_id": drone_id}
