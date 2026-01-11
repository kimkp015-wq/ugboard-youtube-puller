// worker.ts

export interface Env {
  ENGINE_BASE_URL: string
  INTERNAL_TOKEN: string
  MANUAL_TRIGGER_TOKEN: string
}

// -------------------------
// YouTube channel list
// -------------------------
const YOUTUBE_CHANNELS = [
  { name: "Eddy Kenzo", channelId: "UCxxxxxxx1" },
  { name: "Masaka Kids Afrikana", channelId: "UCxxxxxxx2" },
  { name: "Triplets Ghetto Kids", channelId: "UCxxxxxxx3" },
  { name: "Sheebah Karungi", channelId: "UCxxxxxxx4" },
  { name: "Jose Chameleone", channelId: "UCxxxxxxx5" },
  { name: "Spice Diana", channelId: "UCxxxxxxx6" },
  { name: "David Lutalo", channelId: "UCxxxxxxx7" },
  { name: "Jehovah Shalom A Capella", channelId: "UCxxxxxxx8" },
  { name: "Pallaso", channelId: "UCxxxxxxx9" },
  { name: "Bobi Wine", channelId: "UCxxxxxxx10" },
  { name: "Bebe Cool", channelId: "UCxxxxxxx11" },
  { name: "Ykee Benda", channelId: "UCxxxxxxx12" },
  { name: "Swangz Avenue", channelId: "UCxxxxxxx13" },
  { name: "Black Market Afrika", channelId: "UCxxxxxxx14" },
  { name: "Cavton Music UG", channelId: "UCxxxxxxx15" },
  // Add more as needed
]

// -------------------------
// Helpers
// -------------------------

function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

function buildPayload() {
  return {
    items: YOUTUBE_CHANNELS.map((ch) => ({
      source: "youtube",
      external_id: ch.channelId,
      artist_name: ch.name,
      signals: {}, // optional placeholder for future metrics
    })),
  }
}

async function runYoutubePull(env: Env) {
  if (!env.ENGINE_BASE_URL || !validateUrl(env.ENGINE_BASE_URL)) {
    console.error("Invalid ENGINE_BASE_URL:", env.ENGINE_BASE_URL)
    return
  }

  if (!env.INTERNAL_TOKEN) {
    console.error("Missing INTERNAL_TOKEN")
    return
  }

  const url = `${env.ENGINE_BASE_URL}/ingest/youtube`
  const payload = buildPayload()

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.INTERNAL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runYoutubePull(env))
  },
}
