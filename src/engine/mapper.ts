// src/engine/mapper.ts

import type { ParsedVideoEntry } from "../rss/parse";

export interface EngineVideoPayload {
  source: "youtube";
  video_id: string;
  channel_id: string;
  title: string;
  published_at: string;
  ingested_at: string;
}

/**
 * Map parsed RSS entries into engine-ingestible payloads.
 *
 * Guarantees:
 * - Deterministic output
 * - ISO-8601 timestamps
 * - No mutation of input
 */
export function mapToEnginePayload(
  entries: ParsedVideoEntry[],
): EngineVideoPayload[] {
  if (!Array.isArray(entries)) {
    return [];
  }

  const ingestedAt = new Date().toISOString();

  return entries.map((entry) => ({
    source: "youtube",
    video_id: entry.videoId,
    channel_id: entry.channelId,
    title: entry.title,
    published_at: normalizeDate(entry.publishedAt),
    ingested_at: ingestedAt,
  }));
}

/**
 * Normalize RSS date → ISO-8601
 * Falls back safely.
 */
function normalizeDate(value: string): string {
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      return new Date(0).toISOString();
    }
    return d.toISOString();
  } catch {
    return new Date(0).toISOString();
  }
}
