// src/rss/parse.ts

import { FeedVideo } from "../types";

export function parseFeed(
  xml: string,
  channelId: string,
): FeedVideo[] {
  try {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const entries = Array.from(doc.querySelectorAll("entry"));

    return entries.map((entry) => ({
      videoId:
        entry.querySelector("yt\\:videoId")?.textContent ?? "",
      channelId,
      title:
        entry.querySelector("title")?.textContent ?? "",
      publishedAt:
        entry.querySelector("published")?.textContent ?? "",
    }))
    .filter(v => v.videoId && v.title);
  } catch {
    return [];
  }
}
