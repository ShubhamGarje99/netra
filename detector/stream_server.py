from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import cv2, threading, time
import numpy as np

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], 
                   allow_methods=["*"], allow_headers=["*"])

# Thread-safe frame buffer
frame_lock = threading.Lock()
frame_buffer: dict[str, bytes] = {}  # camera_id → latest JPEG bytes

def encode_frame(frame: np.ndarray) -> bytes:
    """Encode BGR frame to JPEG bytes."""
    _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    return buf.tobytes()

def mjpeg_generator(camera_id: str):
    """Yields MJPEG boundary frames. Blocks gracefully if no frame yet."""
    consecutive_misses = 0
    while True:
        with frame_lock:
            frame_bytes = frame_buffer.get(camera_id)
        
        if frame_bytes is None:
            consecutive_misses += 1
            if consecutive_misses == 1:
                # Send a placeholder frame so browser img tag doesn't break
                placeholder = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(placeholder, f"AWAITING {camera_id}", 
                           (180, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 178), 1)
                frame_bytes = encode_frame(placeholder)
            else:
                time.sleep(0.1)
                continue
        else:
            consecutive_misses = 0
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n'
               + frame_bytes + b'\r\n')
        time.sleep(0.033)  # ~30fps serve rate

@app.get("/stream/{camera_id}")
async def stream(camera_id: str):
    return StreamingResponse(
        mjpeg_generator(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )

@app.get("/snapshot/{camera_id}")
async def snapshot(camera_id: str):
    """Single JPEG frame — useful for testing without a browser."""
    with frame_lock:
        frame_bytes = frame_buffer.get(camera_id)
    if not frame_bytes:
        return {"error": f"No frame for {camera_id}"}
    from fastapi.responses import Response
    return Response(content=frame_bytes, media_type="image/jpeg")

@app.get("/health")
async def health():
    with frame_lock:
        cameras_active = list(frame_buffer.keys())
    return {"status": "online", "active_cameras": cameras_active, "count": len(cameras_active)}

if __name__ == "__main__":
    import sys
    if "--test" in sys.argv:
        # Inject fake frames for CAM-01 every 100ms
        def fake_feed():
            i = 0
            while True:
                frame = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(frame, f"TEST FRAME {i}", (200, 240), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 178), 2)
                with frame_lock:
                    frame_buffer["CAM-01"] = encode_frame(frame)
                i += 1
                time.sleep(0.1)
        
        t = threading.Thread(target=fake_feed, daemon=True)
        t.start()
        print("Test mode: open http://localhost:5001/stream/CAM-01 in browser")
        print("You should see a black frame with incrementing counter")
    
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001, log_level="info")
