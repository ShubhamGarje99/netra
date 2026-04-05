"use client";

import { useEffect, useRef } from "react";
import { useSimulationStore } from "@/store/simulation-store";
import type { DispatchLogEntry } from "@/simulation/types";

export function useSimulation() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const update = useSimulationStore((s) => s.update);
  const setRunning = useSimulationStore((s) => s.setRunning);
  const setLinkDegraded = useSimulationStore((s) => s.setLinkDegraded);
  const setDispatchLogs = useSimulationStore((s) => s.setDispatchLogs);

  useEffect(() => {
    let unmounted = false;

    const fetchSnapshot = async () => {
      try {
        const response = await fetch("/api/simulation/state", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          running: boolean;
          state: Parameters<typeof update>[0] & { dispatchLogs?: DispatchLogEntry[] };
          detectorOnline?: boolean | null;
        };

        if (unmounted) return;
        update({ ...payload.state, detectorOnline: payload.detectorOnline ?? payload.state.detectorOnline });
        setRunning(payload.running);
        setLinkDegraded(false);
        // Dispatch logs flow through SSE state
        if (payload.state.dispatchLogs) {
          setDispatchLogs(payload.state.dispatchLogs);
        }
      } catch {
        // Keep dashboard running with last known snapshot.
      }
    };

    const startPolling = () => {
      if (pollingRef.current) return;

      pollingRef.current = setInterval(() => {
        void fetchSnapshot();
      }, 2000);
    };

    const stopPolling = () => {
      if (!pollingRef.current) return;
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    };

    const connectStream = () => {
      const source = new EventSource("/api/simulation/stream");
      eventSourceRef.current = source;

      source.onopen = () => {
        setLinkDegraded(false);
      };

      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as {
            type: string;
            running: boolean;
            state?: Parameters<typeof update>[0] & { dispatchLogs?: DispatchLogEntry[] };
            detectorOnline?: boolean | null;
          };

          if (payload.state) {
            update({ ...payload.state, detectorOnline: payload.detectorOnline ?? payload.state.detectorOnline });
            // Dispatch logs flow through SSE state
            if (payload.state.dispatchLogs) {
              setDispatchLogs(payload.state.dispatchLogs);
            }
          }
          if (typeof payload.running === "boolean") {
            setRunning(payload.running);
          }
          setLinkDegraded(false);
          stopPolling();
        } catch {
          // Ignore malformed stream events.
        }
      };

      source.onerror = () => {
        setLinkDegraded(true);
        startPolling();
      };
    };

    void fetchSnapshot();
    connectStream();

    return () => {
      unmounted = true;
      stopPolling();
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [update, setRunning, setLinkDegraded, setDispatchLogs]);

  return {
    stop: async () => {
      await fetch("/api/simulation/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      setRunning(false);
    },
    start: async () => {
      await fetch("/api/simulation/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      setRunning(true);
    },
  };
}
