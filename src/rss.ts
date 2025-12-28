/**
 * YouTube RSS ingestion (FREE)
 * Source: https://www.youtube.com/feeds/videos.xml
 */

import { YT_CHANNELS, INGESTION_LIMITS } from "./config";

export type RawVideo = {
  videoId: string;
  title: string;
  publishedAt: string;
  channelName: string;
};

const YT_RSS_BASE = "https://www.youtube.com/feeds/videos.xml";

/**
 * Fetch and parse RSS feed for a single channel
 */
export async function fetchChannelFeed(
  channelId: string,
  channelName: string
): Promise<RawVideo[]> {
  const url = `${YT_RSS_BASE}?channel_id=${channelId}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "UG-Board-Engine/1.0",
    },
  });

  if (!res.ok) {
    return [];
  }

  const xml = await res.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");

  const entries = Array.from(doc.getElementsByTagName("entry"));

  const videos: RawVideo[] = [];

  for (const entry of entries.slice(0, INGESTION_LIMITS.MAX_VIDEOS_PER_CHANNEL)) {
    const videoId =
      entry.getElementsByTagName("yt:videoId")[0]?.textContent || null;

    const title =
      entry.getElementsByTagName("title")[0]?.textContent || null;

    const published =
      entry.getElementsByTagName("published")[0]?.textContent || null;

    if (!videoId || !title || !published) continue;

    // Age guard
    const ageDays =
      (Date.now() - new Date(published).getTime()) / (1000 * 60 * 60 * 24);

    if (ageDays > INGESTION_LIMITS.MAX_AGE_DAYS) continue;

    videos.push({
      videoId,
      title,
      publishedAt: published,
      channelName,
    });
  }

  return videos;
}

/**
 * Pull all configured channels
 */
export async function fetchAllChannels(): Promise<RawVideo[]> {
  const results: RawVideo[] = [];

  for (const ch of YT_CHANNELS) {
    try {
      const videos = await fetchChannelFeed(ch.channelId, ch.name);
      results.push(...videos);
    } catch {
      // NEVER crash ingestion
      continue;
    }
  }

  return results;
}
