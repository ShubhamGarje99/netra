import { NextResponse } from "next/server";
import { getSimulationRuntime } from "@/lib/server/simulation-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ControlPayload {
  action?: "start" | "stop";
}

export async function POST(request: Request) {
  const runtimeRef = await getSimulationRuntime();
  const body = (await request.json().catch(() => ({}))) as ControlPayload;

  if (body.action === "start") {
    runtimeRef.start();
  } else if (body.action === "stop") {
    runtimeRef.stop();
  } else {
    return NextResponse.json(
      { error: "Invalid action. Expected 'start' or 'stop'." },
      { status: 400 }
    );
  }

  return NextResponse.json(runtimeRef.getSnapshot());
}
