# scripts/fetch_youtube_ids.py

import os
import json
import requests

# --------------------------
# Configuration
# --------------------------
API_KEY = os.getenv("YOUTUBE_API_KEY")  # Set your API key in environment
SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

ARTISTS = [
    # Mainstream
    "Eddy Kenzo",
    "Masaka Kids Afrikana",
    "Triplets Ghetto Kids",
    "Sheebah Karungi",
    "Jose Chameleone",
    "Spice Diana",
    "David Lutalo",
    "Jehovah Shalom A Capella",
    "Pallaso",
    "Bobi Wine",
    "Radio & Weasel Goodlyfe",
    "Bebe Cool",
    "Ykee Benda",
    "B2C Entertainment",
    "Fik Fameica",
    "King Saha Official",
    "Pastor Wilson Bugembe",
    "Azawi",
    # Emerging
    "Joshua Baraka",
    "Chosen Becky",
    "Lydia Jazmine",
    "Vinka",
    "Alien Skin Official",
    "Rema Namakula",
    "Juliana Kanyomozi",
    "Nana Nyadia",
    # Labels
    "Swangz Avenue",
    "Black Market Afrika",
    "Cavton Music UG",
]

# --------------------------
# Helper function
# --------------------------
def get_channel_id(name: str) -> str:
    params = {
        "part": "snippet",
        "q": name,
        "type": "channel",
        "maxResults": 1,
        "key": API_KEY,
    }
    response = requests.get(SEARCH_URL, params=params)
    data = response.json()
    items = data.get("items", [])
    if not items:
        return ""
    return items[0]["snippet"]["channelId"]

# --------------------------
# Main
# --------------------------
def main():
    channels = []
    for artist in ARTISTS:
        channel_id = get_channel_id(artist)
        if not channel_id:
            print(f"[WARN] Could not find channel for {artist}")
            continue
        channels.append({
            "id": channel_id,
            "name": artist
        })
        print(f"[OK] {artist} → {channel_id}")

    # Save to JSON
    with open("src/youtube_channels.json", "w", encoding="utf-8") as f:
        json.dump(channels, f, indent=2)
    print("\n✅ Channels saved to src/youtube_channels.json")

if __name__ == "__main__":
    main()
