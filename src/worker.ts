import Parser from "rss-parser"

export interface Env {
  ENGINE_BASE_URL: string
  INTERNAL_TOKEN: string
  MANUAL_TRIGGER_TOKEN: string
  VIDEO_CACHE: KVNamespace
}

const parser = new Parser()
const MAX_VIDEOS_PER_CHANNEL = 5
const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 500 // start with 0.5s

const YOUTUBE_CHANNELS = [
  { source: "youtube", external_id: "UC6-Bm3TkbOOGh0uEfbRxeQg", name: "Eddy Kenzo" },
  { source: "youtube", external_id: "UCd6-4yHh0d1D8tG4Adq5dxg", name: "Masaka Kids Afrikana" },
  // ... add all other channels here
]

// -------------------------
// Utility Functions
// -------------------------
function validateUrl(url: string) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

function mapRssToItems(
  channel: { source: string; external_id: string; name: string },
  feed: any
) {
  return feed.items.slice(0, MAX_VIDEOS_PER_CHANNEL).map((item: any) => ({
    source: channel.source,
    external_id: item.id.replace("yt:video:", ""),
    title: item.title,
    url: item.link,
    published_at: item.pubDate,
    artist: channel.name,
  }))
}

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, options)
      if (res.ok) return res
      console.warn(`Fetch attempt ${attempt + 1} failed with status ${res.status}`)
    } catch (err) {
      console.warn(`Fetch attempt ${attempt + 1} error:`, err)
    }
    await new Promise((r) => setTimeout(r, RETRY_BASE_DELAY_MS * Math.pow(2, attempt)))
  }
  throw new Error(`Failed to fetch ${url} after ${retries} attempts`)
}

// -------------------------
// Core Job Logic
// -------------------------
async function runYoutubePull(env: Env) {
  const engineUrl = `${env.
