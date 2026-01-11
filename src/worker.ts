// src/worker.ts

import { fetchAllVideos, VideoItem } from "./rss"
import { logStatus } from "./utils"

export interface Env {
  ENGINE_BASE_URL: string
  INTERNAL_TOKEN: string
  MANUAL_TRIGGER_TOKEN: string
}

// Core job logic
async function runYoutubePull(env: Env) {
  try {
    const items: VideoItem[] = await fetchAllVideos()

    if (!items.length) {
      logStatus("No videos found. Skipping ingestion.")
      return
    }

    const res = await fetch(`${env.ENGINE_BASE_URL}/ingest/youtube`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.INTERNAL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items }),
    })

    logStatus("ENGINE STATUS:", res.status, "VIDEOS SENT:", items.length)
  } catch (err) {
    console.error("ENGINE ERROR:", err)
  }
}

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

  // Cron trigger
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runYoutubePull(env))
  },
}
