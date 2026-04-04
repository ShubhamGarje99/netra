import time
import cv2
import numpy as np
from collections import deque, defaultdict


class VehicleTracker:
    """
    Tracks vehicles across frames using persistent IDs from YOLO's ByteTrack.
    Maintains velocity history per vehicle for sudden deceleration detection.
    """

    def __init__(self, history=20):
        self.tracks = defaultdict(lambda: deque(maxlen=history))

    def update(self, results, model) -> list[int]:
        current_ids = []
        for box in results.boxes:
            if box.id is None:
                continue
            tid = int(box.id)
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
            self.tracks[tid].append(
                {
                    "centroid": (cx, cy),
                    "class": model.names[int(box.cls)],
                    "conf": float(box.conf),
                    "bbox": [x1, y1, x2, y2],
                    "time": time.time(),
                }
            )
            current_ids.append(tid)
        return current_ids

    def get_velocity(self, track_id: int, window=4) -> float | None:
        history = list(self.tracks[track_id])
        if len(history) < window:
            return None
        recent = history[-window:]
        distances = []
        for i in range(1, len(recent)):
            cx1, cy1 = recent[i - 1]["centroid"]
            cx2, cy2 = recent[i]["centroid"]
            distances.append(np.sqrt((cx2 - cx1) ** 2 + (cy2 - cy1) ** 2))
        return np.mean(distances)

    def velocity_dropped_suddenly(self, track_id: int) -> bool:
        history = list(self.tracks[track_id])
        if len(history) < 8:
            return False

        mid = len(history) // 2

        def avg_vel(segment):
            vels = []
            for i in range(1, len(segment)):
                cx1, cy1 = segment[i - 1]["centroid"]
                cx2, cy2 = segment[i]["centroid"]
                vels.append(np.sqrt((cx2 - cx1) ** 2 + (cy2 - cy1) ** 2))
            return np.mean(vels) if vels else 0

        early_vel = avg_vel(history[:mid])
        late_vel = avg_vel(history[mid:])

        return early_vel > 5.0 and late_vel < 2.0

    def is_stationary(self, track_id: int, frames=5) -> bool:
        history = list(self.tracks[track_id])
        if len(history) < frames:
            return False
        recent = history[-frames:]
        for i in range(1, len(recent)):
            cx1, cy1 = recent[i - 1]["centroid"]
            cx2, cy2 = recent[i]["centroid"]
            if np.sqrt((cx2 - cx1) ** 2 + (cy2 - cy1) ** 2) > 4.0:
                return False
        return True


class MotionAnalyzer:
    """
    Computes frame-to-frame motion scores using OpenCV absolute difference.
    Detects sudden motion spikes that indicate impact events.
    """

    def __init__(self, history=20):
        self.prev_frame_gray = None
        self.motion_history = deque(maxlen=history)

    def update(self, frame) -> dict:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (21, 21), 0)

        result = {"score": 0, "spike": False}

        if self.prev_frame_gray is not None:
            diff = cv2.absdiff(self.prev_frame_gray, gray)
            score = np.mean(diff)
            self.motion_history.append(score)
            result["score"] = score

            if len(self.motion_history) >= 10:
                baseline = np.mean(list(self.motion_history)[:-3])
                result["spike"] = score > baseline * 2.5

        self.prev_frame_gray = gray
        return result

    def recent_spike_detected(self, window=5) -> bool:
        if len(self.motion_history) < window:
            return False
        recent = list(self.motion_history)[-window:]
        baseline = (
            np.mean(list(self.motion_history)[:-window])
            if len(self.motion_history) > window
            else np.mean(self.motion_history)
        )
        return any(s > baseline * 2.0 for s in recent)


class CrashDetectionEngine:
    """
    Sits on top of YOLO. YOLO provides object locations.
    This class provides temporal reasoning for crash detection.

    Signals used:
    1. Sudden deceleration — vehicle was moving, now stopped
    2. Motion spike — frame difference spike indicating impact
    3. Multiple vehicles stopped simultaneously
    4. Stationary object in traffic flow zone
    """

    # Classes our fine-tuned model outputs directly
    CRASH_DIRECT_CLASSES = {"accident", "car-crash", "crash"}
    CRASH_SEVERITY_CLASSES = {"moderate", "severe"}
    CRASH_SEVERITY_MAP = {
        "accident":  ("critical", 0.80),
        "car-crash": ("critical", 0.85),
        "crash":     ("critical", 0.82),
        "moderate":  ("high",     0.70),
        "severe":    ("critical", 0.88),
    }

    # COCO vehicle classes for temporal tracking
    VEHICLE_CLASSES = [
        "car", "truck", "bus", "motorcycle",
        "Car", "Truck", "Bus", "Auto", "Two-wheeler",
        "vehicle",   # our model's generic vehicle class
    ]

    def __init__(self):
        self.tracker = VehicleTracker(history=20)
        self.motion = MotionAnalyzer()
        self.suspicious_ids = {}

    def process(self, frame, results, model) -> dict | None:
        h, w = frame.shape[:2]

        # ── FAST PATH: our fine-tuned model directly detects crash classes ──
        # No temporal reasoning needed — the model IS the crash classifier.
        best_direct = None
        best_direct_conf = 0.0
        for box in results.boxes:
            cls_name = model.names[int(box.cls)]
            conf = float(box.conf)
            if cls_name in self.CRASH_DIRECT_CLASSES or cls_name in self.CRASH_SEVERITY_CLASSES:
                if conf > best_direct_conf:
                    best_direct_conf = conf
                    best_direct = cls_name

        if best_direct and best_direct_conf >= 0.25:
            severity, base_conf = self.CRASH_SEVERITY_MAP.get(
                best_direct, ("critical", 0.75)
            )
            confidence = round(min(0.97, base_conf * (0.7 + best_direct_conf * 0.3)), 3)
            return {
                "type": "vehicle_collision",
                "severity": severity,
                "description": f"Crash detected: {best_direct} (model confidence {best_direct_conf:.0%})",
                "confidence": confidence,
                "detected_classes": [best_direct],
            }

        # ── SLOW PATH: temporal deceleration logic for COCO-class vehicles ──
        active_ids = self.tracker.update(results, model)
        motion    = self.motion.update(frame)

        vehicle_ids = [
            tid
            for tid in active_ids
            if self.tracker.tracks[tid]
            and self.tracker.tracks[tid][-1]["class"] in self.VEHICLE_CLASSES
        ]

        for tid in vehicle_ids:
            latest = self.tracker.tracks[tid][-1]
            cx, cy = latest["centroid"]

            if cy < h * 0.35:
                continue

            if self.tracker.velocity_dropped_suddenly(tid):
                if tid not in self.suspicious_ids:
                    self.suspicious_ids[tid] = time.time()

                stopped_duration = time.time() - self.suspicious_ids[tid]

                recent_spike = self.motion.recent_spike_detected(window=5)

                multiple_stopped = (
                    sum(1 for t in vehicle_ids if t in self.suspicious_ids) >= 2
                )

                if stopped_duration > 1.0 and (recent_spike or multiple_stopped):
                    conf = min(
                        0.95,
                        0.6 + (0.1 * stopped_duration) + (0.15 if recent_spike else 0),
                    )
                    return {
                        "type": "vehicle_collision",
                        "severity": "critical",
                        "description": f"Vehicle collision — sudden stop confirmed, "
                        f"{'impact spike detected' if recent_spike else 'multiple vehicles stopped'}",
                        "confidence": round(conf, 3),
                        "detected_classes": [latest["class"]],
                    }
            else:
                self.suspicious_ids.pop(tid, None)

        return None

    def reset(self):
        self.tracker.tracks.clear()
        self.motion.motion_history.clear()
        self.suspicious_ids.clear()
