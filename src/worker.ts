import Parser from "rss-parser" // npm install rss-parser

export interface Env {
  ENGINE_BASE_URL: string
  INTERNAL_TOKEN: string
  MANUAL_TRIGGER_TOKEN: string
}

const parser = new Parser()

// -------------------------
// YouTube Channels
// -------------------------
const YOUTUBE_CHANNELS = [
  { source: "youtube", external_id: "UC6-Bm3TkbOOGh0uEfbRxeQg", name: "Eddy Kenzo" },
  { source: "youtube", external_id: "UCd6-4yHh0d1D8tG4Adq5dxg", name: "Masaka Kids Afrikana" },
  // ... include all channels here as before
]

// -------------------------
// Helpers
// -------------------------
function validateUrl(url: string) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Convert RSS feed items into Engine item format
function mapRssToItems(channel: { source: string, external_id: string, name: string }, feed: any) {
  return feed.items.map((item: any) => ({
    source: channel.source,
    external_id: item.id.replace("yt:video:", ""),
    title: item.title,
    url: item.link,
    published_at: item.pubDate,
    artist: channel.name,
  }))
}

// -------------------------
// Core job logic
// -------------------------
async function runYoutubePull(env: Env) {
  const engineUrl = `${env.ENGINE_BASE_URL}/ingest/youtube`

  if (!validateUrl(engineUrl)) {
    console.error("Invalid ENGINE_BASE_URL:", engineUrl)
    return
  }

  let allItems: any[] = []

  for (const channel of YOUTUBE_CHANNELS) {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.external_id}`
    try {
      const feed = await parser.parseURL(rssUrl)
      const items = mapRssToItems(channel, feed)
      allItems.push(...items)
    } catch (err) {
      console.error(`Failed to fetch RSS for ${channel.name}:`, err)
    }
  }

  if (!allItems.length) {
    console.log("No new videos to ingest.")
    return
  }

  try {
    const res = await fetch(engineUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.INTERNAL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items: allItems }),
    })
    console.log("ENGINE STATUS:", res.status)
  } catch (err) {
    console.error("ENGINE ERROR:", err)
  }
}

// -------------------------
// Worker Export
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
