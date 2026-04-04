import { getSimulationRuntime } from "@/lib/server/simulation-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function createSseMessage(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET() {
  const runtimeRef = await getSimulationRuntime();

  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      unsubscribe = runtimeRef.subscribe((payload) => {
        controller.enqueue(encoder.encode(createSseMessage(payload)));
      });

      heartbeat = setInterval(() => {
        controller.enqueue(
          encoder.encode(createSseMessage({ type: "keepalive", timestamp: Date.now() }))
        );
      }, 15000);
    },
    cancel() {
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
