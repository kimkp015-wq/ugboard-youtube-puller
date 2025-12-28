// src/engine/push.ts

import { EngineVideoPayload } from "./types";

/**
 * Push batch to UG Board Engine.
 * - Never throws
 * - Logs failures only
 */
export async function pushToEngine(
  payload: EngineVideoPayload[],
  ingestUrl: string,
  ingestToken: string,
): Promise<void> {
  if (!payload.length) return;

  try {
    const res = await fetch(ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ingestToken}`,
      },
      body: JSON.stringify({ items: payload }),
    });

    if (!res.ok) {
      console.error(
        "UG Engine rejected payload:",
        res.status,
        await safeText(res),
      );
    }
  } catch (err) {
    console.error("Push to UG Engine failed:", err);
  }
}

/**
 * Safe response reader.
 */
async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
