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
      // SIMPLIFIED HEADERS - Only X-Internal-Token needed
      const headers = {
        "Content-Type": "application/json",
        "X-Internal-Token": env.INTERNAL_TOKEN,
        "X-Request-ID": crypto.randomUUID(),
        "User-Agent": "UG-Board-YouTube-Puller/1.0"
      }

      console.log(`📤 Attempt ${attempt}: Calling ${url}`)
      console.log(`🔑 Token present: ${env.INTERNAL_TOKEN ? 'Yes' : 'No'}`)
      
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
