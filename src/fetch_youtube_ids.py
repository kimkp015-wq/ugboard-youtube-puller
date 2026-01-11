# src/fetch_youtube_ids.py

import json
from pathlib import Path

CHANNELS = [
    {"name": "Eddy Kenzo", "id": "UC-eddykenzo", "subscribers": 2760000},
    {"name": "Masaka Kids Afrikana", "id": "UC-masakakids", "subscribers": 4470000},
    {"name": "Triplets Ghetto Kids", "id": "UC-tripletsghetto", "subscribers": 2100000},
    {"name": "Sheebah Karungi", "id": "UC-sheebah", "subscribers": 816000},
    {"name": "Jose Chameleone", "id": "UC-chameleone", "subscribers": 777000},
    {"name": "Spice Diana", "id": "UC-spicediana", "subscribers": 646000},
    # Add all other artists here...
]

OUTPUT_FILE = Path(__file__).parent / "youtube_items.json"

def main():
    items = []
    for ch in CHANNELS:
        items.append({
            "source": "youtube",
            "external_id": ch["id"],
            "artist_name": ch["name"],
            "subscribers": ch["subscribers"]
        })

    OUTPUT_FILE.write_text(json.dumps({"items": items}, indent=2))
    print(f"Generated {len(items)} YouTube items → {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
