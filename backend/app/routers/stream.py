from mimetypes import guess_type

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.services.catalog import get_audio_path

router = APIRouter(tags=["stream"])


@router.get("/stream/{filename}")
def stream_song(filename: str) -> FileResponse:
    file_path = get_audio_path(filename)

    if file_path is None or not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    media_type = guess_type(file_path.name)[0] or "application/octet-stream"
    return FileResponse(file_path, media_type=media_type, filename=file_path.name)
