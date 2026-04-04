/**
 * Zustand store for NETRA simulation state.
 *
 * Uses `createWithEqualityFn` to avoid the React 18 SSR
 * "getServerSnapshot should be cached" infinite loop warning.
 */

"use client";

import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import type { Drone, Incident, Alert, SimulationStats } from "@/simulation/types";

export interface ToastPayload {
  ok: boolean;
  message: string;
}

interface SimulationStore {
  // State
  drones:            Drone[];
  incidents:         Incident[];
  alerts:            Alert[];
  stats:             SimulationStats;
  isRunning:         boolean;
  /** SSE down — polling fallback (low-bandwidth / flaky link) */
  linkDegraded:      boolean;
  selectedDrone:     string | null;
  selectedIncident:  string | null;

  /** Toast notification */
  toast:             ToastPayload | null;
  /** Map click → trigger incident mode */
  targetingMode:     boolean;
  /** Detector service health (from SSE heartbeat) */
  detectorOnline:    boolean | null;

  // Actions
  update: (data: {
    drones:    Drone[];
    incidents: Incident[];
    alerts:    Alert[];
    stats:     SimulationStats;
    detectorOnline?: boolean | null;
  }) => void;
  setRunning:       (running: boolean) => void;
  setLinkDegraded:  (degraded: boolean) => void;
  selectDrone:      (id: string | null) => void;
  selectIncident:   (id: string | null) => void;
  showToast:        (payload: ToastPayload) => void;
  clearToast:       () => void;
  setTargetingMode: (active: boolean) => void;
  setDetectorOnline:(online: boolean | null) => void;
}

const INITIAL_STATS: SimulationStats = {
  totalIncidents:   0,
  activeIncidents:  0,
  resolvedIncidents:0,
  avgResponseTime:  0,
  dronesActive:     0,
  dronesIdle:       8,
  responseTimes:    [],
};

export const useSimulationStore = createWithEqualityFn<SimulationStore>(
  (set) => ({
    drones:           [],
    incidents:        [],
    alerts:           [],
    stats:            INITIAL_STATS,
    isRunning:        false,
    linkDegraded:     false,
    selectedDrone:    null,
    selectedIncident: null,
    toast:            null,
    targetingMode:    false,
    detectorOnline:   null,

    update: (data) =>
      set({
        drones:    data.drones,
        incidents: data.incidents,
        alerts:    data.alerts,
        stats:     data.stats,
        ...(data.detectorOnline != null && { detectorOnline: data.detectorOnline }),
      }),

    setRunning:       (running)  => set({ isRunning: running }),
    setLinkDegraded:  (degraded) => set({ linkDegraded: degraded }),
    selectDrone:      (id)       => set({ selectedDrone: id }),
    selectIncident:   (id)       => set({ selectedIncident: id }),
    showToast:        (payload)  => set({ toast: payload }),
    clearToast:       ()         => set({ toast: null }),
    setTargetingMode: (active)   => set({ targetingMode: active }),
    setDetectorOnline:(online)   => set({ detectorOnline: online }),
  }),
  shallow
);

// Re-export shallow for convenience
export { shallow };
