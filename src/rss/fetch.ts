export interface Env {
  U_INTERNAL_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Only allow POST
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // 🔐 AUTH CHECK
    const scheme = request.headers.get("scheme");
    const credentials = request.headers.get("credentials");

    if (scheme !== "INTERNAL" || credentials !== env.U_INTERNAL_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Unauthorized puller access" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // 🤝 HANDSHAKE RESPONSE
    return new Response(
      JSON.stringify({
        status: "ok",
        worker: "youtube-puller",
        handshake: true,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  },
};

