"use client";

import { useEffect, useState } from "react";
import {
  LISTENER_WATCHLIST_EVENT,
  readListenerWatchlist,
  toggleListenerWatchArtist,
  type WatchedArtist,
} from "@/lib/listenerWatchlist";

type Props = WatchedArtist & {
  className?: string;
};

export function WatchArtistButton(props: Props) {
  const {
    className = "",
    ...artist
  } = props;
  const [watched, setWatched] = useState(false);

  useEffect(() => {
    const sync = () => {
      setWatched(readListenerWatchlist().some((entry) => entry.artistSlug === artist.artistSlug));
    };

    sync();
    window.addEventListener(LISTENER_WATCHLIST_EVENT, sync as EventListener);
    window.addEventListener("focus", sync);

    return () => {
      window.removeEventListener(LISTENER_WATCHLIST_EVENT, sync as EventListener);
      window.removeEventListener("focus", sync);
    };
  }, [artist.artistSlug]);

  return (
    <button
      type="button"
      onClick={() => setWatched(toggleListenerWatchArtist(artist).watched)}
      className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 text-xs font-semibold transition ${
        watched
          ? "border border-fuchsia-400/20 bg-fuchsia-400/[0.1] text-fuchsia-100 hover:border-fuchsia-400/34 hover:bg-fuchsia-400/[0.14]"
          : "border border-white/12 text-white hover:border-white/22 hover:bg-white/5"
      } ${className}`.trim()}
    >
      {watched ? "Watching artist" : "Watch artist"}
    </button>
  );
}
