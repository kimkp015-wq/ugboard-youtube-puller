async function runYoutubePull(env: Env): Promise<{ success: boolean; message: string }> {
  const engineBase = env.ENGINE_BASE_URL.replace(/\/+$/, "")
  const url = `${engineBase}/ingest/youtube`

  const headers = {
    "Content-Type": "application/json",
    "X-Internal-Token": env.INTERNAL_TOKEN,  // ← CORRECT HEADER
    "X-Request-ID": crypto.randomUUID(),
    "User-Agent": "UG-Board-YouTube-Puller/1.0"
  }
  
  // Remove "Authorization", "scheme", "credentials" headers
  // ... rest of your code
}
