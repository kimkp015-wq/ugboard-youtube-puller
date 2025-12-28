export function parseViewCount(
  html: string,
): number | null {
  try {
    const match = html.match(
      /"viewCount":"(\d+)"/
    );

    if (!match) return null;

    return Number(match[1]);
  } catch {
    return null;
  }
}