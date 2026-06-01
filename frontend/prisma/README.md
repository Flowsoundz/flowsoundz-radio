# Prisma Setup

This repo did not previously include Prisma. The files in this folder are a safe scaffold for moving FlowSoundz Radio from local JSON storage to PostgreSQL.

## Required environment variable

Add this to `.env.local` when you are ready to connect a database:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/flowsoundz_radio?schema=public"
```

## Install packages

```bash
cd /Users/adonyflorencio/flowsoundz-radio/frontend
npm install
```

## Generate the client

```bash
npm run prisma:generate
```

## Create the first migration

```bash
npm run prisma:migrate -- --name init
```

## Notes

- This schema is intentionally separate from the current JSON-backed MVP stores.
- No runtime database code was added yet.
- Current local-file persistence still works until you explicitly migrate the app logic.
- Recommended migration order:
  1. `artist_submissions`
  2. `promo_assets`
  3. `submission_reviews`
  4. `analytics_events`
  5. `songs` / `artists`
  6. `queue_preferences`
