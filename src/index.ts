import { CHANNELS } from "./feeds/channels";
import { fetchChannelFeed } from "./rss/fetch";
import { parseFeed } from "./rss/parse";
import { normalizeEntry } from "./rss/normalize";
import { postToEngine } from "./client/engine";
import { dedupe } from "./guards/dedupe";
import { nowIso } from "./utils/time";
import { log } from "./utils/log";

export default {
  async fetch(
    _req: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // This worker is CRON-only
    return new Response("OK", { status: 200 });
  },

  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ) {
    log.info("cron.start", { at: nowIso() });

    const seen = new Set<string>();
    let posted = 0;

    for (const channel of CHANNELS) {
      try {
        const xml = await fetchChannelFeed(channel.id);
        if (!xml) continue;

        const entries = parseFeed(xml);

        for (const entry of entries) {
          if (dedupe(seen, entry.videoId)) continue;

          const payload = normalizeEntry(entry, channel);

          const ok = await postToEngine(payload, env);
          if (ok) posted++;
        }
      } catch (err) {
        // HARD RULE: never crash the whole run
        log.error("channel.failed", {
          channel: channel.id,
          error: String(err),
        });
        continue;
      }
    }

    log.info("cron.complete", {
      posted,
      finished_at: nowIso(),
    });
  },
};
