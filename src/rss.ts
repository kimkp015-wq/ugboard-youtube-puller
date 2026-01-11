// src/rss.ts

import { YOUTUBE_CHANNELS, YouTubeChannel } from "./config"
import { validateItem } from "./utils"

export interface VideoItem {
  source: string
  external_id: string
  title: string
  channel: string
  published_at: string
}

/**
 * Convert RSS feed entry to VideoItem
 */
function mapFeedEntry(channel: YouTubeChannel, entry: any): VideoItem | null {
  try {
    const id = entry.id?.["#text"]?.split(":")?.pop() || entry.id?.["#text"]
    const title = entry.title?.["#text"] || entry.title
    const published = entry.published?.["#text"] || entry.published

    const item: VideoItem = {
      source: "youtube",
      external_id: id,
      title: title,
      channel: channel.name,
      published_at: published,
    }

    return validateItem(item) ? item : null
  } catch {
    return null
  }
}

/**
 * Fetch videos for a channel using RSS
 */
export async function fetchChannelVideos(channel: YouTubeChannel): Promise<VideoItem[]> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`

  try {
    const res = await fetch(url)
    if (!res.ok) return []

    const text = await res.text()
    const parser = new DOMParser()
    const xml = parser.parseFromString(text, "application/xml")
    const entries = Array.from(xml.querySelectorAll("entry"))

    const videos = entries
      .map(entry => mapFeedEntry(channel, entry))
      .filter((v): v is VideoItem => v !== null)

    return videos
  } catch (err) {
    console.error("RSS FETCH ERROR", err)
    return []
  }
}

/**
 * Fetch all channels
 */
export async function fetchAllVideos(): Promise<VideoItem[]> {
  const all: VideoItem[] = []
  for (const channel of YOUTUBE_CHANNELS) {
    const videos = await fetchChannelVideos(channel)
    all.push(...videos)
  }
  return all
}
