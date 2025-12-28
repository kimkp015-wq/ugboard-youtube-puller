// src/rss/fetch.ts

const YOUTUBE_RSS_BASE =
  "https://www.youtube.com/feeds/videos.xml?channel_id=";

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Fetch a YouTube channel RSS feed.
 *
 * Guarantees:
 * - Uses public RSS (no API key)
 * - Throws on non-200 responses
 * - Safe for Cloudflare Workers
 * - Returns raw XML text
 */
export async function fetchChannelFeed(
  channelId: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<string> {
  if (!channelId || typeof channelId !== "string") {
    throw new Error("Invalid channelId");
  }

  const url = `${YOUTUBE_RSS_BASE}${encodeURIComponent(channelId)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "UGBoardEngine/1.0 (+https://ugboard)",
        "Accept": "application/atom+xml",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(
        `YouTube RSS fetch failed (${res.status} ${res.statusText})`
      );
    }

    const text = await res.text();

    if (!text || !text.includes("<feed")) {
      throw new Error("Invalid RSS response received");
    }

    return text;
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("YouTube RSS fetch timed out");
    }

    throw err;
  } finally {
    clearTimeout(timeout);
  }
}