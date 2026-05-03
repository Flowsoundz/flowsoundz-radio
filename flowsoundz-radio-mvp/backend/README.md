# FlowSoundz Radio Backend

This backend is a FastAPI app that reads song metadata from local JSON and streams local MP3 files.

## Run locally in Windows PowerShell

```powershell
cd C:\Users\adony\flowsoundz-radio-mvp\backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If `py` is not available on your machine, replace the first command with:

```powershell
python -m venv .venv
```

## API routes

- `GET /health`
- `GET /songs`
- `GET /songs/{song_id}`
- `GET /queue?vibe=late_night`
- `GET /stream/{filename}`

## Media folders

- `media/songs`
- `media/covers`
- `media/drops`
