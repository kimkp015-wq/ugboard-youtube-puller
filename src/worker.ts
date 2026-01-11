async function runMyScheduledJob(env: Env) {
  const res = await fetch(`${env.ENGINE_BASE_URL}/ingest/youtube`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.INTERNAL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items: [] }), // Cron body
  });

  console.log("ENGINE STATUS:", res.status);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Secure manual trigger
    if (
      url.pathname === "/admin/run-job" &&
      request.headers.get("X-Manual-Trigger") === "YOUR_SECRET_TOKEN"
    ) {
      await runMyScheduledJob(env);
      return new Response("Job manually triggered!");
    }

    return new Response("Hello World!");
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runMyScheduledJob(env));
  },
};
