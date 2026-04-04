from __future__ import annotations

import math
import os
import time
from dataclasses import dataclass
from typing import Dict, List


def _preset_cpu_threads() -> None:
    n = (os.getenv("DETECTOR_CPU_THREADS") or "2").strip() or "2"
    for key in (
        "OMP_NUM_THREADS",
        "MKL_NUM_THREADS",
        "OPENBLAS_NUM_THREADS",
        "NUMEXPR_NUM_THREADS",
        "VECLIB_MAXIMUM_THREADS",
    ):
        os.environ.setdefault(key, n)


_preset_cpu_threads()

import cv2
import httpx
import numpy as np
from ultralytics import YOLO

NETRA_LABEL_COOLDOWN_SECONDS = 30
PERSON_CLASS = "person"
VEHICLE_CLASSES = {"car", "truck", "bus", "motorcycle"}
BAG_CLASSES = {"suitcase", "backpack", "handbag"}
FALLBACK_OBJECT_CLASSES = {
    "sports ball",
    "bottle",
    "cell phone",
    "book",
    "chair",
}

DETECTOR_CONFIRM_FRAMES = max(1, int(os.getenv("DETECTOR_CONFIRM_FRAMES", "2")))
STATIONARY_VEHICLE_SECONDS = float(os.getenv("DETECTOR_VEHICLE_STOP_SECONDS", "10"))
STATIONARY_BAG_SECONDS = float(os.getenv("DETECTOR_ABANDONED_STATIONARY_SECONDS", "5"))
DETECTOR_IMG_SIZE = max(160, int(os.getenv("DETECTOR_IMG_SIZE", "416")))
DETECTOR_ENABLE_POSE = os.getenv("DETECTOR_ENABLE_POSE", "false").lower() in (
    "1",
    "true",
    "yes",
)
VEHICLE_MATCH_PX = 56.0
VEHICLE_ANCHOR_PX = 24.0
BAG_MATCH_PX = 45.0
BAG_ANCHOR_PX = 20.0
PERSON_NEAR_BAG_PX = 100.0


@dataclass
class Detection:
    class_name: str
    confidence: float
    bbox: List[float]


@dataclass
class IncidentSignal:
    label: str
    confidence: float


def _center(box: List[float]) -> tuple[float, float]:
    return ((box[0] + box[2]) / 2.0, (box[1] + box[3]) / 2.0)


def _distance(a: List[float], b: List[float]) -> float:
    ax, ay = _center(a)
    bx, by = _center(b)
    return math.hypot(ax - bx, ay - by)


def map_to_incidents(detections: List[Detection], restricted: bool) -> List[IncidentSignal]:
    people = [d for d in detections if d.class_name == PERSON_CLASS]
    vehicles = [d for d in detections if d.class_name in VEHICLE_CLASSES]
    bags = [d for d in detections if d.class_name in BAG_CLASSES]
    incidents: List[IncidentSignal] = []

    if len(people) >= 5:
        if restricted:
            incidents.append(
                IncidentSignal(
                    label="restricted_gathering",
                    confidence=sum(det.confidence for det in people) / len(people),
                )
            )
        else:
            incidents.append(
                IncidentSignal(
                    label="crowd",
                    confidence=sum(det.confidence for det in people) / len(people),
                )
            )

    if people and vehicles:
        overlap_found = any(_distance(p.bbox, v.bbox) <= 120 for p in people for v in vehicles)
        if overlap_found:
            incidents.append(
                IncidentSignal(
                    label="accident",
                    confidence=max(min(p.confidence, v.confidence) for p in people for v in vehicles),
                )
            )

    # Abandoned luggage: require temporal stability (see stationary_bag_signals) — not instant bbox-only.

    if vehicles and not people:
        incidents.append(
            IncidentSignal(
                label="suspicious_vehicle",
                confidence=max(v.confidence for v in vehicles),
            )
        )

    if len(vehicles) >= 6:
        incidents.append(
            IncidentSignal(
                label="traffic_violation",
                confidence=sum(v.confidence for v in vehicles) / len(vehicles),
            )
        )

    if restricted and 1 <= len(people) < 5:
        incidents.append(
            IncidentSignal(
                label="restricted_zone_entry",
                confidence=sum(det.confidence for det in people) / len(people),
            )
        )
    elif not restricted and len(people) == 1 and len(vehicles) <= 1:
        incidents.append(
            IncidentSignal(
                label="intrusion",
                confidence=people[0].confidence,
            )
        )

    if not incidents and detections:
        strongest = max(detections, key=lambda det: det.confidence)
        if strongest.class_name in VEHICLE_CLASSES:
            incidents.append(IncidentSignal(label="suspicious_vehicle", confidence=strongest.confidence))
        elif strongest.class_name == PERSON_CLASS:
            label = "restricted_zone_entry" if restricted else "intrusion"
            incidents.append(IncidentSignal(label=label, confidence=strongest.confidence))
        elif strongest.class_name in BAG_CLASSES or strongest.class_name in FALLBACK_OBJECT_CLASSES:
            incidents.append(IncidentSignal(label="abandoned_object", confidence=strongest.confidence))

    dedup: Dict[str, IncidentSignal] = {}
    for incident in incidents:
        current = dedup.get(incident.label)
        if current is None or incident.confidence > current.confidence:
            dedup[incident.label] = incident
    return list(dedup.values())


class DetectorEngine:
    def __init__(self, conf_threshold: float = 0.35, input_size: int | None = None) -> None:
        try:
            import torch

            threads = max(1, int((os.getenv("DETECTOR_CPU_THREADS") or "2").strip() or "2"))
            torch.set_num_threads(threads)
            try:
                torch.set_num_interop_threads(1)
            except Exception:
                pass
        except Exception:
            pass

        self.model = YOLO("yolov8n.pt")
        self.pose_model: YOLO | None = None
        if DETECTOR_ENABLE_POSE:
            try:
                self.pose_model = YOLO("yolov8n-pose.pt")
            except Exception:
                self.pose_model = None

        self.conf_threshold = conf_threshold
        self.input_size = int(input_size) if input_size is not None else DETECTOR_IMG_SIZE
        self.cooldowns: Dict[str, Dict[str, float]] = {}
        self.label_streaks: Dict[str, Dict[str, int]] = {}
        self._vehicle_tracks: Dict[str, List[dict]] = {}
        self._bag_tracks: Dict[str, List[dict]] = {}
        self._last_infer_wall: Dict[str, float] = {}
        self._bag_gray_prev: Dict[str, np.ndarray] = {}

    def infer(self, frame) -> tuple[List[Detection], object]:
        results = self.model.predict(
            source=frame,
            conf=self.conf_threshold,
            imgsz=self.input_size,
            verbose=False,
        )

        detections: List[Detection] = []
        for result in results:
            for box in result.boxes:
                cls_id = int(box.cls[0])
                cls_name = self.model.names[cls_id]
                conf = float(box.conf[0])
                x1, y1, x2, y2 = [float(v) for v in box.xyxy[0].tolist()]
                detections.append(
                    Detection(
                        class_name=cls_name,
                        confidence=conf,
                        bbox=[x1, y1, x2, y2],
                    )
                )

        return detections, results[0]

    def fallen_signals(self, frame, detections: List[Detection]) -> List[IncidentSignal]:
        people = [d for d in detections if d.class_name == PERSON_CLASS]
        if not people:
            return []

        candidates: List[IncidentSignal] = []

        if self.pose_model is not None:
            try:
                pose_results = self.pose_model.predict(
                    source=frame,
                    conf=max(0.28, self.conf_threshold),
                    imgsz=self.input_size,
                    verbose=False,
                )[0]
                if pose_results.keypoints is not None and pose_results.boxes is not None:
                    kxy = pose_results.keypoints.xy
                    if kxy is not None and len(kxy) > 0:
                        arr = kxy.cpu().numpy()
                        confs = pose_results.boxes.conf.cpu().numpy()
                        for i in range(len(arr)):
                            k = arr[i]

                            def pt(idx: int) -> tuple[float, float] | None:
                                if idx >= len(k):
                                    return None
                                x, y = float(k[idx][0]), float(k[idx][1])
                                if x < 1.0 or y < 1.0:
                                    return None
                                return (x, y)

                            ls, rs = pt(5), pt(6)
                            lh, rh = pt(11), pt(12)
                            if not (ls and rs and lh and rh):
                                continue
                            sx = (ls[0] + rs[0]) / 2
                            sy = (ls[1] + rs[1]) / 2
                            hx = (lh[0] + rh[0]) / 2
                            hy = (lh[1] + rh[1]) / 2
                            dx = hx - sx
                            dy = hy - sy
                            horiz_ratio = abs(dx) / (abs(dy) + 1e-6)
                            if horiz_ratio > 0.82 and abs(dy) < max(72.0, abs(dx) * 0.5):
                                pconf = float(confs[i]) if i < len(confs) else 0.65
                                candidates.append(
                                    IncidentSignal(label="fallen_person", confidence=min(0.95, pconf * 0.92))
                                )
            except Exception:
                pass

        for p in people:
            x1, y1, x2, y2 = p.bbox
            w = max(1.0, x2 - x1)
            h = max(1.0, y2 - y1)
            if w / h >= 1.38:
                candidates.append(
                    IncidentSignal(label="fallen_person", confidence=min(0.88, p.confidence * 0.82))
                )

        if not candidates:
            return []
        best = max(candidates, key=lambda s: s.confidence)
        return [best]

    def stationary_vehicle_signals(
        self, camera_id: str, vehicles: List[Detection], infer_dt: float
    ) -> List[IncidentSignal]:
        pool = list(self._vehicle_tracks.get(camera_id, []))
        new_tracks: List[dict] = []
        signals: List[IncidentSignal] = []

        for v in vehicles:
            cx, cy = _center(v.bbox)
            best_i = None
            best_d = 1e9
            for i, tr in enumerate(pool):
                d = math.hypot(cx - tr["cx"], cy - tr["cy"])
                if d < VEHICLE_MATCH_PX and d < best_d:
                    best_d = d
                    best_i = i

            if best_i is None:
                new_tracks.append(
                    {
                        "cx": cx,
                        "cy": cy,
                        "ax": cx,
                        "ay": cy,
                        "stable_s": 0.0,
                        "conf": v.confidence,
                    }
                )
                continue

            tr = pool.pop(best_i)
            tr["cx"], tr["cy"] = cx, cy
            tr["conf"] = max(tr["conf"], v.confidence)
            da = math.hypot(cx - tr["ax"], cy - tr["ay"])
            if da <= VEHICLE_ANCHOR_PX:
                tr["stable_s"] += infer_dt
            else:
                tr["ax"], tr["ay"] = cx, cy
                tr["stable_s"] = 0.0

            if tr["stable_s"] >= STATIONARY_VEHICLE_SECONDS:
                signals.append(
                    IncidentSignal(label="vehicle_stop", confidence=min(0.95, tr["conf"] * 0.94))
                )
                tr["stable_s"] = 0.0

            new_tracks.append(tr)

        self._vehicle_tracks[camera_id] = new_tracks
        return signals

    def stationary_bag_signals(
        self, camera_id: str, detections: List[Detection], frame, infer_dt: float
    ) -> List[IncidentSignal]:
        bags = [d for d in detections if d.class_name in BAG_CLASSES]
        people = [d for d in detections if d.class_name == PERSON_CLASS]
        if not bags:
            self._bag_tracks[camera_id] = []
            return []

        pool = list(self._bag_tracks.get(camera_id, []))
        new_tracks: List[dict] = []
        signals: List[IncidentSignal] = []

        for b in bags:
            if any(_distance(b.bbox, p.bbox) < PERSON_NEAR_BAG_PX for p in people):
                continue

            cx, cy = _center(b.bbox)
            x1, y1, x2, y2 = [int(v) for v in b.bbox]
            h, w = frame.shape[:2]
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)
            gray_new = None
            if x2 > x1 and y2 > y1:
                gray_new = cv2.cvtColor(frame[y1:y2, x1:x2], cv2.COLOR_BGR2GRAY)

            key = f"{camera_id}:{int(cx // 40)}:{int(cy // 40)}"

            best_i = None
            best_d = 1e9
            for i, tr in enumerate(pool):
                d = math.hypot(cx - tr["cx"], cy - tr["cy"])
                if d < BAG_MATCH_PX and d < best_d:
                    best_d = d
                    best_i = i

            if best_i is None:
                new_tracks.append(
                    {
                        "cx": cx,
                        "cy": cy,
                        "ax": cx,
                        "ay": cy,
                        "stable_s": 0.0,
                        "conf": b.confidence,
                        "k": key,
                    }
                )
                if gray_new is not None:
                    self._bag_gray_prev[key] = gray_new.copy()
                continue

            tr = pool.pop(best_i)
            tr["cx"], tr["cy"] = cx, cy
            tr["conf"] = max(tr["conf"], b.confidence)
            tr_key = str(tr.get("k", key))
            prev_gray = self._bag_gray_prev.get(tr_key)

            motion_high = False
            if gray_new is not None and prev_gray is not None and prev_gray.shape == gray_new.shape:
                if float(np.mean(cv2.absdiff(prev_gray, gray_new))) > 7.5:
                    motion_high = True
            if gray_new is not None:
                self._bag_gray_prev[tr_key] = gray_new.copy()
            tr["k"] = tr_key

            da = math.hypot(cx - tr["ax"], cy - tr["ay"])
            if motion_high or da > BAG_ANCHOR_PX:
                tr["ax"], tr["ay"] = cx, cy
                tr["stable_s"] = 0.0
            else:
                tr["stable_s"] += infer_dt

            if tr["stable_s"] >= STATIONARY_BAG_SECONDS:
                signals.append(
                    IncidentSignal(label="abandoned_static", confidence=min(0.93, tr["conf"] * 0.91))
                )
                tr["stable_s"] = 0.0

            new_tracks.append(tr)

        self._bag_tracks[camera_id] = new_tracks
        return signals

    def annotate(self, frame, detections: List[Detection], camera_id: str):
        annotated = frame.copy()
        for det in detections:
            x1, y1, x2, y2 = [int(v) for v in det.bbox]
            cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 220, 140), 2)
            label_text = f"{det.class_name} {det.confidence:.2f}"
            cv2.putText(
                annotated,
                label_text,
                (x1, max(14, y1 - 8)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (0, 220, 140),
                1,
                cv2.LINE_AA,
            )

        cv2.putText(
            annotated,
            camera_id,
            (10, 18),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (0, 255, 255),
            1,
            cv2.LINE_AA,
        )
        return annotated

    def incidents_for_camera(
        self, camera_id: str, restricted: bool, frame, detections: List[Detection]
    ) -> List[IncidentSignal]:
        now = time.time()
        prev_wall = self._last_infer_wall.get(camera_id, now)
        infer_dt = min(4.0, max(0.0, now - prev_wall))
        self._last_infer_wall[camera_id] = now

        merged_map: Dict[str, IncidentSignal] = {}

        vehicles = [d for d in detections if d.class_name in VEHICLE_CLASSES]
        for s in self.stationary_vehicle_signals(camera_id, vehicles, infer_dt):
            cur = merged_map.get(s.label)
            if cur is None or s.confidence > cur.confidence:
                merged_map[s.label] = s

        for s in self.stationary_bag_signals(camera_id, detections, frame, infer_dt):
            cur = merged_map.get(s.label)
            if cur is None or s.confidence > cur.confidence:
                merged_map[s.label] = s

        for s in map_to_incidents(detections, restricted):
            cur = merged_map.get(s.label)
            if cur is None or s.confidence > cur.confidence:
                merged_map[s.label] = s

        for s in self.fallen_signals(frame, detections):
            cur = merged_map.get(s.label)
            if cur is None or s.confidence > cur.confidence:
                merged_map[s.label] = s

        if "vehicle_stop" in merged_map:
            merged_map.pop("suspicious_vehicle", None)

        raw = list(merged_map.values())
        streaks = self.label_streaks.setdefault(camera_id, {})
        present = {s.label for s in raw}

        for lbl in list(streaks.keys()):
            if lbl not in present:
                streaks[lbl] = 0

        confirmed: List[IncidentSignal] = []
        for s in raw:
            streaks[s.label] = streaks.get(s.label, 0) + 1
            if streaks[s.label] >= DETECTOR_CONFIRM_FRAMES:
                confirmed.append(s)
                streaks[s.label] = 0

        cam_cooldowns = self.cooldowns.setdefault(camera_id, {})
        allowed: List[IncidentSignal] = []
        for signal in confirmed:
            last_sent = cam_cooldowns.get(signal.label, 0.0)
            if now - last_sent >= NETRA_LABEL_COOLDOWN_SECONDS:
                allowed.append(signal)
                cam_cooldowns[signal.label] = now
        return allowed


class NetraPoster:
    def __init__(self, app_url: str, api_key: str | None = None) -> None:
        self.endpoint = f"{app_url.rstrip('/')}/api/detector/events"
        self.api_key = api_key
        self.client = httpx.Client(timeout=2.0)

    def post(self, camera_id: str, signals: List[IncidentSignal]) -> None:
        if not signals:
            return

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["x-api-key"] = self.api_key

        for signal in signals:
            payload = {
                "sourceType": "yolov8",
                "cameraId": camera_id,
                "detections": [
                    {
                        "label": signal.label,
                        "confidence": round(signal.confidence, 3),
                    }
                ],
            }
            try:
                self.client.post(self.endpoint, json=payload, headers=headers)
            except Exception:
                continue

    def close(self) -> None:
        self.client.close()
