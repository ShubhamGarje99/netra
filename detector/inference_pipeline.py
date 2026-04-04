import threading
import time
import cv2
import os
import numpy as np
from .incident_detector import CrowdGatheringDetector, FireDetector
from .crash_detection_engine import CrashDetectionEngine
from .cooldown import CooldownManager


class CameraPipeline:
    """
    Manages inference for one camera.
    Runs with a two-thread architecture for frame grabbing vs inference sync.
    """

    def __init__(
        self,
        camera_id: str,
        config: dict,
        model,
        frame_buffer: dict,
        frame_lock: threading.Lock,
        on_incident: callable,
    ):
        self.camera_id = camera_id
        self.config = config
        self.model = model
        self.frame_buffer = frame_buffer
        self.frame_lock = frame_lock
        self.on_incident = on_incident  # callback(incident_dict, camera_id, config)

        self.running = False
        self.threads = []
        self.frames_processed = 0
        self.last_error = None

        # Two-thread architecture variables
        self.latest_frame = None  # always the newest raw frame
        self.latest_frame_lock = threading.Lock()
        self.frame_ready = threading.Event()

        # Detectors
        self.crash_detector = CrashDetectionEngine()
        self.crowd_detector = CrowdGatheringDetector()
        self.fire_detector = FireDetector()
        self.cooldown = CooldownManager()

    def start(self):
        self.running = True

        source = self.config["source"]
        if not os.path.exists(source):
            print(f"[{self.camera_id}] ERROR: footage not found at {source}")
            self.last_error = f"File not found: {source}"
            return

        cap = cv2.VideoCapture(source)
        if not cap.isOpened():
            print(f"[{self.camera_id}] ERROR: OpenCV cannot open {source}")
            self.last_error = "OpenCV failed to open source"
            return

        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        offset_frames = int(self.config.get("start_offset_seconds", 0) * fps)
        if offset_frames > 0:
            cap.set(cv2.CAP_PROP_POS_FRAMES, offset_frames)

        print(
            f"[{self.camera_id}] Opened: {source} @ {fps:.1f}fps, seeking to frame {offset_frames}"
        )

        grabber = threading.Thread(
            target=self._frame_grabber_thread,
            args=(cap,),
            daemon=True,
            name=f"grabber-{self.camera_id}",
        )
        inference = threading.Thread(
            target=self._inference_thread,
            daemon=True,
            name=f"inference-{self.camera_id}",
        )
        self.threads = [grabber, inference]
        grabber.start()
        inference.start()
        print(f"[{self.camera_id}] Pipeline started — {self.config['name']}")

    def stop(self):
        self.running = False
        print(
            f"[{self.camera_id}] Pipeline stopped after {self.frames_processed} frames"
        )

    def _frame_grabber_thread(self, cap):
        """
        Thread 1: Runs as fast as possible.
        Only job: read frames from cap, always keep latest_frame current.
        Intentionally drops every frame except the newest.
        This keeps the stream in real-time sync.
        """
        # Sleep exactly framing time of the source to simulate realtime playback from file
        fps = cap.get(cv2.CAP_PROP_FPS)
        sleep_time = 1.0 / fps if fps else 0.033

        offset_frames = int(self.config.get("start_offset_seconds", 0) * fps)
        duration_seconds = self.config.get("duration_seconds")
        max_frame = offset_frames + int(duration_seconds * fps) if duration_seconds else None

        while self.running:
            start_time = time.time()
            ret, frame = cap.read()
            
            current_frame = cap.get(cv2.CAP_PROP_POS_FRAMES)
            duration_exceeded = max_frame and current_frame >= max_frame

            if not ret or duration_exceeded:
                if self.config.get("loop", True):
                    cap.set(cv2.CAP_PROP_POS_FRAMES, offset_frames)
                    continue
                else:
                    self.running = False
                    break
            with self.latest_frame_lock:
                self.latest_frame = (
                    frame  # overwrite — old frame is intentionally dropped
                )
            self.frame_ready.set()

            elapsed = time.time() - start_time
            if elapsed < sleep_time:
                time.sleep(sleep_time - elapsed)

        cap.release()

    def _inference_thread(self):
        """
        Thread 2: Runs at inference rate (~10fps).
        Only job: grab latest_frame and run YOLO on it.
        Never reads from cap directly — decoupled from capture rate.
        """
        while self.running:
            if not self.frame_ready.wait(timeout=1.0):
                continue
            self.frame_ready.clear()

            with self.latest_frame_lock:
                if self.latest_frame is None:
                    continue
                frame = self.latest_frame.copy()

            # Now run inference on frame — no sleep needed,
            # inference itself throttles the loop naturally
            frame = cv2.resize(frame, (640, 480))

            # YOLOv8 inference with tracking
            try:
                results = self.model.track(
                    frame,
                    persist=True,
                    conf=0.25,
                    tracker="bytetrack.yaml",
                    verbose=False,
                )[0]
            except Exception as e:
                print(f"[{self.camera_id}] Inference error: {e}")
                time.sleep(0.5)
                continue

            # Annotate frame
            annotated = results.plot(
                line_width=1, font_size=0.4, labels=True, conf=True
            )

            # Add overlay
            cv2.putText(
                annotated,
                f"{self.camera_id} · {self.config['name']}",
                (8, 20),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.4,
                (0, 255, 178),
                1,
            )
            cv2.putText(
                annotated,
                time.strftime("%H:%M:%S"),
                (8, 470),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.4,
                (0, 255, 178),
                1,
            )

            # Push to frame buffer
            _, jpeg = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
            with self.frame_lock:
                self.frame_buffer[self.camera_id] = jpeg.tobytes()

            # Parse detections
            detections = self._parse_detections(results)

            # Run incident detectors
            incidents = []

            crash = self.crash_detector.process(frame, results, self.model)
            if crash:
                incidents.append(crash)

            crowd = self.crowd_detector.analyze(detections, frame.shape)
            if crowd:
                incidents.append(crowd)

            fire = self.fire_detector.analyze(frame, detections)
            if fire:
                incidents.append(fire)

            # Dispatch with cooldown
            for incident in incidents:
                if self.cooldown.can_fire(self.camera_id, incident["type"]):
                    self.on_incident(incident, self.camera_id, self.config)

            self.frames_processed += 1

            # Log every 100 frames
            if self.frames_processed % 100 == 0:
                detected_classes = [d["class"] for d in detections]
                print(
                    f"[{self.camera_id}] frame={self.frames_processed} "
                    f"detections={len(detections)} classes={set(detected_classes)}"
                )

    def _parse_detections(self, results) -> list[dict]:
        detections = []
        for box in results.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            w = x2 - x1
            h = y2 - y1
            frame_area = 640 * 480
            detections.append(
                {
                    "class": self.model.names[int(box.cls)],
                    "conf": float(box.conf),
                    "bbox": [x1, y1, x2, y2],
                    "area_fraction": (w * h) / frame_area,
                    "centroid": ((x1 + x2) / 2, (y1 + y2) / 2),
                }
            )
        return detections

    def get_status(self) -> dict:
        return {
            "camera_id": self.camera_id,
            "running": self.running,
            "frames_processed": self.frames_processed,
            "streaming": self.camera_id in self.frame_buffer,
            "last_error": self.last_error,
        }
