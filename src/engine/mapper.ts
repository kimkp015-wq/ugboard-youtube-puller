// src/engine/mapper.ts

import { FeedVideo, EngineIngestItem } from "../types";

export function mapToEnginePayload(
  videos: FeedVideo[],
): EngineIngestItem[] {
  return videos.map((v) => ({
    source: "youtube",
    external_id: v.videoId,
    title: v.title,
    published_at: v.publishedAt,
    channel_id: v.channelId,
  }));
}
