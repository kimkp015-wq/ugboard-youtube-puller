// worker.ts

export interface Env {
  ENGINE_BASE_URL: string
  INTERNAL_TOKEN: string
  MANUAL_TRIGGER_TOKEN: string
}

// -------------------------
// Helpers
// -------------------------

/**
 * Validate that a string is a proper URL
 */
function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Core logic for pulling YouTube data
 */
async function runYoutubePull(env: Env) {
  // Runtime validation
  if (!env.ENGINE_BASE_URL || !validateUrl(env.ENGINE_BASE_URL)) {
    console.error("Invalid ENGINE_BASE_URL:", env.ENGINE_BASE_URL)
    return
  }

  if (!env.INTERNAL_TOKEN) {
    console.error("Missing INTERNAL_TOKEN")
    return
  }

  const url = `${env.ENGINE_BASE_URL}/ingest/youtube`

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.INTERNAL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items: [] }), // required to avoid 422
    })

    if (!res.ok) {
      console.error("ENGINE STATUS:", res.status, await res.text())
    } else {
      console.log("ENGINE STATUS:", res.status)
    }
  } catch (err) {
    console.error("ENGINE ERROR:", err)
  }
}

// -------------------------
// Worker export
// -------------------------

export default {
  /**
   * Manual HTTP trigger
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url)

    // Manual trigger endpoint with secret
    if (
      url.pathname === "/admin/run-job" &&
      request.headers.get("X-Manual-Trigger") === env.MANUAL_TRIGGER_TOKEN
    ) {
      await runYoutubePull(env)
      return new Response("Job manually triggered!", { status: 200 })
    }

    return new Response("Hello from UG Board Worker!", { status: 200 })
  },

  /**
   * Cron trigger
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runYoutubePull(env))
  },
}
