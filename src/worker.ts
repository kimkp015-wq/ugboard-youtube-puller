const res = await fetch(`${env.ENGINE_BASE_URL}/ingest/youtube`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${env.INTERNAL_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ items: [] })  // << MUST include this
});
