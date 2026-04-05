import { NextResponse } from "next/server";
import { getSimulationRuntime } from "@/lib/server/simulation-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ForceBatteryPayload {
  droneId?: string;
  battery?: number;
}

export async function POST(request: Request) {
  const runtimeRef = await getSimulationRuntime();
  const body = (await request.json().catch(() => ({}))) as ForceBatteryPayload;

  if (!body.droneId || typeof body.battery !== "number") {
    return NextResponse.json(
      { error: "droneId (string) and battery (number) are required." },
      { status: 400 }
    );
  }

  try {
    runtimeRef.forceDroneBattery(body.droneId, body.battery);
    return NextResponse.json({ ok: true, droneId: body.droneId, battery: body.battery });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
