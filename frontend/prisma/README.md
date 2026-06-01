# Prisma Setup

This repo now includes a Phase 4 schema that aligns the database with the shared frontend catalog/content model used by `Radio`, `Songs`, `Artists`, and the Creator Hub.

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

## Schema coverage

The Prisma schema now supports:

- `Artist`
- `ArtistProfile`
  - statement
  - roots/location labels
  - hero media
  - featured track reference
- `ArtistSocialLink`
- `ArtistSupportLink`
- `ArtistVisualizerSession`
- `Song`
  - richer release metadata
  - behind-the-mix story
  - public audio / HLS / visuals
  - archive / AI / packaging flags
- `SongMilestone`
- existing submission / analytics / queue tables

## Runtime alignment

Server-rendered catalog pages now use `lib/catalogSnapshotStore.ts`.

Storage behavior:

- `DATABASE_URL` configured:
  - Prisma-backed catalog snapshot is used
- local dev without `DATABASE_URL`:
  - local JSON catalog fallback is used
- production without `DATABASE_URL`:
  - curated archive fallback is used

This means the app can move to a real database incrementally without breaking the current curated fallback model.

## Recommended migration order

1. `artist_submissions`
2. `promo_assets`
3. `submission_reviews`
4. `analytics_events`
5. `artists`
6. `artist_profiles`
7. `artist_social_links`
8. `artist_support_links`
9. `artist_visualizer_sessions`
10. `songs`
11. `song_milestones`
12. `queue_preferences`
13. `radio_sessions`

## Recommended first content backfill

1. Import canonical `Artist` rows
2. Backfill `ArtistProfile` statement / roots / hero media
3. Backfill `Song` release metadata and public playback URLs
4. Add `SongMilestone` rows for featured releases
5. Add `ArtistSupportLink` and `ArtistSocialLink`
6. Add live `ArtistVisualizerSession` records when sessions are active

## Notes

- The frontend shared contract still lives in:
  - `lib/types.ts`
  - `lib/catalogSnapshot.ts`
  - `lib/catalogSnapshotStore.ts`
- Editorial overrides still exist as a temporary compatibility layer.
- The next step after schema migration is replacing those overrides with stored artist profile data.
