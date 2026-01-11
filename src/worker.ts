// worker.ts

export interface Env {
  ENGINE_BASE_URL: string
  INTERNAL_TOKEN: string
  MANUAL_TRIGGER_TOKEN: string
}

// -------------------------
// Load video items from a JSON file (built by fetch_youtube_ids.py)
// -------------------------
async function loadYoutubeItems(): Promise<any[]> {
  try {
    // For Cloudflare Workers, we need to bundle JSON at build time
    // If using Wrangler, place youtube_items.json in `src/` and import it:
    // import youtubeItems from './youtube_items.json'
    const response = await fetch(new URL('./youtube_items.json', import.meta.url))
    const data = await response.json()
    return data.items ?? []
  } catch (err) {
    console.error('Failed to load YouTube items:', err)
    return []
  }
}

// -------------------------
// Core job logic
// -------------------------
async function runYoutubePull(env: Env) {
  const items = await loadYoutubeItems()
  if (items.length === 0) {
    console.log('No YouTube items to send.')
    return
  }

  try {
    const res = await fetch(`${env.ENGINE_BASE_URL}/ingest/youtube`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.INTERNAL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
    })
    console.log('ENGINE STATUS:', res.status)
  } catch (err) {
    console.error('ENGINE ERROR:', err)
  }
}

// -------------------------
// Exported Worker
// -------------------------
export default {
  // Manual HTTP trigger
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url)

    // Only trigger if secret matches
    if (
      url.pathname === '/admin/run-job' &&
      request.headers.get('X-Manual-Trigger') === env.MANUAL_TRIGGER_TOKEN
    ) {
      await runYoutubePull(env)
      return new Response('Job manually triggered!', { status: 200 })
    }

    return new Response('Hello from UG Board Worker!', { status: 200 })
  },

  // Scheduled cron trigger
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runYoutubePull(env))
  },
}
