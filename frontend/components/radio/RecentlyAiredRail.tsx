"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CoverArt } from "@/components/CoverArt";
import { PushBell } from "@/components/PushBell";
import { useGlobalAudioRefs } from "@/components/GlobalAudioProvider";
import { track } from "@/lib/analytics";
import { canUserTierAccessTrack } from "@/lib/access";
import { slugifyArtistName } from "@/lib/artists";
import {
  LISTENER_WATCHLIST_EVENT,
  readListenerWatchlist,
  toggleListenerWatchArtist,
  type WatchedArtist,
} from "@/lib/listenerWatchlist";
import {
  readRecentlyPlayed,
  RECENTLY_PLAYED_EVENT,
  type RecentlyPlayedSong,
} from "@/lib/recentlyPlayed";
import type { Song } from "@/lib/types";
import { useUserTier } from "@/lib/useUserTier";

function formatPlayedAgo(playedAtMs: number) {
  const elapsedMinutes = Math.max(1, Math.round((Date.now() - playedAtMs) / 60_000));
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }

  const hours = Math.floor(elapsedMinutes / 60);
  const remainder = elapsedMinutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m ago` : `${hours}h ago`;
}

function toSong(item: RecentlyPlayedSong): Song {
  return {
    id: item.id,
    title: item.title,
    artist: item.artist,
    genre: item.genre,
    vibe: item.vibe,
    audio_file: item.audio_file,
    public_audio_url: item.public_audio_url,
    hls_url: item.hls_url,
    cover_url: item.cover_url,
    cover_file: item.cover_file,
    artist_visual_url: item.artist_visual_url,
    artist_visual_file: item.artist_visual_file,
    is_playable: true,
    access_tier: item.access_tier,
    member_release_at: item.member_release_at,
    public_release_at: item.public_release_at,
    is_vault: item.is_vault,
    is_featured: item.is_featured,
    featured: item.featured,
    is_ai_generated: item.is_ai_generated,
  };
}

function toWatchedArtist(item: RecentlyPlayedSong): WatchedArtist {
  return {
    artist: item.artist,
    artistSlug: slugifyArtistName(item.artist),
    lastTrackTitle: item.title,
    coverUrl: item.coverUrl,
    lastHeardAtMs: item.playedAtMs,
    vibe: item.vibe,
    isAiGenerated: item.is_ai_generated,
  };
}

export function RecentlyAiredRail() {
  const { requestOnDemandRef } = useGlobalAudioRefs();
  const { tier } = useUserTier();
  const [items, setItems] = useState<RecentlyPlayedSong[]>([]);
  const [watchedArtists, setWatchedArtists] = useState<WatchedArtist[]>([]);

  useEffect(() => {
    const sync = () => {
      setItems(readRecentlyPlayed().slice(0, 6));
      setWatchedArtists(readListenerWatchlist().slice(0, 4));
    };

    sync();
    window.addEventListener(RECENTLY_PLAYED_EVENT, sync as EventListener);
    window.addEventListener(LISTENER_WATCHLIST_EVENT, sync as EventListener);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener(RECENTLY_PLAYED_EVENT, sync as EventListener);
      window.removeEventListener(LISTENER_WATCHLIST_EVENT, sync as EventListener);
      window.removeEventListener("focus", sync);
    };
  }, []);

  if (items.length === 0) {
    return null;
  }

  function replayItem(item: RecentlyPlayedSong) {
    track("start_listening_click", {
      action: "replay_recent_track",
      source: "recently_aired_rail",
      title: item.title,
      artist: item.artist,
      vibe: item.vibe ?? null,
      trackId: item.id,
    });
    requestOnDemandRef.current?.(toSong(item));
  }

  function toggleWatch(item: RecentlyPlayedSong) {
    const result = toggleListenerWatchArtist(toWatchedArtist(item));
    setWatchedArtists(result.artists.slice(0, 4));
    track("start_listening_click", {
      action: result.watched ? "watch_artist" : "unwatch_artist",
      source: "recently_aired_rail",
      title: item.title,
      artist: item.artist,
      vibe: item.vibe ?? null,
      trackId: item.id,
    });
  }

  return (
    <section className="rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
            Recently Aired
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">Catch what just moved through the station.</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Radio stays the front door. If something hits, this rail helps you go deeper without leaving the FlowSoundz lane.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/70">
            Insider replay unlocks here
          </div>
          <PushBell />
        </div>
      </div>

      {watchedArtists.length > 0 ? (
        <div className="mt-5 rounded-[1.35rem] border border-fuchsia-400/12 bg-fuchsia-400/[0.05] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200/80">
                Your Return Lane
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
                Keep a short watchlist of artists worth checking again. Pair it with station alerts if you want FlowSoundz to pull you back in.
              </p>
            </div>
            <Link
              href="/artists"
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/12 px-4 text-xs font-semibold text-white transition hover:border-white/22 hover:bg-white/5"
            >
              Browse all artists
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {watchedArtists.map((artist) => (
              <div
                key={artist.artistSlug}
                className="rounded-[1.2rem] border border-white/8 bg-black/20 p-3"
              >
                <div className="flex gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[0.95rem] border border-white/8 bg-[#0B1020]">
                    <CoverArt
                      src={artist.coverUrl}
                      alt={artist.artist}
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{artist.artist}</p>
                    <p className="mt-1 truncate text-xs text-slate-300">
                      Last heard on {artist.lastTrackTitle}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/40">
                      {formatPlayedAgo(artist.lastHeardAtMs)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/artists/${artist.artistSlug}`}
                    className="inline-flex min-h-9 items-center justify-center rounded-full border border-white/12 px-3 text-[11px] font-semibold text-white transition hover:border-white/22 hover:bg-white/5"
                  >
                    Open artist
                  </Link>
                  <button
                    type="button"
                    onClick={() => setWatchedArtists(toggleListenerWatchArtist(artist).artists.slice(0, 4))}
                    className="inline-flex min-h-9 items-center justify-center rounded-full border border-fuchsia-400/18 bg-fuchsia-400/[0.08] px-3 text-[11px] font-semibold text-fuchsia-100 transition hover:border-fuchsia-400/30 hover:bg-fuchsia-400/[0.12]"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const canReplay = canUserTierAccessTrack(item, tier);
          const artistSlug = slugifyArtistName(item.artist);
          const isWatched = watchedArtists.some((artist) => artist.artistSlug === artistSlug);

          return (
            <div
              key={`${item.id}-${item.playedAtMs}`}
              className="rounded-[1.35rem] border border-white/8 bg-black/20 p-4"
            >
              <div className="flex gap-3">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[1rem] border border-white/8 bg-[#0B1020]">
                  <CoverArt
                    src={item.coverUrl}
                    alt={item.title}
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 truncate text-sm text-slate-300">{item.artist}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/40">
                    {formatPlayedAgo(item.playedAtMs)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.vibe ? (
                      <span className="rounded-full border border-cyan-300/16 bg-cyan-300/[0.08] px-2.5 py-1 text-[10px] font-semibold text-cyan-100">
                        {item.vibe}
                      </span>
                    ) : null}
                    {item.is_ai_generated ? (
                      <span className="rounded-full border border-fuchsia-400/16 bg-fuchsia-400/[0.08] px-2.5 py-1 text-[10px] font-semibold text-fuchsia-100">
                        AI-assisted
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {canReplay ? (
                  <button
                    type="button"
                    onClick={() => replayItem(item)}
                    className="inline-flex min-h-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-4 text-xs font-bold text-white shadow-[0_0_18px_rgba(0,229,255,0.22)] transition hover:shadow-[0_0_28px_rgba(0,229,255,0.42)]"
                  >
                    Replay now
                  </button>
                ) : (
                  <Link
                    href="/membership"
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-cyan-300/18 bg-cyan-300/[0.06] px-4 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.1]"
                  >
                    Unlock replay
                  </Link>
                )}
                <Link
                  href={`/artists/${artistSlug}`}
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/12 px-4 text-xs font-semibold text-white transition hover:border-white/22 hover:bg-white/5"
                >
                  Artist page
                </Link>
                <button
                  type="button"
                  onClick={() => toggleWatch(item)}
                  className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 text-xs font-semibold transition ${
                    isWatched
                      ? "border border-fuchsia-400/20 bg-fuchsia-400/[0.1] text-fuchsia-100 hover:border-fuchsia-400/34 hover:bg-fuchsia-400/[0.14]"
                      : "border border-white/12 text-white hover:border-white/22 hover:bg-white/5"
                  }`}
                >
                  {isWatched ? "Watching artist" : "Watch artist"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
