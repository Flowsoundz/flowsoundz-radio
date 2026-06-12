# FlowSoundz Radio — Platform Summary & Technical Audit

**Date:** June 12, 2026 · **Status:** LAUNCHED (early-access / velvet rope)
**Production:** https://www.flowsoundzradio.com

---

## 1. Executive Summary

FlowSoundz Radio is a synchronized internet radio platform for independent and AI-assisted music. Unlike playlist apps, every listener hears the same track at the same moment — enabling shared live experiences (synchronized crowd reactions, scheduled "air times" artists can promote). The platform includes a complete artist pipeline: submission with rights verification, automated broadcast-loudness mastering, and exact air-time notifications.

**Launch state:** Public homepage, song/artist catalog, and waitlist are live. Radio playback is gated to the first 50 waitlist signups ("Founding Members," auto-granted INSIDER tier). Full open access is one environment flip away.

---

## 2. Architecture

| Layer | Technology | Notes |
|---|---|---|
| Frontend/API | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 | Deployed on Vercel |
| Database | Neon PostgreSQL via Prisma v6 | 37 tables; pooled + direct connections |
| Auth | Auth.js v5 (JWT strategy) | Google OAuth + email magic links; role/tier/isAdmin claims |
| Realtime | Server-Sent Events (`/api/sse/station`) | Chat, queue boosts, crowd-hype broadcast |
| Background work | Node + ffmpeg worker on Railway | Polls Postgres (`FOR UPDATE SKIP LOCKED`), masters audio |
| Object storage | Vercel Blob (public store) | Mastered audio; client uploads for admin ingest |
| AI services | Anthropic Claude (primary) → OpenAI → Gemini fallback chain; ElevenLabs TTS | DJ scripts + voice drops, both persistently cached |
| Payments | Stripe | Memberships, promo packages, tips |
| Email | Gmail SMTP via Nodemailer | Waitlist, founding member, track-live, digest |

### The core innovation: deterministic station clock
`lib/stationClock.ts` computes "what is on air right now" as a **pure function of wall-clock time** — hourly program blocks, seeded shuffle per block/channel, fixed transition gaps. No scheduler process exists. Any client or server computes an identical answer, which provides:
- Listener synchronization (drift correction keeps clients within ~4s)
- Per-vibe channels (each vibe is its own synchronized schedule)
- **Exact air-time prediction** (`lib/airTime.ts`) — the basis of the creator Air Time feature

---

## 3. Feature Inventory (verified in production)

**Listener experience**
- Synchronized live radio with vibe channels (All / Chill / Hype / Late Night / Emotional)
- Crowd hype meter: 3+ 🔥 votes in a 12s window trigger station-wide visual surge via SSE
- AI DJ (Rico Flame): LLM-written intros with live chat + crowd-energy context, ElevenLabs voice, local fallback drops; audio persisted in Postgres (TTS paid once per script)
- Live chat, queue boosts (Vibe Points economy), favorites, requests, embeddable player

**Creator pipeline**
- 19-page Creator Hub: submission, releases, AI promo tools (lyrics/copy/video prompts), press kit, posts, stats, earnings/payout views
- Submission requirements engine: rights/samples/promotion/removal confirmations enforced at approval; `autoApprovable` flag designed as an AI-reviewer seam (off by default)
- Automated mastering: two-pass EBU R128 loudness normalization to −14 LUFS / −1 dBTP; exact duration extraction feeds the station clock
- Source flexibility: Suno/Udio **share links auto-resolve** to the underlying CDN file (server-side page parsing, UUID-preference heuristic); direct browser file upload (≤200MB) to Blob
- **Air Time**: on READY, artist receives exact upcoming air times by email (idempotent, atomic claim); dashboard "Next Airing" card with pre-written fan-share post
- Admin: Master-from-URL panel, live Mastering Queue dashboard (counts, errors in plain language, retry with URL override), submissions review with live requirements checklist

**Launch & growth machinery**
- Maintenance mode → velvet rope (LAUNCH_MODE) → open, via env flags
- Waitlist: first `LAUNCH_LIMIT` (50) auto-INSIDER + numbered Founding Member email; later signups get standard confirmation
- Weekly digest email infrastructure; analytics events; share tracking

**Security**
- Site-wide CSP (media `data:` for drops; `/embed` frameable); per-IP rate limits on all AI-calling endpoints; HMAC rotating stream tokens on audio; admin session gating; legal pages always public

---

## 4. Operations Runbook

### Deployment (CRITICAL — read before deploying)
Vercel's server-side builds **fail for this project** (legacy services config exceeded the 245MB function-bundle limit; plain git builds die in a platform post-build step). The working recipe, from the **repo root**:
```bash
npx vercel pull --yes --environment=production   # settings (Sensitive env pulls EMPTY — see below)
npx vercel build --prod                          # local build (Prisma binaryTargets cover mac + linux/ARM)
npx vercel deploy --prebuilt --prod --yes        # upload output; no server build runs
```
- Env changes require a new deployment to take effect.
- `vercel pull` returns Sensitive env values as empty strings; only `NEXT_PUBLIC_*` values bake into the build (server secrets resolve at runtime), so this is safe — but build-time-required vars (e.g., VAPID) must exist in `frontend/.env.local`.
- Schema changes: run `prisma db push` manually with `DIRECT_URL` derived by removing `-pooler` from the Neon host (the build no longer pushes schema).
- GitHub auto-deploy is connected in name but does not fire; treat the CLI recipe as the only path.

### Worker (Railway)
- Service `worker` (root directory `worker/`), Dockerfile with ffmpeg, env: `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` (public store `flowsoundz-masters-public`).
- Job lifecycle: `PENDING → PROCESSING → READY|FAILED` with atomic claims; safe to run multiple instances; local fallback: `cd worker && set -a; . ./.env; set +a; RUN_ONCE=1 node src/index.js`.
- Verified autonomous: share-link job → READY in ~10s, including Air Time notification ping.

### Backups
- Code: GitHub (`Flowsoundz/flowsoundz-radio`), includes the 59-track static audio catalog.
- Database: full JSON dump of all 37 tables + mastered audio at `~/flowsoundz-backups/<date>/`; Neon PITR as the deeper net.
- Secrets: `worker/.env` (gitignored) holds the live `DATABASE_URL` and Blob token — **copy to a password manager**.

### Rollback
`MAINTENANCE_MODE=true` in Vercel env → run the deploy recipe → behind the curtain in ~4 minutes.

---

## 5. Risk Register & Known Limitations

| Item | Severity | Status / Mitigation |
|---|---|---|
| Google OAuth `redirect_uri_mismatch` | High (conversion) | Add `https://www.flowsoundzradio.com/api/auth/callback/google` in Google Cloud Console. Email magic-link works meanwhile. |
| Secrets transited chats/dashboards during launch week (Neon password, old Blob token; GymTwin Supabase service key) | High (hygiene) | Rotate Neon password (update Vercel + Railway + `worker/.env`); rotate GymTwin key. |
| Vercel server-side builds broken | Medium | Prebuilt recipe is stable; revisit when Vercel fixes the deterministic-manifest step or audio moves off `public/`. |
| SSE scaling ceiling | Medium (at growth) | Each listener = one serverless function polling Postgres (~50 q/s at 100 listeners). Migrate to Upstash/Ably pub/sub when concurrency approaches triple digits. |
| Duplicate Railway service `flowsoundz-radio` | Low (cost) | Failing frontend builds burn trial credit — delete the service. |
| `AUTH_URL=https://example.com` placeholder | Low | Runtime deletes it on Vercel (harmless); set correctly for tidiness. |
| Old private Blob store `flowsoundz-masters` | Low | Empty/unused — delete. |
| No automated test suite / staging environment | Medium (velocity) | All verification is manual/scripted against production; first investment after traction. |

---

## 6. Recommended Roadmap

1. **Now:** Google OAuth fix → fill the 50 founding seats → recruit first real artist submission (exercises the full autonomous loop publicly)
2. **Next sprint:** Weekly artist stats digest (retention twin of Air Time); listener streaks/points
3. **At ~100 concurrent listeners:** SSE → managed pub/sub
4. **When artists pay:** Stage 2 creative mastering (Dolby.io/LANDR API in the existing worker); Vault-exclusive masters behind gated storage
5. **AI reviewer:** swap the deterministic `autoApprovable` rule for an LLM risk assessment — the interface already matches

---

## Appendix: Companion Project — GymTwin AI
Next.js 16 fitness app (separate repo/deployment): 3D AI coaches (Three.js/R3F, Draco-compressed rigs), MediaPipe camera form tracking, adaptive training engine with macrocycles, AI food recognition (Claude vision), offline PWA. Launch blockers tracked separately (key rotation, production domain cutover). FlowSoundz embeds into its workout-audio surface via the public `/embed/radio` player.
