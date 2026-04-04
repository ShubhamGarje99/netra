"""Incident management endpoints."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_incidents():
    """Return all reported incidents."""
    return []


@router.post("/")
async def create_incident():
    """Report a new incident."""
    return {"status": "created"}
