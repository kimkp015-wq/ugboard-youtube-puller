// src/types.ts

export interface FeedVideo {
  videoId: string;
  channelId: string;
  title: string;
  publishedAt: string;
}

export interface EngineIngestItem {
  source: "youtube";
  external_id: string;
  title: string;
  published_at: string;
  channel_id: string;
}
