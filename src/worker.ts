// worker.ts

export interface Env {
  ENGINE_BASE_URL: string
  INTERNAL_TOKEN: string
}

export default {
  // Cron handler — triggered by schedule
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    try {
      // Send POST request to your engine with empty items array
      const res = await fetch(`${env.ENGINE_BASE_URL}/ingest/youtube`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.INTERNAL_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: [] }), // ✅ fixed 422
      })

      // Log the HTTP status from FastAPI
      console.log("ENGINE STATUS:", res.status)
    } catch (err) {
      console.error("WORKER ERROR:", err)
    }
  },
}
