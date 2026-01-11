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
    {"name": "David Lutalo", "id": "UC-davidlutalo", "subscribers": 539000},
    {"name": "Jehovah Shalom A Capella", "id": "UC-jeshalom", "subscribers": 514000},
    {"name": "Pallaso", "id": "UC-pallaso", "subscribers": 505000},
    {"name": "Bobi Wine", "id": "UC-bobiwine", "subscribers": 447000},
    {"name": "Radio & Weasel Goodlyfe", "id": "UC-goodlyfe", "subscribers": 423000},
    {"name": "Bebe Cool", "id": "UC-bebecool", "subscribers": 394000},
    {"name": "Ykee Benda", "id": "UC-ykeebenda", "subscribers": 317000},
    {"name": "B2C Entertainment", "id": "UC-b2c", "subscribers": 290000},
    {"name": "Fik Fameica", "id": "UC-fikfameica", "subscribers": 287000},
    {"name": "King Saha Official", "id": "UC-kingsaha", "subscribers": 257000},
    {"name": "Pastor Wilson Bugembe", "id": "UC-wilsonbugembe", "subscribers": 253000},
    {"name": "Azawi", "id": "UC-azawi", "subscribers": 252000},
]

OUTPUT_FILE = Path(__file__).parent / "youtube_items.json"

def main():
    items = [
        {
            "source": "youtube",
            "external_id": ch["id"],
            "artist_name": ch["name"],
            "subscribers": ch["subscribers"],
        }
        for ch in CHANNELS
    ]
    OUTPUT_FILE.write_text(json.dumps({"items": items}, indent=2))
    print(f"[INFO] Generated {len(items)} YouTube items → {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
