export interface Env {
  ENGINE_BASE_URL: string
  INTERNAL_TOKEN: string
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const res = await fetch(
      `${env.ENGINE_BASE_URL}/internal/youtube/pull`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.INTERNAL_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    )

    console.log("ENGINE STATUS:", res.status)
  },
}
