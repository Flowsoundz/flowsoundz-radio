import {
  DEFAULT_USER_TIER,
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
import type { Song } from "@/lib/types";

type SongGridProps = {
  songs: Song[];
  isLoading: boolean;
  error: string | null;
};

export function SongGrid({ songs, isLoading, error }: SongGridProps) {
  const currentUserTier = DEFAULT_USER_TIER;

  if (error) {
    return (
      <div className="glass-card rounded-[1.8rem] border border-rose-400/30 p-6 text-sm leading-6 text-rose-100">
        {error}
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="http://127.0.0.1:8000"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/[0.08]"
          >
            Check API
          </a>
          <Link
            href="/visualizer"
            className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-300/14"
          >
            Open visualizer
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
        No songs are available yet. Add entries to `backend/app/data/catalog.json`
        and drop the matching MP3 and cover files into the backend media folders.
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
        const isAiGenerated = Boolean(song.is_ai_generated);

        return (
          <article
            key={song.id}
            className={`group glass-card overflow-hidden rounded-[1.8rem] transition-transform duration-200 ${
              canAccess && isReady ? "hover:-translate-y-1" : "opacity-80"
            }`}
          >
            <div className="relative aspect-[1.15/1] bg-gradient-to-br from-cyan-400/20 to-fuchsia-500/20">
              <CoverArt
                src={getCoverUrl(song)}
                alt={`${song.title} cover`}
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                className={`object-cover ${canAccess ? "" : "opacity-45 saturate-50"}`}
              />
              {/* Play button overlay — accessible + ready tracks only */}
              {canAccess && isReady ? (
                <Link
                  href={`/radio?song=${song.id}`}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  aria-label={`Play ${song.title} on radio`}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm ring-1 ring-white/30 transition-transform duration-150 group-hover:scale-105">
                    <svg className="h-6 w-6 translate-x-0.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  </div>
                </Link>
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
                <h2 className="text-xl font-semibold text-white">{song.title}</h2>
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
                  {song.packaging_status === "failed"
                    ? "Packaging failed. Re-upload this track to retry."
                    : "Track uploaded. Packaging is still running, so playback is not ready yet."}
                </p>
              ) : null}
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>{song.genre ?? "Unknown genre"}</span>
                <span>{formatDuration(song.duration_sec ?? 0)}</span>
              </div>
              {canAccess && isReady ? (
                <Link
                  href={`/radio?song=${song.id}`}
                  className="state-fade flex w-full items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-2 text-xs font-semibold text-white/60 transition hover:border-[#00E5FF]/30 hover:bg-[#00E5FF]/8 hover:text-[#00E5FF]"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                  Play on Radio
                </Link>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
