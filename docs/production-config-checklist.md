# FlowSoundz Radio Production Configuration

Deployment target: Vercel-compatible Next.js deployment.

Do not commit real secret values. Add them in the hosting provider's encrypted environment settings.

## Required For Launch

- [ ] `NEXT_PUBLIC_SITE_URL` - final public HTTPS URL
- [ ] `AUTH_URL` - same public HTTPS URL
- [ ] `AUTH_SECRET` - unique production secret
- [ ] `DATABASE_URL` - production PostgreSQL connection
- [ ] `CRON_SECRET` - unique secret used by scheduled routes
- [ ] `BLOB_READ_WRITE_TOKEN` - public source upload storage
- [ ] `MASTERS_BLOB_READ_WRITE_TOKEN` - mastered audio storage, if separate
- [ ] `ADMIN_EMAIL` - protected admin account
- [ ] `ADMIN_UPLOAD_PASSWORD` - secure upload/admin fallback password, if used

## Payments

- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `STRIPE_INSIDER_PRICE_ID`
- [ ] `STRIPE_VAULT_PRICE_ID`

## Email And Notifications

- [ ] `GMAIL_USER` and `GMAIL_APP_PASSWORD`, or production SMTP provider
- [ ] `NOTIFY_EMAIL`
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- [ ] `VAPID_PRIVATE_KEY`
- [ ] `VAPID_SUBJECT`

## AI And Voice For Full Launch

- [ ] `ANTHROPIC_API_KEY` - Claude creator copy, review, and DJ fallback
- [ ] `OPENAI_API_KEY` - creator copy, transcription, outreach, and alternate model path
- [ ] `GEMINI_API_KEY` - optional third DJ fallback
- [ ] `OPENAI_MODEL_DJ` - approved model name for DJ and creator tasks
- [ ] `OPENAI_OUTREACH_MODEL` - approved model name for outreach tasks
- [ ] `ELEVENLABS_API_KEY` - spoken DJ drops and smart narration
- [ ] `ELEVENLABS_VOICE_ID` - approved FlowSoundz voice

At least one of `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` is required for live creator AI. Both are recommended for fallback resilience. `ELEVENLABS_API_KEY` is required for generated voice; the station can still use cached or local narration without it.

## Public Configuration

- [ ] `NEXT_PUBLIC_API_BASE`
- [ ] `NEXT_PUBLIC_APP_BASE`
- [ ] `NEXT_PUBLIC_AUDIO_CDN_BASE`
- [ ] `NEXT_PUBLIC_KOFI_URL`, if used
- [ ] `NEXT_PUBLIC_PATREON_URL`, if used
- [ ] `NEXT_PUBLIC_DEMO_TIER` set only for intentional demos
- [ ] `MAINTENANCE_MODE` disabled for launch
- [ ] `LAUNCH_MODE` reviewed before public opening

## Verification Order

1. Add required values to a preview environment first.
2. Deploy a preview build.
3. Test sign-in, database reads, admin access, artist submission, upload, mastering, and email.
4. Test Stripe webhooks with test-mode keys.
5. Confirm cron routes reject missing or incorrect secrets.
6. Promote the verified environment to production.
7. Run the first controlled music batch only after storage, database, and playback checks pass.

## Current Local Read

The local app intentionally runs without `DATABASE_URL` by using safe development fallbacks. That is useful for UI work, but production must have a real database and storage configuration before public launch.
