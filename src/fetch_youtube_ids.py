# src/fetch_youtube_ids.py

import json
import feedparser
from pathlib import Path

# -------------------------------
# Configuration: artist channels
# -------------------------------

CHANNELS = [
    {"name": "Eddy Kenzo", "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxx"},
    {"name": "Masaka Kids Afrikana", "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxx"},
    {"name": "Triplets Ghetto Kids", "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxx"},
    {"name": "Sheebah Karungi", "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxx"},
    {"name": "Jose Chameleone", "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxx"},
    {"name": "Spice Diana", "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxx"},
    {"name": "David Lutalo", "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxx"},
    {"name": "Jehovah Shalom A Capella", "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxx"},
    {"name": "Pallaso", "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxx"},
    {"name": "Bobi Wine", "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxx"},
    # Add remaining channels here...
]

OUTPUT_FILE = Path("src/youtube_items.json")


# -------------------------------
# Fetch latest videos per channel
# -------------------------------

def fetch_videos():
    items = []
    for channel in CHANNELS:
        feed = feedparser.parse(channel["url"])
        for entry in feed.entries:
            item = {
                "source": "youtube",
                "external_id": entry.yt_videoid,
                "title": entry.title,
                "channel": channel["name"],
                "url": entry.link,
            }
            items.append(item)
    return items


def main():
    videos = fetch_videos()
    OUTPUT_FILE.write_text(json.dumps({"items": videos}, indent=2, ensure_ascii=False))
    print(f"Saved {len(videos)} video items to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
