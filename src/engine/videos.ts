// src/engine/videos.ts

import { ParsedVideo } from "./types";

/**
 * Normalize parsed RSS videos.
 * - Trims strings
 * - Drops invalid entries
 * - Never throws
 */
export function normalizeVideos(
  videos: ParsedVideo[],
): ParsedVideo[] {
  try {
    return videos
      .map((v) => ({
        videoId: v.videoId?.trim(),
        title: v.title?.trim(),
        publishedAt: v.publishedAt?.trim(),
        channelId: v.channelId?.trim(),
      }))
      .filter(
        (v) =>
          Boolean(v.videoId) &&
          Boolean(v.title) &&
          Boolean(v.publishedAt) &&
          Boolean(v.channelId),
      );
  } catch {
    return [];
  }
}
