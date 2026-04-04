"use client";

import { useEffect, useRef } from "react";
import { useSimulationStore } from "@/store/simulation-store";

export function useSimulation() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const update = useSimulationStore((s) => s.update);
  const setRunning = useSimulationStore((s) => s.setRunning);
  const setLinkDegraded = useSimulationStore((s) => s.setLinkDegraded);

  useEffect(() => {
    let unmounted = false;

    const fetchSnapshot = async () => {
      try {
        const response = await fetch("/api/simulation/state", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          running: boolean;
          state: Parameters<typeof update>[0];
          detectorOnline?: boolean | null;
        };

        if (unmounted) return;
        update({ ...payload.state, detectorOnline: payload.detectorOnline ?? payload.state.detectorOnline });
        setRunning(payload.running);
        setLinkDegraded(false);
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
            state?: Parameters<typeof update>[0];
            detectorOnline?: boolean | null;
          };

          if (payload.state) {
            update({ ...payload.state, detectorOnline: payload.detectorOnline ?? payload.state.detectorOnline });
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
  }, [update, setRunning, setLinkDegraded]);

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
