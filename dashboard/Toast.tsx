"use client";

import { useEffect } from "react";
import { useSimulationStore } from "@/store/simulation-store";
import { AlertTriangle, CheckCircle, X } from "lucide-react";

const TOAST_DURATION = 4500;

export function Toast() {
  const toast = useSimulationStore((s) => s.toast);
  const clearToast = useSimulationStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(clearToast, TOAST_DURATION);
    return () => clearTimeout(id);
  }, [toast, clearToast]);

  if (!toast) return null;

  const isError = !toast.ok;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[9999] animate-toast-in">
      <div
        className={`
          flex items-center gap-3 px-5 py-3 rounded border backdrop-blur-md
          font-mono text-xs tracking-wide shadow-lg shadow-black/40
          ${
            isError
              ? "bg-critical/15 border-critical/40 text-critical"
              : "bg-pulse/10 border-pulse/40 text-pulse"
          }
        `}
      >
        {isError ? (
          <AlertTriangle className="w-4 h-4 shrink-0" />
        ) : (
          <CheckCircle className="w-4 h-4 shrink-0" />
        )}
        <span className="max-w-md">{toast.message}</span>
        <button
          onClick={clearToast}
          className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
