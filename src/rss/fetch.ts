// src/rss/fetch.ts

export async function fetchChannelFeed(
  channelId: string,
): Promise<string | null> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "ugboard-puller/1.0" },
    });

    if (!res.ok) {
      console.error("RSS fetch failed", channelId, res.status);
      return null;
    }

    return await res.text();
  } catch (err) {
    console.error("RSS network error", channelId, err);
    return null;
  }
}
