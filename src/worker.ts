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
async function runYoutubePull(env: Env): Promise<{ success: boolean; message: string }> {
  // Ensure base URL ends without a trailing slash
  const engineBase = env.ENGINE_BASE_URL.replace(/\/+$/, "")
  const url = `${engineBase}/ingest/youtube`

  if (!validateUrl(url)) {
    const error = `Invalid ENGINE_BASE_URL: ${url}`
    console.error(error)
    return { success: false, message: error }
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

      console.log(`ENGINE STATUS (attempt ${attempt}):`, res.status)

      if (res.ok) {
        return { success: true, message: `Success! Engine returned ${res.status}` }
      }
      
      console.warn(`Attempt ${attempt}: Received non-OK status ${res.status}`)
      
      // If it's a client error (4xx), don't retry
      if (res.status >= 400 && res.status < 500) {
        return { success: false, message: `Engine error ${res.status}: ${await res.text()}` }
      }
    } catch (err) {
      console.error(`Attempt ${attempt}: Fetch error`, err)
    }

    // Exponential backoff: 500ms → 1s → 2s
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)))
    }
  }

  const error = "Failed to send payload to engine after all retries"
  console.error(error)
  return { success: false, message: error }
}

export default {
  /**
   * HTTP fetch handler
   * Allows manual triggering via secret header
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    // Manual trigger path
    if (
      url.pathname === "/admin/run-job" &&
      request.headers.get("X-Manual-Trigger") === env.MANUAL_TRIGGER_TOKEN
    ) {
      console.log("🔄 Manual trigger received")
      const result = await runYoutubePull(env) // ✅ FIXED: Wait for result!
      
      return new Response(
        JSON.stringify({
          success: result.success,
          message: result.message,
          timestamp: new Date().toISOString()
        }), 
        { 
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    // Health check endpoint
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          engine_url_set: !!env.ENGINE_BASE_URL,
          has_token: !!env.INTERNAL_TOKEN,
          timestamp: new Date().toISOString()
        }),
        { headers: { "Content-Type": "application/json" } }
      )
    }

    // Default response
    return new Response("UG Board YouTube Puller Worker\n\nEndpoints:\n- GET /health\n- POST /admin/run-job (with X-Manual-Trigger header)", 
      { status: 200 }
    )
  },

  /**
   * Cron job handler
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log("⏰ Cron job triggered at:", new Date().toISOString())
    
    // Run the pull
    const result = await runYoutubePull(env)
    
    // Log result
    if (result.success) {
      console.log("✅ Cron job succeeded:", result.message)
    } else {
      console.error("❌ Cron job failed:", result.message)
    }
  }
}
