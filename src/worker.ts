export interface Env {
  ENGINE_BASE_URL: string
  INTERNAL_TOKEN: string
  MANUAL_TRIGGER_TOKEN: string
}

function validateUrl(url: string) {
  try {
    new URL(url)
    return true
  } catch (err) {
    return false
  }
}

/**
 * Core YouTube pull logic.
 * Sends an idempotent request to the Engine ingestion endpoint.
 */
async function runYoutubePull(env: Env) {
  // Ensure base URL ends without a trailing slash
  const engineBase = env.ENGINE_BASE_URL.replace(/\/+$/, "")
  const url = `${engineBase}/ingest/youtube`

  if (!validateUrl(url)) {
    console.error("Invalid ENGINE_BASE_URL:", url)
    return
  }

  const payload = { items: [] } // required to avoid 422

  // Retry wrapper for transient network errors
  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.INTERNAL_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      console.log("ENGINE STATUS:", res.status)

      if (res.ok) return
      console.warn(`Attempt ${attempt}: Received non-OK status ${res.status}`)
    } catch (err) {
      console.error(`Attempt ${attempt}: Fetch error`, err)
    }

    // Exponential backoff: 500ms → 1s → 2s
    await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)))
  }

  console.error("Failed to send payload to engine after retries")
}

export default {
  /**
   * HTTP fetch handler
   * Allows manual triggering via secret header
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url)

    // Manual trigger path
    if (
      url.pathname === "/admin/run-job" &&
      request.headers.get("X-Manual-Trigger") === env.MANUAL_TRIGGER_TOKEN
    ) {
      await runYoutubePull(env)
      return new Response("Job manually triggered!", { status: 200 })
    }

    return new Response("UG Board YouTube Puller Worker", { status: 200 })
  },

  /**
   * Cron job handler
   */
  async scheduled(_controller: any, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runYoutubePull(env))
  },
}
