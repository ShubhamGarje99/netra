"use client";

import { useSimulation } from "@/hooks/useSimulation";
import { DashboardShell } from "@/dashboard/DashboardShell";

export default function DashboardPage() {
  useSimulation();

  return <DashboardShell />;
}
