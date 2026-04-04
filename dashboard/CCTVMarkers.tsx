"use client";

import { memo, useCallback, useEffect, useRef, useMemo } from "react";
import { Marker, Circle, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useSimulationStore } from "@/store/simulation-store";
import { CAMERA_FEEDS } from "@/lib/netra-constants";

/* ── Custom camera SVG icon ──────────────────────────────────────── */
function cameraIcon(online: boolean): L.DivIcon {
  const color = online ? "#00FFB2" : "#444";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
      <circle cx="12" cy="13" r="3"/>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: "cctv-marker-icon",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -12],
  });
}

/* ── Single CCTV marker ──────────────────────────────────────────── */
const CCTVMarkerItem = memo(function CCTVMarkerItem({
  feed,
  online,
  lastIncidentTime,
}: {
  feed: (typeof CAMERA_FEEDS)[number];
  online: boolean;
  lastIncidentTime: number | null;
}) {
  const setSelectedCamera = useSimulationStore((s) => s.setSelectedCamera);
  const circleRef = useRef<L.Circle | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const icon = useMemo(() => cameraIcon(online), [online]);

  // Flash circle when a new incident arrives
  useEffect(() => {
    if (!lastIncidentTime || !circleRef.current) return;

    const circle = circleRef.current;
    circle.setStyle({ opacity: 0.5, fillOpacity: 0.15 });

    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => {
      circle.setStyle({ opacity: 0.08, fillOpacity: 0.04 });
    }, 2000);
  }, [lastIncidentTime]);

  const handleViewFeed = useCallback(() => {
    setSelectedCamera(feed.id);
  }, [feed.id, setSelectedCamera]);

  const time = new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <>
      <Marker position={feed.position} icon={icon}>
        <Popup autoPan={false}>
          <div className="cctv-popup">
            <div className="cctv-popup-header">
              <span className="cctv-popup-id">● {feed.id}</span>
              <span
                className="cctv-popup-status"
                style={{ color: online ? "#00FFB2" : "#555" }}
              >
                {online ? "[LIVE]" : "[OFFLINE]"}
              </span>
            </div>
            <div className="cctv-popup-name">{feed.location}</div>
            <div className="cctv-popup-time">Last check: {time}</div>
            <button
              className="cctv-popup-btn"
              onClick={handleViewFeed}
            >
              VIEW FEED ↗
            </button>
          </div>
        </Popup>
      </Marker>
      <Circle
        ref={circleRef as React.Ref<L.Circle>}
        center={feed.position}
        radius={300}
        pathOptions={{
          color: "#00FFB2",
          opacity: 0.08,
          fillOpacity: 0.04,
          weight: 1,
        }}
      />
    </>
  );
});

/* ── All CCTV markers ────────────────────────────────────────────── */
export function CCTVMarkers() {
  const incidents = useSimulationStore((s) => s.incidents);
  const cctvOnline = useSimulationStore((s) => s.cctvOnline);

  // Track last incident time per camera
  const lastIncidentTimeByCam = useMemo(() => {
    const map: Record<string, number> = {};
    for (const inc of incidents) {
      if (inc.camera_id && inc.status !== "resolved") {
        const existing = map[inc.camera_id] || 0;
        if (inc.timestamp > existing) {
          map[inc.camera_id] = inc.timestamp;
        }
      }
    }
    return map;
  }, [incidents]);

  return (
    <>
      {CAMERA_FEEDS.map((feed) => (
        <CCTVMarkerItem
          key={feed.id}
          feed={feed}
          online={cctvOnline[feed.id] ?? false}
          lastIncidentTime={lastIncidentTimeByCam[feed.id] ?? null}
        />
      ))}
    </>
  );
}
