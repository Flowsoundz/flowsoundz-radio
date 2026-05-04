Place instrumental transition beds in vibe-specific folders:

- `public/audio/beds/hype/`
- `public/audio/beds/chill/`
- `public/audio/beds/late_night/`
- `public/audio/beds/emotional/`
- `public/audio/beds/all/` optional fallback beds

Supported formats:

- `.mp3`
- `.wav`
- `.m4a`
- `.aac`
- `.ogg`

These are not mixed into narration yet. The player only resolves and preloads them
so future narration underbeds can be enabled safely without backend changes.
