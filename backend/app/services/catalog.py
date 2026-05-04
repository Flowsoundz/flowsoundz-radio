import json
from pathlib import Path
from typing import Any
from urllib.parse import quote

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_FILE = BASE_DIR / "app" / "data" / "catalog.json"
SONGS_DIR = BASE_DIR / "media" / "songs"
COVERS_DIR = BASE_DIR / "media" / "covers"


def load_catalog() -> list[dict[str, Any]]:
    with DATA_FILE.open("r", encoding="utf-8") as file:
        catalog = json.load(file)

    return [hydrate_song(song) for song in catalog]


def list_songs() -> list[dict[str, Any]]:
    return load_catalog()


def get_song_by_id(song_id: str) -> dict[str, Any] | None:
    return next((song for song in load_catalog() if song["id"] == song_id), None)


def get_audio_path(filename: str) -> Path | None:
    candidate = (SONGS_DIR / filename).resolve()

    if SONGS_DIR.resolve() not in candidate.parents:
        return None

    return candidate


def hydrate_song(song: dict[str, Any]) -> dict[str, Any]:
    audio_file = song["audio_file"]
    cover_file = song["cover_file"]
    audio_path = SONGS_DIR / audio_file
    cover_path = COVERS_DIR / cover_file

    return {
        **song,
        "audio_url": f"/stream/{quote(audio_file)}",
        "cover_url": f"/covers/{quote(cover_file)}",
        "audio_exists": audio_path.exists(),
        "cover_exists": cover_path.exists(),
    }
