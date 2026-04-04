import { NextResponse } from "next/server";
import { getSimulationRuntime } from "@/lib/server/simulation-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mobile / field SOS → injects a critical incident at the given coordinates.
 * Optional: set NETRA_SOS_API_KEY and send matching x-api-key header.
 */
export async function POST(request: Request) {
  const configuredKey = process.env.NETRA_SOS_API_KEY;
  if (configuredKey) {
    const provided = request.headers.get("x-api-key");
    if (provided !== configuredKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = (await request.json().catch(() => ({}))) as {
    lat?: number;
    lng?: number;
    message?: string;
  };

  if (!Number.isFinite(body.lat) || !Number.isFinite(body.lng)) {
    return NextResponse.json({ error: "lat and lng must be finite numbers" }, { status: 400 });
  }

  const runtime = await getSimulationRuntime();

  try {
    const incident = runtime.ingestIncident({
      type: "road_accident",
      severity: "critical",
      lat: body.lat as number,
      lng: body.lng as number,
      locationName: "Mobile SOS",
      description: (body.message?.trim() || "Citizen SOS — mobile application trigger").slice(0, 500),
      detectionConfidence: 0.99,
      resolveAfterTicks: 90,
    });

    return NextResponse.json({ ok: true, incident }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SOS ingest failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
