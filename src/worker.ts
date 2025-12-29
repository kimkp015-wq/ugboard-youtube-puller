// src/worker.ts

import { fetchChannelFeed } from "./rss/fetch";
import { parseFeed } from "./rss/parse";
import { mapToEnginePayload } from "./engine/mapper";
import { EngineIngestItem } from "./types";

export interface Env {
  UG_ENGINE_INGEST_URL: string;
  UG_ENGINE_INGEST_TOKEN: string;
  YOUTUBE_CHANNELS: string; // comma-separated channel IDs
}

export default {
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(runIngestion(env));
  },
};

/**
 * Main ingestion flow.
 * Never throws.
 */
async function runIngestion(env: Env): Promise<void> {
  try {
    const channels = parseChannels(env.YOUTUBE_CHANNELS);
    if (channels.length === 0) return;

    // 🔒 Dedupe store (per run)
    const seen = new Set<string>();

    for (const channelId of channels) {
      await ingestChannel(channelId, env, seen);
    }
  } catch (err) {
    console.error("Worker fatal error:", err);
  }
}

/**
 * Process one channel safely.
 */
async function ingestChannel(
  channelId: string,
  env: Env,
  seen: Set<string>,
): Promise<void> {
  try {
    const xml = await fetchChannelFeed(channelId);
    if (!xml) return;

    const parsed = parseFeed(xml, channelId);
    if (parsed.length === 0) return;

    let payload = mapToEnginePayload(parsed);
    if (payload.length === 0) return;

    // 🔁 DEDUPE
    payload = dedupePayload(payload, seen);
    if (payload.length === 0) return;

    await pushToEngine(payload, env);
  } catch (err) {
    console.error(`Channel ${channelId} failed`, err);
  }
}

/**
 * Remove duplicates within this run.
 */
function dedupePayload(
  items: EngineIngestItem[],
  seen: Set<string>,
): EngineIngestItem[] {
  const out: EngineIngestItem[] = [];

  for (const item of items) {
    const key = `${item.source}:${item.external_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

/**
 * Push batch to UG Board Engine.
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
      console.error("Ingest rejected:", res.status);
    }
  } catch (err) {
    console.error("Push failed:", err);
  }
}

/**
 * Parse comma-separated channels safely.
 */
function parseChannels(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}
