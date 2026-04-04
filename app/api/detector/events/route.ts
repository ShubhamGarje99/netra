import { NextResponse } from "next/server";
import { getSimulationRuntime } from "@/lib/server/simulation-runtime";
import {
  mapDetectorEventToIncident,
  type DetectorEventPayload,
} from "@/lib/server/detector-mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const configuredApiKey = process.env.NETRA_DETECTOR_API_KEY;
  if (configuredApiKey) {
    const providedApiKey = request.headers.get("x-api-key");
    if (providedApiKey !== configuredApiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const payload = (await request.json().catch(() => ({}))) as DetectorEventPayload;
  const runtimeRef = await getSimulationRuntime();

  const mapped = mapDetectorEventToIncident(payload);
  if (!mapped) {
    await runtimeRef.recordDetectorEvent({
      sourceType: payload.sourceType ?? "detector",
      sourceId: payload.cameraId ?? payload.sourceId ?? "unknown",
      payload,
      status: "ignored",
      reason: "No supported incident mapping or location",
    });

    return NextResponse.json({ accepted: false, reason: "No supported mapping" }, { status: 202 });
  }

  try {
    const incident = runtimeRef.ingestIncident(mapped.ingestPayload);

    await runtimeRef.recordDetectorEvent({
      sourceType: mapped.sourceType,
      sourceId: mapped.sourceId,
      payload,
      status: "accepted",
      incidentId: incident.id,
    });

    return NextResponse.json({ accepted: true, incident }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to ingest detector event";

    await runtimeRef.recordDetectorEvent({
      sourceType: mapped.sourceType,
      sourceId: mapped.sourceId,
      payload,
      status: "rejected",
      reason: message,
    });

    return NextResponse.json({ accepted: false, error: message }, { status: 400 });
  }
}
