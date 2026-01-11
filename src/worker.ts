export interface Env {
  ENGINE_BASE_URL: string
  INTERNAL_TOKEN: string
  MANUAL_TRIGGER_TOKEN: string
}

async function runMyScheduledJob(env: Env) {
  try {
    const res = await fetch(`${env.ENGINE_BASE_URL}/ingest/youtube`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.INTERNAL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items: [] }), // avoids 422 error
    });
    console.log("ENGINE STATUS:", res.status);
  } catch (err) {
    console.error("WORKER ERROR:", err);
  }
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runMyScheduledJob(env));
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

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
