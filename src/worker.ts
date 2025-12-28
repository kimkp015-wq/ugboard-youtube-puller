// src/worker.ts

import { fetchChannelFeed } from "./rss/fetch";
import { parseFeed } from "./rss/parse";
import { mapToEnginePayload } from "./engine/mapper";

/**
 * Environment bindings injected by Cloudflare.
 */
export interface Env {
  UG_ENGINE_INGEST_URL: string;
  UG_ENGINE_INGEST_TOKEN: string;
  YOUTUBE_CHANNELS: string; // comma-separated channel IDs
}

/**
 * Cloudflare Worker entrypoint.
 * Triggered ONLY by cron.
 */
export default {
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    // Never block the scheduler
    ctx.waitUntil(runIngestion(env));
  },
};

/**
 * Main ingestion flow.
 *
 * Guarantees:
 * - Never throws
 * - Never crashes the worker
 * - Each channel is isolated
 */
async function runIngestion(env: Env): Promise<void> {
  try {
    const channels = parseChannels(env.YOUTUBE_CHANNELS);
    if (channels.length === 0) {
      console.log("No YouTube channels configured");
      return;
    }

    for (const channelId of channels) {
      await ingestChannel(channelId, env);
    }
  } catch (err) {
    console.error("Worker fatal error:", err);
  }
}

/**
 * Ingest ONE channel safely.
 *
 * Failure here:
 * - does NOT affect other channels
 * - does NOT crash worker
 */
async function ingestChannel(
  channelId: string,
  env: Env,
): Promise<void> {
  try {
    // 1. Fetch RSS XML
    const xml = await fetchChannelFeed(channelId);
    if (!xml) {
      console.warn(`No RSS returned for channel ${channelId}`);
      return;
    }

    // 2. Parse RSS entries
    const entries = parseFeed(xml, channelId);
    if (entries.length === 0) {
      console.log(`No entries for channel ${channelId}`);
      return;
    }

    // 3. Normalize → engine payload
    const payload = mapToEnginePayload(entries);
    if (payload.length === 0) {
      console.log(`Nothing to push for channel ${channelId}`);
      return;
    }

    // 4. Push to engine
    await pushToEngine(payload, env);
  } catch (err) {
    console.error(`Channel ${channelId} failed`, err);
  }
}

/**
 * Push a batch to UG Board Engine ingestion endpoint.
 *
 * Engine is the source of truth.
 * Worker is stateless.
 */
async function pushToEngine(
  payload: unknown[],
  env: Env,
): Promise<void> {
  try {
    const res = await fetch(env.UG_ENGINE_INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.UG_ENGINE_INGEST_TOKEN}`,
      },
      body: JSON.stringify({ items: payload }),
    });

    if (!res.ok) {
      console.error(
        "Engine rejected ingest",
        res.status,
        await res.text(),
      );
    }
  } catch (err) {
    console.error("Push to engine failed:", err);
  }
}

/**
 * Parse comma-separated channel IDs safely.
 */
function parseChannels(value?: string): string[] {
  if (!value) return [];

  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
