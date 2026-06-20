export const LISTENER_WATCHLIST_STORAGE_KEY = "flowsoundz-listener-watchlist";
export const LISTENER_WATCHLIST_EVENT = "flowsoundz:listener-watchlist-updated";

export type WatchedArtist = {
  artist: string;
  artistSlug: string;
  lastTrackTitle: string;
  coverUrl: string | string[] | null;
  lastHeardAtMs: number;
  vibe?: string;
  isAiGenerated?: boolean;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readListenerWatchlist(): WatchedArtist[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(LISTENER_WATCHLIST_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as WatchedArtist[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeListenerWatchlist(artists: WatchedArtist[]) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(LISTENER_WATCHLIST_STORAGE_KEY, JSON.stringify(artists));
    window.dispatchEvent(new CustomEvent(LISTENER_WATCHLIST_EVENT, { detail: artists }));
  } catch {
    // Ignore storage write failures.
  }
}

export function toggleListenerWatchArtist(artist: WatchedArtist) {
  const current = readListenerWatchlist();
  const exists = current.some((entry) => entry.artistSlug === artist.artistSlug);

  if (exists) {
    const next = current.filter((entry) => entry.artistSlug !== artist.artistSlug);
    writeListenerWatchlist(next);
    return { watched: false, artists: next };
  }

  const next = [artist, ...current.filter((entry) => entry.artistSlug !== artist.artistSlug)].slice(0, 8);
  writeListenerWatchlist(next);
  return { watched: true, artists: next };
}
