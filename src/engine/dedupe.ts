// src/engine/dedupe.ts

type VideoLike = {
  videoId: string;
};

export function dedupeByVideoId<T extends VideoLike>(
  items: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];

  for (const item of items) {
    if (!item.videoId) continue;

    if (seen.has(item.videoId)) continue;

    seen.add(item.videoId);
    out.push(item);
  }

  return out;
}
