import { calculateRoute } from "../simulation/pathfinding";
import { NO_FLY_ZONES } from "../lib/netra-constants";
import { doesPathCrossZone, isInsidePolygon } from "../simulation/geofence";
import type { LatLng } from "../lib/netra-constants";

// Pick a point south of Southern Command
const start: LatLng = [18.5000, 73.8800];
// Pick a point north of Southern Command
const end: LatLng = [18.5300, 73.8800];

const route = calculateRoute(start, end);
console.log("Route waypoints:");
route.forEach((wp, idx) => console.log(`  ${idx}: [${wp[0].toFixed(5)}, ${wp[1].toFixed(5)}]`));

let anyCollision = false;

// 1. Check if any waypoint is inside any NFZ
route.forEach((wp, idx) => {
  NO_FLY_ZONES.forEach(z => {
    if (isInsidePolygon(wp, z.polygon)) {
      console.log(`❌ Waypoint ${idx} is inside ${z.name}!`, wp);
      anyCollision = true;
    }
  });
});

// 2. Check if any _segment_ crosses any NFZ boundary
for (let i = 0; i < route.length - 1; i++) {
  const p1 = route[i];
  const p2 = route[i+1];
  
  NO_FLY_ZONES.forEach(z => {
    if (doesPathCrossZone(p1, p2, z.polygon)) {
      console.log(`❌ Segment from WP${i} to WP${i+1} crosses ${z.name}!`);
      anyCollision = true;
    }
  });
}

if (!anyCollision) {
  console.log("✅ SUCCESS: Route points and segments are completely valid and collision-free.");
} else {
  console.log("⚠️ FAILED: The mathematical proof detected a collision.");
}
