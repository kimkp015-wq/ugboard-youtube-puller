export interface Env {
  U_INTERNAL_TOKEN: string;
  UG_ENGINE_INGEST_URL: string;
}

async function pushToEngine(
  payload: unknown[],
  env: Env,
): Promise<void> {
  try {
    const res = await fetch(env.UG_ENGINE_INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 🔐 CANONICAL ENGINE AUTH
        scheme: "INTERNAL",
        credentials: env.U_INTERNAL_TOKEN,
      },
      body: JSON.stringify({ items: payload }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Ingest rejected:", res.status, text);
    } else {
      console.log("Ingest accepted:", res.status);
    }
  } catch (err) {
    console.error("Push failed:", err);
  }
}

export default {
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ) {
    // 🔥 NON-NEGOTIABLE LOG
    console.log("UGBOARD YOUTUBE WORKER CRON FIRED");

    // Minimal safe payload to prove execution
    const payload: unknown[] = [];

    ctx.waitUntil(pushToEngine(payload, env));
  },
};

