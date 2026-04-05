import threading
import time

class CooldownManager:
    """
    Prevents incident spam. Per camera, per incident type.
    Cooldowns are set longer than the looping video duration (10-20 s)
    so the same incident isn't re-fired every loop iteration.
    Thread-safe.
    """
    
    # Class-level variables to enforce a global rate limit across ALL cameras
    # This prevents the UI from being bombarded with 20+ incidents instantly 
    # when the detector pipelines first start up on video files.
    _global_last_fired_time = 0.0
    _global_lock = threading.Lock()
    GLOBAL_COOLDOWN_SECONDS = 3.5

    def __init__(self, default_cooldown: int = 60):
        self.default_cooldown = default_cooldown
        # Key categories — all >= 60 s to outlast the looping video files
        self.cooldowns = {
            # crash / collision family
            "vehicle_collision":    120,
            "accident":             120,
            "crash":                120,
            "fallen_person":        120,
            # fire family
            "fire_detected":        120,
            "fire":                 120,
            # crowd family (shorter — still want to surface these)
            "crowd_gathering":      30,
            "restricted_gathering": 30,
            "crowd":                 0,
            # other
            "animal_obstruction":   60,
            "traffic_congestion":   60,
            "traffic_violation":    60,
            "intrusion":            60,
            "abandoned_static":     60,
            "suspicious_vehicle":   60,
        }
        self._last_fired: dict = {}
        self._instance_lock = threading.Lock()
    
    def can_fire(self, camera_id: str, incident_type: str) -> bool:
        key = f"{camera_id}:{incident_type}"
        cooldown = self.cooldowns.get(incident_type, self.default_cooldown)
        
        # 1. Check instance-level (camera + type) cooldown first
        with self._instance_lock:
            last = self._last_fired.get(key, 0)
            now = time.time()
            if now - last < cooldown:
                return False
                
        # 2. Check global rate limit across all pipelines
        with CooldownManager._global_lock:
            now = time.time()
            if now - CooldownManager._global_last_fired_time < CooldownManager.GLOBAL_COOLDOWN_SECONDS:
                return False
            
            # 3. Both passed — fire!
            CooldownManager._global_last_fired_time = now
            
            with self._instance_lock:
                self._last_fired[key] = now
                
            return True
    
    def time_until_next(self, camera_id: str, incident_type: str) -> float:
        """Returns seconds until this camera/type can fire again. 0 if ready."""
        key = f"{camera_id}:{incident_type}"
        cooldown = self.cooldowns.get(incident_type, self.default_cooldown)
        with self._instance_lock:
            last = self._last_fired.get(key, 0)
            remaining = cooldown - (time.time() - last)
            return max(0, remaining)
