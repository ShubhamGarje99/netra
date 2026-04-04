/**
 * Utility to manually trigger an incident via the ingest API.
 * Used by the StatusBar button and map-click targeting.
 */

import {
  INCIDENT_TYPES,
  INCIDENT_ZONES,
  INCIDENT_TYPE_LABELS,
  type IncidentType,
} from "@/lib/netra-constants";

export async function triggerIncident(
  lat?: number,
  lng?: number
): Promise<{ ok: boolean; message: string }> {
  const type = INCIDENT_TYPES[
    Math.floor(Math.random() * INCIDENT_TYPES.length)
  ] as IncidentType;

  let finalLat: number;
  let finalLng: number;
  let locationName: string;

  if (lat != null && lng != null) {
    // Map-click: find nearest zone for a human-readable name
    const nearest = INCIDENT_ZONES.reduce(
      (best, zone) => {
        const d = Math.hypot(
          zone.position[0] - lat,
          zone.position[1] - lng
        );
        return d < best.d ? { zone, d } : best;
      },
      { zone: INCIDENT_ZONES[0], d: Infinity }
    );
    finalLat = lat;
    finalLng = lng;
    locationName = `Near ${nearest.zone.name}`;
  } else {
    // Random: pick a random incident zone with jitter
    const zone =
      INCIDENT_ZONES[Math.floor(Math.random() * INCIDENT_ZONES.length)];
    finalLat = zone.position[0] + (Math.random() - 0.5) * 0.004;
    finalLng = zone.position[1] + (Math.random() - 0.5) * 0.004;
    locationName = zone.name;
  }

  const label = INCIDENT_TYPE_LABELS[type];

  try {
    const res = await fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        severity: "critical",
        lat: finalLat,
        lng: finalLng,
        locationName,
        description: `Manual trigger: ${label} at ${locationName}`,
        detectionConfidence: 0.95,
        resolveAfterTicks: 50,
      }),
    });

    if (res.ok) {
      return {
        ok: true,
        message: `⚠ ${label} triggered at ${locationName} — drone dispatching…`,
      };
    }

    const data = await res.json().catch(() => ({}));
    return {
      ok: false,
      message: (data as { error?: string }).error || "Failed to trigger incident",
    };
  } catch {
    return { ok: false, message: "Network error — could not reach server" };
  }
}
