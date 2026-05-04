Place narration audio files in vibe-specific folders:

- `public/audio/narration/hype/`
- `public/audio/narration/chill/`
- `public/audio/narration/late_night/`
- `public/audio/narration/emotional/`
- `public/audio/narration/all/` optional shared fallback clips

Supported formats:

- `.mp3`
- `.wav`
- `.m4a`
- `.aac`
- `.ogg`

Examples:

- `public/audio/narration/hype/hype_1.mp3`
- `public/audio/narration/chill/chill_1.mp3`
- `public/audio/narration/late_night/late_night_1.mp3`
- `public/audio/narration/emotional/emotional_1.mp3`

After adding or removing files, regenerate the manifest:

```bash
node scripts/generate-narration-manifest.mjs
```

`npm run dev` and `npm run build` also regenerate the manifest automatically.
