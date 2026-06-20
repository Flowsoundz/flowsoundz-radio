import type { Song } from "./types";

export const RECENTLY_PLAYED_STORAGE_KEY = "flowsoundz-recently-played";
export const RECENTLY_PLAYED_EVENT = "flowsoundz:recently-played-updated";

export type RecentlyPlayedSong = Pick<
  Song,
  | "id"
  | "title"
  | "artist"
  | "genre"
  | "vibe"
  | "audio_file"
  | "public_audio_url"
  | "hls_url"
  | "cover_url"
  | "cover_file"
  | "artist_visual_url"
  | "artist_visual_file"
  | "is_playable"
  | "access_tier"
  | "member_release_at"
  | "public_release_at"
  | "is_vault"
  | "is_featured"
  | "featured"
  | "is_ai_generated"
> & {
  coverUrl: string | string[] | null;
  playedAtMs: number;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readRecentlyPlayed(): RecentlyPlayedSong[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RECENTLY_PLAYED_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as RecentlyPlayedSong[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeRecentlyPlayed(songs: RecentlyPlayedSong[]) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(RECENTLY_PLAYED_STORAGE_KEY, JSON.stringify(songs));
    window.dispatchEvent(new CustomEvent(RECENTLY_PLAYED_EVENT, { detail: songs }));
  } catch {
    // Ignore storage write failures.
  }
}
