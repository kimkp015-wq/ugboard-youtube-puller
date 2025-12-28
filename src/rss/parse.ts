// src/rss/parse.ts

export interface ParsedVideoEntry {
  videoId: string;
  title: string;
  publishedAt: string;
  channelId: string;
}

/**
 * Parse YouTube RSS (Atom) XML into raw entries.
 *
 * Guarantees:
 * - No throws on malformed entries
 * - Skips invalid items safely
 * - Deterministic output
 */
export function parseYouTubeRSS(xml: string): ParsedVideoEntry[] {
  if (!xml || typeof xml !== "string") {
    return [];
  }

  let doc: Document;

  try {
    doc = new DOMParser().parseFromString(xml, "application/xml");
  } catch {
    return [];
  }

  const entries = Array.from(doc.getElementsByTagName("entry"));
  const results: ParsedVideoEntry[] = [];

  for (const entry of entries) {
    try {
      const videoId =
        entry.getElementsByTagName("yt:videoId")[0]?.textContent?.trim();

      const channelId =
        entry.getElementsByTagName("yt:channelId")[0]?.textContent?.trim();

      const title =
        entry.getElementsByTagName("title")[0]?.textContent?.trim();

      const publishedAt =
        entry.getElementsByTagName("published")[0]?.textContent?.trim();

      if (!videoId || !channelId || !publishedAt) {
        continue;
      }

      results.push({
        videoId,
        channelId,
        title: title ?? "",
        publishedAt,
      });
    } catch {
      // Skip malformed entry safely
      continue;
    }
  }

  return results;
}
