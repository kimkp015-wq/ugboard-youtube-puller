// src/utils.ts

import { DateTime } from "luxon"

// Africa/Kampala timezone
export const EAT = "Africa/Kampala"

/**
 * Return current timestamp in Africa/Kampala ISO format
 */
export function nowEAT(): string {
  return DateTime.now().setZone(EAT).toISO()
}

/**
 * Validate that a video item has required fields
 */
export function validateItem(item: any): boolean {
  return (
    item &&
    typeof item.source === "string" &&
    typeof item.external_id === "string"
  )
}

/**
 * Simple log wrapper
 */
export function logStatus(...args: any[]) {
  console.log("[UG WORKER]", ...args)
}
