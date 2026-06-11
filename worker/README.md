# FlowSoundz Mastering Worker

Loudness-normalizes incoming tracks (Suno / Udio / uploads) to broadcast-consistent
**-14 LUFS** and publishes radio-ready masters. This is "Stage 1" of the ingestion
pipeline — the automation that lets you add AI songs without hand-mastering each one.

## What it does

Polls the shared Neon database for songs queued for processing and, one at a time:

1. **Claims** the oldest `PENDING` song that has a `sourceAudioUrl`
   (atomic `FOR UPDATE SKIP LOCKED`, so you can run multiple instances).
2. **Downloads** the source audio (a Suno/Udio export URL, or an uploaded file).
3. **Masters** it with a two-pass EBU R128 `loudnorm` to -14 LUFS / -1 dBTP —
   this is the step that stops volume from jumping between tracks on air.
4. **Probes** the finished master for its exact duration (what the station clock
   schedules against — no more hand-typed, error-prone durations).
5. **Uploads** the master MP3 to Vercel Blob.
6. **Marks** the song `READY` with `publicAudioUrl` + `durationSec` filled in
   (or `FAILED` with the error in `packagingError`).

The Next.js app already treats `packagingStatus = READY` as "playable", and the
station clock requires `durationSec` — so a finished job goes live with no extra
steps.

## Deploy to Railway

1. Push this repo to GitHub (the worker can live in the same monorepo).
2. In Railway → **New Project → Deploy from GitHub repo**.
3. Set the service **Root Directory** to `worker/`. Railway auto-detects the
   `Dockerfile` (ffmpeg is installed in the image).
4. Add two environment variables (see `.env.example`):
   - `DATABASE_URL` — the same Neon string the Next.js app uses.
   - `BLOB_READ_WRITE_TOKEN` — from Vercel → Storage → your Blob store → Tokens.
5. Deploy. The logs show one line per job (`READY · 184s · https://...blob...`).

No public port is needed — it's a background worker, not an HTTP service.

## Run locally

```bash
cd worker
cp .env.example .env   # fill in DATABASE_URL + BLOB_READ_WRITE_TOKEN
npm install
npm run once           # process one job and exit (good for testing)
npm start              # continuous poll loop
```

Requires `ffmpeg`/`ffprobe` on PATH (`brew install ffmpeg`).

## How songs get queued

The Next.js app enqueues a job by creating a song row with
`packagingStatus = PENDING` and a `sourceAudioUrl` — see
`POST /api/admin/ingest` in the frontend. Paste a Suno link, the worker does
the rest.

## Tuning the master target

Edit `TARGET_LUFS` / `TARGET_TP` in `src/audio.js`. -14 LUFS matches streaming
platforms; use -16 for a quieter, more dynamic feel or -23 for EBU broadcast.
