import { NextResponse } from "next/server";
import {
  getSimulationRuntime,
  type IncidentIngestPayload,
} from "@/lib/server/simulation-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const runtimeRef = await getSimulationRuntime();
  return NextResponse.json({ incidents: runtimeRef.getSnapshot().state.incidents });
}

export async function POST(request: Request) {
  const configuredApiKey = process.env.NETRA_INGEST_API_KEY;
  if (configuredApiKey) {
    const providedApiKey = request.headers.get("x-api-key");
    if (providedApiKey !== configuredApiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const runtimeRef = await getSimulationRuntime();
  const payload = (await request.json().catch(() => ({}))) as IncidentIngestPayload;

  try {
    const incident = runtimeRef.ingestIncident(payload);
    return NextResponse.json({ incident }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to ingest incident";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
