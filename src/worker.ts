async function pushToEngine(
  payload: unknown[],
  env: Env,
): Promise<void> {
  try {
    const res = await fetch(env.UG_ENGINE_INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": env.U_INTERNAL_TOKEN,
      },
      body: JSON.stringify({ items: payload }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Ingest rejected:", res.status, text);
    }
  } catch (err) {
    console.error("Push failed:", err);
  }
}
