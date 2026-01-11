export interface Env {
  ENGINE_BASE_URL: string
  INTERNAL_TOKEN: string
  MANUAL_TRIGGER_TOKEN: string
}

// -------------------------
// Helpers
// -------------------------

function validateUrl(url: string) {
  try {
    new URL(url)
    return true
  } catch (err) {
    return false
  }
}

// -------------------------
// YouTube Channels
// -------------------------

const YOUTUBE_CHANNELS = [
  // Mainstream Artists
  { source: "youtube", external_id: "UC6-Bm3TkbOOGh0uEfbRxeQg", name: "Eddy Kenzo" },
  { source: "youtube", external_id: "UCd6-4yHh0d1D8tG4Adq5dxg", name: "Masaka Kids Afrikana" },
  { source: "youtube", external_id: "UCX2e4bzG3KbLZfYh_2qY3Ug", name: "Triplets Ghetto Kids" },
  { source: "youtube", external_id: "UCX8iFPLmxT2-6xO2Hql3k7g", name: "Sheebah Karungi" },
  { source: "youtube", external_id: "UCvG7h1IUhsnPUL2vH6_CrDA", name: "Jose Chameleone" },
  { source: "youtube", external_id: "UCvDdlXfZ9xV5v_3cMyZZFJg", name: "Spice Diana" },
  { source: "youtube", external_id: "UCybpK5pJcLrE6kq5ZP1fqTg", name: "David Lutalo" },
  { source: "youtube", external_id: "UCfV7KQ_JZy_lw4CW3v0Tr5w", name: "Jehovah Shalom A Capella" },
  { source: "youtube", external_id: "UC6YPl3vP5joxU7R3F8A1jlw", name: "Pallaso" },
  { source: "youtube", external_id: "UCQ0sN6E2dJwRWl0tF9x6k2A", name: "Bobi Wine" },
  { source: "youtube", external_id: "UC1-jZwTGR7Lj_Q0fZz1U69A", name: "Radio & Weasel Goodlyfe" },
  { source: "youtube", external_id: "UCxPZrjOaC0I5n2KSPzM1X1A", name: "Bebe Cool" },
  { source: "youtube", external_id: "UCkRJq6mXxJH1m7s_A5P7cXw", name: "Ykee Benda" },
  { source: "youtube", external_id: "UC7gX9H0rD9t9lFfkjQ5Ff6Q", name: "B2C Entertainment" },
  { source: "youtube", external_id: "UC-Qj2uX2xLRy0OzpT5Wv6Fg", name: "Fik Fameica" },
  { source: "youtube", external_id: "UCs3y1e1w-FJzXhP0z4q6jRQ", name: "King Saha Official" },
  { source: "youtube", external_id: "UCfFg1JdFgO9D6j3Zx4j8kMg", name: "Pastor Wilson Bugembe" },
  { source: "youtube", external_id: "UCN2M2v5kxPj9sJxV5nF1cDw", name: "Azawi" },

  // Emerging & Genre-Specific Artists
  { source: "youtube", external_id: "UCXy2BaRXh8R2KjXY1XYG6kA", name: "Joshua Baraka" },
  { source: "youtube", external_id: "UCiR7x-Q0Nd-UQJxPZh5O9CQ", name: "Chosen Becky" },
  { source: "youtube", external_id: "UC4tJlpOW8-6xH9x6jN9rZJQ", name: "Lydia Jazmine" },
  { source: "youtube", external_id: "UCwPQtH3kLyx7dD9qX3h8mZg", name: "Vinka" },
  { source: "youtube", external_id: "UCp2mI9oE0x9bL8jL2kFq3mQ", name: "Alien Skin Official" },
  { source: "youtube", external_id: "UCd9KqX8u9M5hJ3hX9X2k4rQ", name: "Rema Namakula" },
  { source: "youtube", external_id: "UCfJ3XoL1tH7kPqP7f9G8j1Q", name: "Juliana Kanyomozi" },
  { source: "youtube", external_id: "UCXk3qO8rF9L6jR4p6Q8x5g", name: "Nana Nyadia" },

  // Record Labels / Music Hubs
  { source: "youtube", external_id: "UC6v6q3P8rL6jH9xK3f5R2g", name: "Swangz Avenue" },
  { source: "youtube", external_id: "UCXy8R3pK6mL5vH8nQ2jF1g", name: "Black Market Afrika" },
  { source: "youtube", external_id: "UCwP6QXy9H2L8vJ9kF3t5Qg", name: "Cavton Music UG" },
]

// -------------------------
// Core job logic
// -------------------------

async function runYoutubePull(env: Env) {
  const url = `${env.ENGINE_BASE_URL}/ingest/youtube`

  if (!validateUrl(url)) {
    console.error("Invalid ENGINE_BASE_URL:", url)
    return
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.INTERNAL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items: YOUTUBE_CHANNELS }),
    })
    console.log("ENGINE STATUS:", res.status)
  } catch (err) {
    console.error("ENGINE ERROR:", err)
  }
}

// -------------------------
// Worker Export
// -------------------------

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url)

    if (
      url.pathname === "/admin/run-job" &&
      request.headers.get("X-Manual-Trigger") === env.MANUAL_TRIGGER_TOKEN
    ) {
      await runYoutubePull(env)
      return new Response("Job manually triggered!", { status: 200 })
    }

    return new Response("Hello from UG Board Worker!", { status: 200 })
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runYoutubePull(env))
  },
}
