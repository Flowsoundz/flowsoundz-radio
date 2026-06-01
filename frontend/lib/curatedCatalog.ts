import type { Song } from "@/lib/types";

export const CURATED_CATALOG_FALLBACK: Song[] = [
  {
    id: "curated-1888",
    title: "1888",
    artist: "FlowSoundz Select",
    album: "After Hours Rotation",
    genre: "Latin Urban",
    vibe: "late_night",
    duration_sec: 164,
    audio_file: "curated-1888.mp3",
    cover_file: "1888.png",
    featured: true,
    is_featured: true,
    is_playable: false,
    packaging_status: "ready",
    curated_fallback: true,
    behind_the_mix_text:
      "A curated archive selection held in rotation while the live station reconnects.",
  },
  {
    id: "curated-body-language",
    title: "Body Language",
    artist: "FlowSoundz Select",
    album: "Discovery First",
    genre: "R&B",
    vibe: "chill",
    duration_sec: 189,
    audio_file: "curated-body-language.mp3",
    cover_file: "body-language.png",
    is_playable: false,
    packaging_status: "ready",
    curated_fallback: true,
    behind_the_mix_text:
      "Included as part of the public-facing discovery archive so the catalog never renders empty.",
  },
  {
    id: "curated-quiere-mas",
    title: "Quiere Mas",
    artist: "FlowSoundz Select",
    album: "Midnight Drops",
    genre: "Reggaeton",
    vibe: "hype",
    duration_sec: 178,
    audio_file: "curated-quiere-mas.mp3",
    cover_file: "QuiereMas.png",
    is_playable: false,
    packaging_status: "ready",
    curated_fallback: true,
  },
  {
    id: "curated-still-got-love",
    title: "Still Got Love",
    artist: "FlowSoundz Select",
    album: "Night Shift",
    genre: "Alternative",
    vibe: "emotional",
    duration_sec: 201,
    audio_file: "curated-still-got-love.mp3",
    cover_file: "still-got-love.png",
    is_playable: false,
    packaging_status: "ready",
    curated_fallback: true,
  },
  {
    id: "curated-doctora",
    title: "Doctora",
    artist: "FlowSoundz Select",
    album: "Pulse Check",
    genre: "Latin Pop",
    vibe: "hype",
    duration_sec: 172,
    audio_file: "curated-doctora.mp3",
    cover_file: "doctora.png",
    is_playable: false,
    packaging_status: "ready",
    curated_fallback: true,
  },
  {
    id: "curated-essential",
    title: "Essential",
    artist: "FlowSoundz Select",
    album: "Late Night Index",
    genre: "Electronic",
    vibe: "late_night",
    duration_sec: 214,
    audio_file: "curated-essential.mp3",
    cover_file: "essential.png",
    is_playable: false,
    packaging_status: "ready",
    curated_fallback: true,
  },
];

export function getCuratedCatalog(vibe?: string): Song[] {
  if (!vibe || vibe === "all") {
    return CURATED_CATALOG_FALLBACK;
  }

  const filtered = CURATED_CATALOG_FALLBACK.filter((song) => song.vibe === vibe);
  return filtered.length > 0 ? filtered : CURATED_CATALOG_FALLBACK;
}
