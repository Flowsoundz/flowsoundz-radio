# FlowSoundz Radio MVP

FlowSoundz Radio MVP is a beginner-friendly local music radio app built with:

- Next.js App Router
- TypeScript
- Tailwind CSS
- FastAPI
- Local JSON metadata
- Local media files

## Project structure

```text
flowsoundz-radio-mvp/
  frontend/
  backend/
  docs/
```

## Local run commands in Windows PowerShell

### 1. Start the backend

```powershell
cd C:\Users\adony\flowsoundz-radio-mvp\backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If `py` is not available:

```powershell
python -m venv .venv
```

### 2. Start the frontend in a second PowerShell window

```powershell
cd C:\Users\adony\flowsoundz-radio-mvp\frontend
Copy-Item .env.local.example .env.local
npm install
npm run dev
```

## Browser URLs to test

- Frontend app: `http://localhost:3000`
- Radio page: `http://localhost:3000/radio`
- Songs page: `http://localhost:3000/songs`
- Backend health check: `http://127.0.0.1:8000/health`
- Backend songs API: `http://127.0.0.1:8000/songs`

## What to add to local media folders

Place these files into `backend/media/songs`:

- `midnight_motion.mp3`
- `skyline_bounce.mp3`
- `focus_flame.mp3`

Place these files into `backend/media/covers`:

- `midnight_motion.jpg`
- `skyline_bounce.jpg`
- `focus_flame.jpg`

The file names must match `backend/app/data/catalog.json`.
