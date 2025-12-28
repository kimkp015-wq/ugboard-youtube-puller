// src/engine/types.ts

/**
 * Parsed video from YouTube RSS.
 * INTERNAL to the puller.
 */
export interface ParsedVideo {
  videoId: string;
  title: string;
  publishedAt: string;
  channelId: string;
}

/**
 * Payload sent to UG Board Engine.
 * MUST match ingestion contract.
 */
export interface EngineVideoPayload {
  source: "youtube";
  source_id: string;
  title: string;
  published_at: string;
  channel_id: string;
}
