export interface Env {
  ENGINE_BASE_URL: string
  INTERNAL_TOKEN: string
  MANUAL_TRIGGER_TOKEN?: string  // ← Made optional
}

function validateUrl(url: string) {
  try {
    new URL(url)
    return true
  } catch (err) {
    return false
  }
}

async function runYoutubePull(env: Env): Promise<{ success: boolean; message: string }> {
  const engineBase = env.ENGINE_BASE_URL.replace(/\/+$/, "")
  const url = `${engineBase}/ingest/youtube`

  if (!validateUrl(url)) {
    const error = `Invalid ENGINE_BASE_URL: ${url}`
    console.error(error)
    return { success: false, message: error }
  }

  const payload = { items: [] }

  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-Internal-Token": env.INTERNAL_TOKEN,
        "X-Request-ID": crypto.randomUUID(),
        "User-Agent": "UG-Board-YouTube-Puller/1.0"
      }

      console.log(`📤 Attempt ${attempt}: Calling ${url}`)
      
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
      
      if (res.status >= 400 && res.status < 500) {
        return { success: false, message: `Engine error ${res.status}: ${errorText}` }
      }
    } catch (err) {
      console.error(`Attempt ${attempt}: Fetch error`, err)
    }

    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)))
    }
  }

  const error = "Failed after all retries"
  console.error(error)
  return { success: false, message: error }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    // ← ADDED: Default token fallback
    const manualToken = env.MANUAL_TRIGGER_TOKEN || "test123"
    const receivedToken = request.headers.get("X-Manual-Trigger")
    
    // Manual trigger path with better logging
    if (url.pathname === "/admin/run-job") {
      console.log(`🔐 Manual trigger check:`, {
        received: receivedToken ? "yes" : "no",
        expected: manualToken,
        match: receivedToken === manualToken
      })
      
      if (receivedToken === manualToken) {
        console.log("🔄 Manual trigger authorized")
        const result = await runYoutubePull(env)
        
        return new Response(
          JSON.stringify({
            success: result.success,
            message: result.message,
            timestamp: new Date().toISOString(),
            note: env.MANUAL_TRIGGER_TOKEN ? "token from env" : "using default token"
          }), 
          { 
            status: result.success ? 200 : 500,
            headers: { "Content-Type": "application/json" }
          }
        )
      }
    }

    // Health check endpoint
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          engine_url_set: !!env.ENGINE_BASE_URL,
          has_token: !!env.INTERNAL_TOKEN,
          has_manual_token: !!env.MANUAL_TRIGGER_TOKEN,
          manual_token_source: env.MANUAL_TRIGGER_TOKEN ? "env" : "default",
          timestamp: new Date().toISOString(),
          version: "2.1-fallback-token"
        }),
        { headers: { "Content-Type": "application/json" } }
      )
    }

    // Default response
    return new Response(
      "UG Board YouTube Puller Worker\n\n" +
      "Endpoints:\n• GET  /health\n• POST /admin/run-job (X-Manual-Trigger header)\n" +
      "Cron: Every 30 minutes\n\n" +
      `Manual token: ${env.MANUAL_TRIGGER_TOKEN ? "Set" : "Using default (test123)"}`,
      { status: 200, headers: { "Content-Type": "text/plain" } }
    )
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log("⏰ Cron job triggered at:", new Date().toISOString())
    
    const result = await runYoutubePull(env)
    
    if (result.success) {
      console.log("✅ Cron job succeeded:", result.message)
    } else {
      console.error("❌ Cron job failed:", result.message)
    }
  }
}
