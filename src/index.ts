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
      // CRITICAL: Send headers your engine expects
      const headers = {
        "Authorization": `Bearer ${env.INTERNAL_TOKEN}`,
        "Content-Type": "application/json",
        "scheme": "bearer",  // ← ADD THIS - Required by your engine
        "credentials": env.INTERNAL_TOKEN,  // ← ADD THIS - Required by your engine
        "X-Request-ID": crypto.randomUUID(),
        "User-Agent": "UG-Board-YouTube-Puller/1.0"
      }

      console.log(`📤 Attempt ${attempt}: Calling ${url}`)
      console.log(`🔑 Headers:`, JSON.stringify(Object.keys(headers)))
      
      const res = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      })

      console.log(`ENGINE STATUS (attempt ${attempt}):`, res.status)

      if (res.ok) {
        const responseData = await res.text()
        return { 
          success: true, 
          message: `Success! Engine returned ${res.status}: ${responseData}` 
        }
      }
      
      const errorText = await res.text()
      console.warn(`Attempt ${attempt}: Received ${res.status}:`, errorText)
      
      // If it's a client error (4xx), don't retry
      if (res.status >= 400 && res.status < 500) {
        return { success: false, message: `Engine error ${res.status}: ${errorText}` }
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

    // Health check endpoint - always public
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          engine_url_set: !!env.ENGINE_BASE_URL,
          has_token: !!env.INTERNAL_TOKEN,
          timestamp: new Date().toISOString(),
          version: "2.0-fixed-headers"
        }),
        { 
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      )
    }

    // Manual trigger path
    if (
      url.pathname === "/admin/run-job" &&
      request.headers.get("X-Manual-Trigger") === env.MANUAL_TRIGGER_TOKEN
    ) {
      console.log("🔄 Manual trigger received at:", new Date().toISOString())
      const result = await runYoutubePull(env)
      
      return new Response(
        JSON.stringify({
          success: result.success,
          message: result.message,
          timestamp: new Date().toISOString()
        }), 
        { 
          status: result.success ? 200 : 500,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      )
    }

    // Default response
    return new Response(
      "UG Board YouTube Puller Worker\n\n" +
      "Available endpoints:\n" +
      "• GET  /health - Health check\n" +
      "• POST /admin/run-job - Manual trigger (requires X-Manual-Trigger header)\n\n" +
      "Cron schedule: Every 30 minutes",
      { 
        status: 200,
        headers: { "Content-Type": "text/plain" }
      }
    )
  },

  /**
   * Cron job handler - runs every 30 minutes
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const startTime = Date.now()
    console.log("⏰ Cron job triggered at:", new Date().toISOString())
    
    try {
      console.log("🔧 Environment check:")
      console.log("- ENGINE_BASE_URL:", env.ENGINE_BASE_URL ? "✅ Set" : "❌ Missing")
      console.log("- INTERNAL_TOKEN:", env.INTERNAL_TOKEN ? "✅ Set" : "❌ Missing")
      
      const result = await runYoutubePull(env)
      
      const duration = Date.now() - startTime
      if (result.success) {
        console.log(`✅ Cron job succeeded in ${duration}ms:`, result.message)
      } else {
        console.error(`❌ Cron job failed in ${duration}ms:`, result.message)
      }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`💥 Cron job crashed in ${duration}ms:`, error)
    }
  }
}
