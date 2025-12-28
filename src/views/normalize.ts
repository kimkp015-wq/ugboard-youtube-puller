export function normalizeViewSnapshot(
  videoId: string,
  viewCount: number,
) {
  return {
    source: "youtube",
    external_id: `yt:${videoId}`,
    view_count: viewCount,
    captured_at: new Date().toISOString(),
  };
}
