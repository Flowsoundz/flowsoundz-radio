"use client";

import Link from "next/link";
import type { ArtistProfileRecord } from "@/lib/types";
import { CoverArt } from "@/components/CoverArt";
import { formatVibeLabel } from "@/lib/format";

type Props = {
  artist: ArtistProfileRecord;
  onClose: () => void;
};

export function ArtistQuickPanel({ artist, onClose }: Props) {
  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[82vh] flex-col overflow-hidden rounded-t-[2rem] border-t border-white/10 bg-[#050816]/98 shadow-[0_-24px_80px_rgba(0,0,0,0.65)] sm:inset-y-0 sm:bottom-auto sm:left-auto sm:right-0 sm:top-0 sm:max-h-full sm:w-[400px] sm:rounded-none sm:rounded-l-[2rem] sm:border-l sm:border-t-0">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-6 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-200/60">
            Now Playing — Artist
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-slate-400 transition hover:border-white/20 hover:text-white"
            aria-label="Close artist panel"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Hero */}
          <div className="relative aspect-[2/1] overflow-hidden">
            <CoverArt
              src={artist.heroImage}
              alt={artist.name}
              sizes="(max-width: 640px) 100vw, 400px"
              className="object-cover opacity-75"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_25%,#050816_100%)]" />
          </div>

          <div className="px-6 pb-8 pt-4">
            {/* Identity */}
            <h2 className="text-2xl font-semibold text-white">{artist.name}</h2>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-cyan-200/55">
              {artist.rootsLabel}
            </p>

            {/* Vibes */}
            {artist.vibes.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {artist.vibes.slice(0, 4).map((vibe) => (
                  <span
                    key={vibe}
                    className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100"
                  >
                    {formatVibeLabel(vibe)}
                  </span>
                ))}
              </div>
            )}

            {/* Statement */}
            <p className="mt-4 text-sm leading-7 text-slate-300">{artist.statement}</p>

            {/* Stats */}
            <div className="mt-4 flex gap-4 text-xs text-slate-500">
              <span>{artist.songCount} track{artist.songCount !== 1 ? "s" : ""} in rotation</span>
              {artist.genres[0] && <span>{artist.genres[0]}</span>}
            </div>

            {/* Social links */}
            {(artist.socialLinks.instagram ?? artist.socialLinks.tiktok ?? artist.socialLinks.spotify ?? artist.socialLinks.youtube) && (
              <div className="mt-5 flex flex-wrap gap-2">
                {artist.socialLinks.instagram && (
                  <a
                    href={artist.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-[#E1306C]/40 hover:text-white"
                  >
                    Instagram
                  </a>
                )}
                {artist.socialLinks.tiktok && (
                  <a
                    href={artist.socialLinks.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-white/20 hover:text-white"
                  >
                    TikTok
                  </a>
                )}
                {artist.socialLinks.spotify && (
                  <a
                    href={artist.socialLinks.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-[#1DB954]/40 hover:text-white"
                  >
                    Spotify
                  </a>
                )}
                {artist.socialLinks.youtube && (
                  <a
                    href={artist.socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-[#FF0000]/35 hover:text-white"
                  >
                    YouTube
                  </a>
                )}
              </div>
            )}

            {/* CTAs */}
            <div className="mt-6 flex gap-3">
              <Link
                href={`/artists/${artist.slug}`}
                onClick={onClose}
                className="flex-1 inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-6 text-sm font-bold text-white shadow-[0_0_18px_rgba(0,229,255,0.24)] transition hover:shadow-[0_0_30px_rgba(0,229,255,0.4)]"
              >
                Full Profile
              </Link>
              {artist.supportUrl && (
                <Link
                  href={artist.supportUrl}
                  onClick={onClose}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
                >
                  {artist.supportLabel ?? "Support"}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
