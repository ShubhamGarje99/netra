"""Real-time telemetry WebSocket endpoint."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


@router.websocket("/telemetry")
async def telemetry_ws(websocket: WebSocket):
    """
    Stream real-time drone telemetry to connected clients.

    Protocol (JSON over WS):
      → Server sends:  {"type": "position", "drone_id": "...", "lat": ..., "lng": ..., "alt": ...}
      → Server sends:  {"type": "battery",  "drone_id": "...", "level": ...}
      → Client sends:  {"type": "ping"}
      ← Server replies: {"type": "pong"}
    """
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
