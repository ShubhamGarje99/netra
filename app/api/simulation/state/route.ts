import { NextResponse } from "next/server";
import { getSimulationRuntime } from "@/lib/server/simulation-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const runtimeRef = await getSimulationRuntime();
  return NextResponse.json(runtimeRef.getSnapshot());
}
