// src/worker.ts

export interface Env {
  ENGINE_BASE_URL: string
  INTERNAL_TOKEN: string
  MANUAL_TRIGGER_TOKEN: string
}

// ---------------------------
// Core Job Logic
// ---------------------------
async function runYoutubePull(env: Env) {
  try {
    const res = await fetch(`${env.ENGINE_BASE_URL}/ingest/youtube`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.INTERNAL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: await (await fetch(new URL("./youtube_items.json", import.meta.url))).text(), 
      // Sends actual items instead of empty array
    })

    console.log("ENGINE STATUS:", res.status)
  } catch (err) {
    console.error("ENGINE ERROR:", err)
  }
}

// ---------------------------
// Worker Export
// ---------------------------
export default {
  // Manual HTTP trigger
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url)

    if (
      url.pathname === "/admin/run-job" &&
      request.headers.get("X-Manual-Trigger") === env.MANUAL_TRIGGER_TOKEN
    ) {
      await runYoutubePull(env)
      return new Response("Job manually triggered!", { status: 200 })
    }

    return new Response("Hello from UG Board Worker!", { status: 200 })
  },

  // Cron Trigger
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runYoutubePull(env))
  },
}
