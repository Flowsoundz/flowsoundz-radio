from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import health, songs, queue, stream

BASE_DIR = Path(__file__).resolve().parents[1]
COVERS_DIR = BASE_DIR / "media" / "covers"

app = FastAPI(
    title="FlowSoundz Radio API",
    version="0.1.0",
    description="Local-file FastAPI backend for the FlowSoundz Radio MVP.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(songs.router)
app.include_router(queue.router)
app.include_router(stream.router)

app.mount("/covers", StaticFiles(directory=COVERS_DIR), name="covers")


# TODO: Add AI DJ drops support.
# TODO: Add artist promo scheduling.
# TODO: Add analytics hooks for playback and engagement.
# TODO: Add royalties/reporting exports.
