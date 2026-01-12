export interface Env {
  ENGINE_BASE_URL: string
  INTERNAL_TOKEN: string
  MANUAL_TRIGGER_TOKEN?: string
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
      const requestId = crypto.randomUUID()
      console.log(`📤 Attempt ${attempt}: Calling ${url} [${requestId}]`)

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "X-Internal-Token": env.INTERNAL_TOKEN,
          "Content-Type": "application/json",
          "X-Request-ID": requestId,
          "User-Agent": "UG-Board-YouTube-Puller/1.0"
        },
        body: JSON.stringify(payload),
      })

      console.log(`ENGINE STATUS (attempt ${attempt}):`, res.status, `[${requestId}]`)

      if (res.ok) {
        const responseText = await res.text()
        return { 
          success: true, 
          message: `Success! Engine returned ${res.status}: ${responseText}` 
        }
      }
      
      const errorText = await res.text()
      console.warn(`Attempt ${attempt}: Received ${res.status}:`, errorText, `[${requestId}]`)
      
      if (res.status >= 400 && res.status < 500) {
        return { success: false, message: `Engine error ${res.status}: ${errorText}` }
      }
    } catch (err) {
      console.error(`Attempt ${attempt}: Fetch error`, err)
    }

    if (attempt < maxRetries) {
      const delay = 500 * Math.pow(2, attempt - 1)
      await new Promise((r) => setTimeout(r, delay))
    }
  }

  const error = "Failed to send payload to engine after all retries"
  console.error(error)
  return { success: false, message: error }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const requestId = crypto.randomUUID()
    const startTime = Date.now()

    console.log(JSON.stringify({
      event: "request_start",
      requestId,
      method: request.method,
      path: url.pathname,
      time: new Date().toISOString()
    }))

    // Health check endpoint
    if (url.pathname === "/health") {
      const response = {
        status: "healthy",
        engine_url_set: !!env.ENGINE_BASE_URL,
        has_internal_token: !!env.INTERNAL_TOKEN,
        has_manual_token: !!env.MANUAL_TRIGGER_TOKEN,
        manual_token_source: env.MANUAL_TRIGGER_TOKEN ? "environment" : "default (test123)",
        timestamp: new Date().toISOString(),
        version: "2.2-full-fix"
      }
      
      console.log(JSON.stringify({
        event: "health_check",
        requestId,
        response,
        durationMs: Date.now() - startTime
      }))

      return new Response(
        JSON.stringify(response),
        { 
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            "X-Request-ID": requestId
          }
        }
      )
    }

    // Manual trigger path with fallback token
    if (url.pathname === "/admin/run-job") {
      const manualToken = env.MANUAL_TRIGGER_TOKEN || "test123"
      const receivedToken = request.headers.get("X-Manual-Trigger")
      
      console.log(JSON.stringify({
        event: "manual_trigger_check",
        requestId,
        received_token: receivedToken ? "present" : "missing",
        expected_token: manualToken,
        token_match: receivedToken === manualToken,
        token_source: env.MANUAL_TRIGGER_TOKEN ? "env" : "default"
      }))

      if (receivedToken === manualToken) {
        console.log(JSON.stringify({
          event: "manual_trigger_start",
          requestId,
          time: new Date().toISOString()
        }))

        const result = await runYoutubePull(env)
        const duration = Date.now() - startTime
        
        console.log(JSON.stringify({
          event: "manual_trigger_complete",
          requestId,
          success: result.success,
          durationMs: duration,
          message: result.message
        }))

        return new Response(
          JSON.stringify({
            success: result.success,
            message: result.message,
            requestId,
            timestamp: new Date().toISOString(),
            durationMs: duration,
            token_source: env.MANUAL_TRIGGER_TOKEN ? "environment" : "default"
          }), 
          { 
            status: result.success ? 200 : 500,
            headers: { 
              "Content-Type": "application/json",
              "X-Request-ID": requestId
            }
          }
        )
      }
    }

    // Default response
    const defaultResponse = {
      service: "UG Board YouTube Puller Worker",
      endpoints: [
        { method: "GET", path: "/health", description: "Health check" },
        { 
          method: "POST", 
          path: "/admin/run-job", 
          description: "Manual trigger",
          required_header: "X-Manual-Trigger",
          note: env.MANUAL_TRIGGER_TOKEN ? "Token from environment" : "Using default token: test123"
        }
      ],
      cron_schedule: "Every 30 minutes",
      requestId,
      timestamp: new Date().toISOString()
    }

    console.log(JSON.stringify({
      event: "default_response",
      requestId,
      path: url.pathname,
      durationMs: Date.now() - startTime
    }))

    return new Response(
      JSON.stringify(defaultResponse, null, 2),
      { 
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "X-Request-ID": requestId
        }
      }
    )
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const startTime = Date.now()
    const cronId = crypto.randomUUID()
    
    console.log(JSON.stringify({
      event: "cron_start",
      cronId,
      scheduledTime: event.scheduledTime,
      timestamp: new Date().toISOString()
    }))

    const result = await runYoutubePull(env)
    const duration = Date.now() - startTime
    
    console.log(JSON.stringify({
      event: result.success ? "cron_success" : "cron_failure",
      cronId,
      success: result.success,
      message: result.message,
      durationMs: duration,
      timestamp: new Date().toISOString()
    }))
  }
}
