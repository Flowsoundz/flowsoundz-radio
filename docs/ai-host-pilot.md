# FlowSoundz AI Host Pilot

## Purpose

Create a recognizable AI radio co-host that adds personality and context to synchronized FlowSoundz programming without replacing human curation.

## Segment Types

- `station_id`: identifies FlowSoundz and the current mood.
- `track_intro`: introduces a scheduled track. This is the default live transition.
- `artist_spotlight`: gives an approved artist a short discovery-focused introduction.
- `crowd_energy`: acknowledges listener activity, chat, or reactions without inventing numbers.

## Runtime Flow

1. The station clock determines the current and next program item.
2. The player pre-warms a host segment before the transition window.
3. The AI receives only the approved station context needed for that segment.
4. The script is constrained to one or two short sentences.
5. Provider fallback moves from Claude to OpenAI to Gemini, then to a template.
6. ElevenLabs creates the voice audio when configured.
7. Audio is cached for ordinary track intros; special segment types are not allowed to reuse the ordinary track cache.
8. The player inserts the segment only between tracks and falls back to music if generation fails.

## Trust Rules

- The host is an AI radio co-host and must not claim to be human.
- The host cannot approve, reject, or promise success for an artist.
- Artist spotlights require approved release context.
- The host must not invent biography, listener counts, chart results, or credentials.
- Sponsored lines must be labeled and separated from editorial curation.
- Human operators can disable generated segments by removing voice configuration or routing to local narration.

## Pilot Success Measures

- Host segment completion rate
- Playback failures and fallback rate
- Average added listening time after a segment
- Shares, follows, favorites, and submissions attributed to host moments
- Artist repost rate for spotlight segments
- Cost per generated segment and cost per returning listener

## Next Controlled Test

Run one scheduled artist spotlight per vibe, review the scripts and voice output, then compare the next seven days of completion, shares, and return visits against ordinary transitions. Expand frequency only when the host improves the listener journey without increasing skips.

