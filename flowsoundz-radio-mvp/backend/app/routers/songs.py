from fastapi import APIRouter, HTTPException

from app.services.catalog import get_song_by_id, list_songs

router = APIRouter(tags=["songs"])


@router.get("/songs")
def get_songs() -> list[dict]:
    return list_songs()


@router.get("/songs/{song_id}")
def get_song(song_id: str) -> dict:
    song = get_song_by_id(song_id)
    if song is None:
        raise HTTPException(status_code=404, detail="Song not found")

    return song
