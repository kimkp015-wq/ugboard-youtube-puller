// worker.ts

export interface Env {
  ENGINE_BASE_URL: string
  INTERNAL_TOKEN: string
  MANUAL_TRIGGER_TOKEN: string // Secret token for manual HTTP trigger
}

// Core job logic: send POST to FastAPI engine
async function runMyScheduledJob(env: Env) {
  try {
    const res = await fetch(`${env.ENGINE_BASE_URL}/ingest/youtube`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.INTERNAL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items: [] }), // required by engine to avoid 422
    });

    console.log("ENGINE STATUS:", res.status);
  } catch (err) {
    console.error("WORKER ERROR:", err);
  }
}

export default {
  // Cron handler
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runMyScheduledJob(env));
  },

  // HTTP handler for manual trigger
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Check for secret manual trigger
    if (
      url.pathname === "/admin/run-job" &&
      request.headers.get("X-Manual-Trigger") === env.MANUAL_TRIGGER_TOKEN
    ) {
      await runMyScheduledJob(env);
      return new Response("Job manually triggered!");
    }

    return new Response("Hello from UG Board Worker!", { status: 200 });
  },
};
