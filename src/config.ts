/**
 * Canonical list of monitored YouTube channels
 * Source of truth for ingestion
 */

export const YT_CHANNELS = [
  {
    name: "Bebe Cool",
    channelId: "UCxxxxxxxxxxxxxxxx",
  },
  {
    name: "Jose Chameleone",
    channelId: "UCxxxxxxxxxxxxxxxx",
  },
  {
    name: "Eddy Kenzo",
    channelId: "UCxxxxxxxxxxxxxxxx",
  },
  {
    name: "Azawi",
    channelId: "UCxxxxxxxxxxxxxxxx",
  },
  {
    name: "Spice Diana",
    channelId: "UCxxxxxxxxxxxxxxxx",
  },
] as const;

/**
 * Ingestion rules
 */
export const INGESTION_LIMITS = {
  MAX_VIDEOS_PER_CHANNEL: 20, // RSS cap
  MAX_AGE_DAYS: 30,           // Ignore very old uploads
};
