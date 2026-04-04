import threading
import time

class CooldownManager:
    """
    Prevents incident spam. Per camera, per incident type.
    Thread-safe.
    """
    def __init__(self, default_cooldown: int = 30):
        self.default_cooldown = default_cooldown
        self.cooldowns = {
            "vehicle_collision": 45,
            "crowd_gathering": 30,
            "fire_detected": 20,  # shorter — fire escalates fast
            "animal_obstruction": 30,
            "traffic_congestion": 60,
        }
        self._last_fired: dict = {}
        self._lock = threading.Lock()
    
    def can_fire(self, camera_id: str, incident_type: str) -> bool:
        key = f"{camera_id}:{incident_type}"
        cooldown = self.cooldowns.get(incident_type, self.default_cooldown)
        with self._lock:
            last = self._last_fired.get(key, 0)
            if time.time() - last >= cooldown:
                self._last_fired[key] = time.time()
                return True
            return False
    
    def time_until_next(self, camera_id: str, incident_type: str) -> float:
        """Returns seconds until this camera/type can fire again. 0 if ready."""
        key = f"{camera_id}:{incident_type}"
        cooldown = self.cooldowns.get(incident_type, self.default_cooldown)
        with self._lock:
            last = self._last_fired.get(key, 0)
            remaining = cooldown - (time.time() - last)
            return max(0, remaining)
