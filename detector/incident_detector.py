import cv2
import numpy as np
from collections import deque, defaultdict

class VehicleCollisionDetector:
    VEHICLE_CLASSES_ROBOFLOW = ["Car", "Truck", "Bus", "Auto", "Two-wheeler"]
    VEHICLE_CLASSES_COCO = ["car", "truck", "bus", "motorcycle"]
    
    HISTORY_FRAMES = 12       # track over ~1.2 seconds at 10fps
    STOPPED_VELOCITY = 8.0    # pixels/frame — below this = "stopped"
    MOVING_VELOCITY = 15.0    # pixels/frame — above this = "was moving"
    MIN_FRAME_POSITION = 0.15 # ignore vehicles at top edge (far away, small)
    
    def __init__(self):
        # vehicle_id (approximated by bbox position bucket) → deque of centroids
        self.centroid_history: dict[str, deque] = defaultdict(lambda: deque(maxlen=self.HISTORY_FRAMES))
    
    def _get_vehicle_key(self, centroid: tuple, frame_shape: tuple) -> str:
        """
        Approximate vehicle identity by bucketing centroid into a grid.
        Vehicles move slightly frame to frame — grid cells absorb small movement.
        Grid: 8x6 cells on a 640x480 frame = 80x80px cells.
        """
        cx, cy = centroid
        grid_x = int(cx // 80)
        grid_y = int(cy // 80)
        return f"{grid_x}_{grid_y}"
    
    def analyze(self, detections: list[dict], frame_shape: tuple) -> dict | None:
        h, w = frame_shape[:2]
        
        all_classes = self.VEHICLE_CLASSES_ROBOFLOW + self.VEHICLE_CLASSES_COCO
        vehicles = [d for d in detections if d["class"] in all_classes]
        
        if len(vehicles) < 2:
            # Need at least 2 vehicles for a collision scenario
            self.centroid_history.clear()
            return None
        
        collision_candidates = []
        
        for vehicle in vehicles:
            cx, cy = vehicle["centroid"]
            
            # Ignore vehicles in top 15% of frame — too far away, perspective unreliable
            if cy < h * self.MIN_FRAME_POSITION:
                continue
            
            key = self._get_vehicle_key((cx, cy), frame_shape)
            history = self.centroid_history[key]
            history.append((cx, cy))
            
            if len(history) < 6:
                # Not enough history yet
                continue
            
            # Compute velocity over last 6 frames
            recent = list(history)[-6:]
            velocities = []
            for i in range(1, len(recent)):
                dx = recent[i][0] - recent[i-1][0]
                dy = recent[i][1] - recent[i-1][1]
                velocities.append(np.sqrt(dx**2 + dy**2))
            
            current_velocity = velocities[-1]
            max_recent_velocity = max(velocities[:-1]) if len(velocities) > 1 else 0
            
            # COLLISION SIGNAL: vehicle WAS moving, now STOPPED suddenly
            # in the middle/lower portion of frame (close to camera)
            was_moving = max_recent_velocity > self.MOVING_VELOCITY
            now_stopped = current_velocity < self.STOPPED_VELOCITY
            in_foreground = cy > h * 0.3  # bottom 70% of frame
            
            if was_moving and now_stopped and in_foreground:
                collision_candidates.append({
                    "vehicle": vehicle,
                    "stopped_at": (cx, cy),
                    "prev_velocity": max_recent_velocity,
                    "conf": vehicle["conf"]
                })
        
        if len(collision_candidates) >= 1:
            avg_conf = np.mean([c["conf"] for c in collision_candidates])
            classes = [c["vehicle"]["class"] for c in collision_candidates]
            return {
                "type": "vehicle_collision",
                "severity": "critical",
                "description": f"Sudden vehicle stop detected — possible collision ({', '.join(classes)})",
                "confidence": float(avg_conf),
                "detected_classes": classes
            }
        
        return None

class CrowdGatheringDetector:
    CROWD_THRESHOLD = 5
    CLUSTER_STD_THRESHOLD = 150  # pixels — low std = people are close together
    
    def analyze(self, detections: list[dict], frame_shape: tuple) -> dict | None:
        persons = [d for d in detections 
                  if d["class"].lower() in ["person", "person_2"]]
        
        if len(persons) < self.CROWD_THRESHOLD:
            return None
        
        # Check clustering
        centroids = [p["centroid"] for p in persons]
        std_x = np.std([c[0] for c in centroids])
        std_y = np.std([c[1] for c in centroids])
        
        if std_x < self.CLUSTER_STD_THRESHOLD and std_y < self.CLUSTER_STD_THRESHOLD:
            severity = "critical" if len(persons) >= 10 else "high"
            return {
                "type": "crowd_gathering",
                "severity": severity,
                "description": f"Crowd gathering detected — {len(persons)} persons clustered",
                "confidence": float(np.mean([p["conf"] for p in persons])),
                "detected_classes": ["person"] * len(persons)
            }
        
        return None

class FireDetector:
    FIRE_MIN_AREA = 2500
    FLICKER_VARIANCE_THRESHOLD = 400
    CENTROID_DRIFT_THRESHOLD = 60    # pixels — fire centroid shouldn't move more than this
    HISTORY_FRAMES = 10
    
    def __init__(self):
        self.fire_area_history = deque(maxlen=self.HISTORY_FRAMES)
        self.fire_centroid_history = deque(maxlen=self.HISTORY_FRAMES)  # NEW
    
    def analyze(self, frame: np.ndarray, detections: list[dict]) -> dict | None:
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        
        # Fire HSV ranges
        lower1 = np.array([0, 120, 120])    # tighter sat/val than before
        upper1 = np.array([25, 255, 255])   # narrower hue — avoids deep red vehicles
        lower2 = np.array([165, 120, 120])
        upper2 = np.array([180, 255, 255])
        
        mask = cv2.bitwise_or(
            cv2.inRange(hsv, lower1, upper1),
            cv2.inRange(hsv, lower2, upper2)
        )
        
        # Morphological cleanup — removes noise and small specs
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        
        fire_pixels = cv2.countNonZero(mask)
        self.fire_area_history.append(fire_pixels)
        
        if fire_pixels < self.FIRE_MIN_AREA:
            self.fire_centroid_history.clear()
            return None
        
        # Find contours and compute centroid of largest fire region
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return None
        
        largest = max(contours, key=cv2.contourArea)
        M = cv2.moments(largest)
        if M["m00"] == 0:
            return None
        
        cx = int(M["m10"] / M["m00"])
        cy = int(M["m01"] / M["m00"])
        self.fire_centroid_history.append((cx, cy))
        
        # CHECK 1: Flicker (area must vary — static orange object fails this)
        if len(self.fire_area_history) >= 6:
            variance = np.var(list(self.fire_area_history))
            if variance < self.FLICKER_VARIANCE_THRESHOLD:
                return None  # static — not fire
        
        # CHECK 2: Centroid stability (fire doesn't drive across the screen)
        # THIS IS THE NEW FIX — red bus fails here because its centroid moves
        if len(self.fire_centroid_history) >= 6:
            cx_vals = [c[0] for c in self.fire_centroid_history]
            cy_vals = [c[1] for c in self.fire_centroid_history]
            centroid_drift = np.sqrt(np.var(cx_vals) + np.var(cy_vals))
            
            if centroid_drift > self.CENTROID_DRIFT_THRESHOLD:
                # Centroid is moving too much — this is a vehicle, not fire
                return None
        else:
            # Not enough centroid history yet — don't fire
            return None
        
        # Both checks passed — this is likely fire
        confidence = min(0.93, fire_pixels / 8000)
        return {
            "type": "fire_detected",
            "severity": "critical",
            "description": f"Fire detected — stationary flame region, {fire_pixels}px, flicker confirmed",
            "confidence": round(float(confidence), 3),
            "detected_classes": ["fire"]
        }
