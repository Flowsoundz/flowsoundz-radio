"use client";

import {
  canUserTierAccessTrack,
  isTrackFeatured,
  isTrackInMembersEarlyWindow,
} from "@/lib/access";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { CoverArt } from "@/components/CoverArt";
import { getCoverUrl } from "@/lib/api";
import { slugifyArtistName } from "@/lib/artists";
import { formatDuration, formatVibeLabel } from "@/lib/format";
import { useGlobalAudioRefs, useGlobalAudioState } from "@/components/GlobalAudioProvider";
import { useUserTier } from "@/lib/useUserTier";
import type { Song } from "@/lib/types";

type SongGridProps = {
  songs: Song[];
  isLoading: boolean;
  error: string | null;
};

export function SongGrid({ songs, isLoading, error }: SongGridProps) {
  const { tier: currentUserTier } = useUserTier();
  const { requestOnDemandRef } = useGlobalAudioRefs();
  const { currentTrack, isPlaying } = useGlobalAudioState();
  const canOnDemand = currentUserTier === "insider" || currentUserTier === "vault";

  if (error) {
    return (
      <div className="glass-card rounded-[1.8rem] border border-rose-400/30 p-6 text-sm leading-6 text-rose-100">
        {error}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/radio"
            className="rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/[0.08]"
          >
            Return to radio
          </Link>
          <Link
            href="/membership"
            className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-300/14"
          >
            Explore membership
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="glass-card h-80 animate-pulse rounded-[1.8rem]"
          />
        ))}
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="glass-card rounded-[1.8rem] p-6 text-sm leading-6 text-slate-300">
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6">
            <BrandLogo variant="icon" className="h-5 w-5 opacity-75" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
            Catalog waiting room
          </span>
        </div>
        No tracks match your search. Try a different vibe filter or clear the search to browse the full catalog.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {songs.map((song) => {
        const canAccess = canUserTierAccessTrack(song, currentUserTier);
        const isReady = song.packaging_status === "ready" || song.is_playable;
        const isVaultTrack = Boolean(song.is_vault);
        const isDayOneAccess = isTrackInMembersEarlyWindow(song);
        const isFeaturedTrack = isTrackFeatured(song);
        const isNowPlaying = currentTrack?.id === song.id;
        return (
          <article
            key={song.id}
            className={`group glass-card overflow-hidden rounded-[1.8rem] transition-transform duration-200 ${
              canAccess && isReady ? "hover:-translate-y-1" : "opacity-80"
            } ${isNowPlaying ? "ring-1 ring-[#00e5ff]/40 shadow-[0_0_28px_rgba(0,229,255,0.12)]" : ""}`}
          >
            <div className="relative aspect-[1.15/1] bg-gradient-to-br from-cyan-400/20 to-fuchsia-500/20">
              <CoverArt
                src={getCoverUrl(song)}
                alt={`${song.title} cover`}
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                className={`object-cover ${canAccess ? "" : "opacity-45 saturate-50"}`}
              />
              {/* Now Playing overlay */}
              {isNowPlaying ? (
                <div className="absolute inset-0 flex items-end justify-start bg-[linear-gradient(180deg,transparent_40%,rgba(0,229,255,0.18)_100%)]">
                  <div className="m-3 flex items-center gap-1.5 rounded-full border border-[#00e5ff]/40 bg-[#00e5ff]/15 px-3 py-1.5 backdrop-blur-sm">
                    <span className="flex gap-[3px] items-end h-3">
                      <span className="w-[3px] rounded-sm bg-[#00e5ff] animate-[eq_0.8s_ease-in-out_infinite]" style={{ height: isPlaying ? "100%" : "40%" }} />
                      <span className="w-[3px] rounded-sm bg-[#00e5ff] animate-[eq_0.8s_ease-in-out_0.15s_infinite]" style={{ height: isPlaying ? "60%" : "40%" }} />
                      <span className="w-[3px] rounded-sm bg-[#00e5ff] animate-[eq_0.8s_ease-in-out_0.3s_infinite]" style={{ height: isPlaying ? "80%" : "40%" }} />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#00e5ff]">
                      {isPlaying ? "Now Playing" : "Paused"}
                    </span>
                  </div>
                </div>
              ) : null}
              {/* Play overlay — on-demand for paid tiers, radio link for free */}
              {canAccess && isReady && !isNowPlaying ? (
                canOnDemand ? (
                  <button
                    type="button"
                    onClick={() => requestOnDemandRef.current?.(song)}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    aria-label={`Play ${song.title} now`}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm ring-1 ring-white/30 transition-transform duration-150 group-hover:scale-105">
                      <svg className="h-6 w-6 translate-x-0.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    </div>
                    <span className="rounded-full border border-[#00E5FF]/40 bg-[#00E5FF]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#00E5FF] backdrop-blur-sm">
                      Play Now
                    </span>
                  </button>
                ) : (
                  <Link
                    href="/radio"
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    aria-label={`Listen on FlowSoundz Radio`}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm ring-1 ring-white/30 transition-transform duration-150 group-hover:scale-105">
                      <svg className="h-6 w-6 translate-x-0.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    </div>
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
                      🔴 Tune In
                    </span>
                  </Link>
                )
              ) : null}
              {!canAccess ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[#050816]/58">
                  <span className="rounded-full border border-amber-300/25 bg-amber-200/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-100">
                    Locked
                  </span>
                </div>
              ) : null}
            </div>
            <div className="space-y-3 p-5">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-cyan-300/12 px-3 py-1 text-xs font-medium text-cyan-100">
                  {formatVibeLabel(song.vibe ?? "all")}
                </span>
                {isVaultTrack ? (
                  <span className="rounded-full bg-[#8B5CF6]/14 px-3 py-1 text-xs font-medium text-violet-100">
                    Vault
                  </span>
                ) : null}
                {isDayOneAccess ? (
                  <span className="rounded-full bg-[#00E5FF]/12 px-3 py-1 text-xs font-medium text-cyan-100">
                    Day One Access
                  </span>
                ) : null}
                {isFeaturedTrack ? (
                  <span className="rounded-full bg-fuchsia-400/14 px-3 py-1 text-xs font-medium text-fuchsia-100">
                    Featured
                  </span>
                ) : null}
                {!isReady ? (
                  <span className="rounded-full bg-amber-300/14 px-3 py-1 text-xs font-medium text-amber-100">
                    {song.packaging_status === "failed"
                      ? "Packaging Failed"
                      : song.packaging_status === "processing"
                        ? "Processing"
                        : "Pending"}
                  </span>
                ) : null}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {song.slug ? (
                    <Link href={`/songs/${song.slug}`} className="hover:text-cyan-200 transition">{song.title}</Link>
                  ) : song.title}
                </h2>
                <p className="mt-1 text-sm text-slate-300">
                  <Link
                    href={`/artists/${slugifyArtistName(song.artist)}`}
                    className="transition hover:text-cyan-200"
                  >
                    {song.artist}
                  </Link>{" "}
                  · {song.album ?? "Unknown album"}
                </p>
              </div>
              {song.behind_the_mix_text ? (
                <p className="rounded-[1rem] border border-white/8 bg-white/5 px-3 py-3 text-xs leading-5 text-slate-300">
                  <span className="font-semibold text-fuchsia-100">
                    Behind the Mix:
                  </span>{" "}
                  {song.behind_the_mix_text}
                </p>
              ) : null}
              {!canAccess ? (
                <p className="rounded-[1rem] border border-amber-300/20 bg-amber-200/10 px-3 py-3 text-xs leading-5 text-amber-100">
                  {isDayOneAccess
                    ? "Members Early. Unlocks on Public Friday."
                    : isVaultTrack
                      ? "Vault release. Listener tier stays locked."
                      : "This release is not unlocked for Listener yet."}
                </p>
              ) : null}
              {canAccess && !isReady ? (
                <p className="rounded-[1rem] border border-cyan-300/20 bg-cyan-200/10 px-3 py-3 text-xs leading-5 text-cyan-100">
                  {song.curated_fallback
                    ? "Curated archive selection. Metadata is live for discovery, but direct playback resumes when the broadcast stack is back online."
                    : song.packaging_status === "failed"
                    ? "Packaging failed. Re-upload this track to retry."
                    : "Track uploaded. Packaging is still running, so playback is not ready yet."}
                </p>
              ) : null}
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>{song.genre ?? "Unknown genre"}</span>
                <span>{formatDuration(song.duration_sec ?? 0)}</span>
              </div>
              {canAccess && isReady && !song.curated_fallback ? (
                canOnDemand ? (
                  <button
                    type="button"
                    onClick={() => requestOnDemandRef.current?.(song)}
                    className="state-fade flex w-full items-center justify-center gap-1.5 rounded-full border border-[#00E5FF]/20 bg-[#00E5FF]/08 py-2 text-xs font-semibold text-[#00E5FF] transition hover:border-[#00E5FF]/40 hover:bg-[#00E5FF]/14"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                    Play Now
                  </button>
                ) : (
                <Link
                  href="/radio"
                  className="state-fade flex w-full items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-2 text-xs font-semibold text-white/60 transition hover:border-white/20 hover:text-white/80"
                >
                  <span className="h-2 w-2 rounded-full bg-[#FF2DA6] shadow-[0_0_6px_rgba(255,45,166,0.7)]" />
                  Tune In — Live Radio
                </Link>
                )
              ) : song.curated_fallback ? (
                <div className="state-fade flex w-full items-center justify-center gap-1.5 rounded-full border border-cyan-300/14 bg-cyan-300/[0.06] py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/85">
                  Curated archive preview
                </div>
              ) : null}
              <div className="flex gap-2">
                <a
                  href={`https://open.spotify.com/search/${encodeURIComponent(`${song.title} ${song.artist}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#1DB954]/18 bg-[#1DB954]/8 py-1.5 text-[11px] font-semibold text-[#1DB954] transition hover:bg-[#1DB954]/16 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                  Spotify
                </a>
                <a
                  href={`https://music.apple.com/search?term=${encodeURIComponent(`${song.title} ${song.artist}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#fc3c44]/18 bg-[#fc3c44]/8 py-1.5 text-[11px] font-semibold text-[#fc3c44] transition hover:bg-[#fc3c44]/16 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>
                  Apple Music
                </a>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
