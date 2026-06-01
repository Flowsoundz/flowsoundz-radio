"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CoverArt } from "@/components/CoverArt";
import { getCoverUrl } from "@/lib/api";
import type { ArtistProfile } from "@/lib/artists";
import { formatDuration, formatVibeLabel } from "@/lib/format";

type Props = {
  artist: ArtistProfile;
  isFallbackCatalog: boolean;
};

type SocialLink = {
  href: string;
  label: string;
  glyph: string;
};

function buildSocialLinks(artist: ArtistProfile): SocialLink[] {
  const links: SocialLink[] = [];

  if (artist.socialLinks.instagram) {
    links.push({ href: artist.socialLinks.instagram, label: "Instagram", glyph: "◎" });
  }
  if (artist.socialLinks.tiktok) {
    links.push({ href: artist.socialLinks.tiktok, label: "TikTok", glyph: "♪" });
  }
  if (artist.socialLinks.spotify) {
    links.push({ href: artist.socialLinks.spotify, label: "Spotify", glyph: "◐" });
  }
  if (artist.socialLinks.youtube) {
    links.push({ href: artist.socialLinks.youtube, label: "YouTube", glyph: "▶" });
  }

  return links;
}

function WaveformBar({ index }: { index: number }) {
  const height = 18 + ((index * 17) % 52);
  const opacity = 0.2 + ((index % 6) * 0.12);

  return (
    <span
      className="w-[3px] rounded-full bg-[linear-gradient(180deg,#7c4dff_0%,#00e5ff_100%)]"
      style={{ height, opacity }}
    />
  );
}

export function ArtistDiscoveryProfile({ artist, isFallbackCatalog }: Props) {
  const [selectedMood, setSelectedMood] = useState<string>("all");
  const [featuredPlaying, setFeaturedPlaying] = useState(false);
  const socialLinks = useMemo(() => buildSocialLinks(artist), [artist]);

  const filteredEntries = useMemo(() => {
    if (selectedMood === "all") {
      return artist.rotationEntries;
    }

    return artist.rotationEntries.filter((entry) => entry.song.vibe === selectedMood);
  }, [artist.rotationEntries, selectedMood]);

  const featuredStory =
    artist.featuredSong?.behind_the_mix_text ??
    "A spotlight record from the current FlowSoundz discovery rotation.";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.32fr)_340px]">
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,rgba(11,18,36,0.96),rgba(36,12,54,0.92))] p-4 shadow-[0_24px_80px_rgba(7,11,22,0.42)]">
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="relative overflow-hidden rounded-[1.6rem] border border-cyan-300/28 bg-black/30 shadow-[inset_0_0_0_1px_rgba(0,229,255,0.08)]">
              <div className="absolute inset-0 rounded-[1.6rem] border border-dashed border-cyan-300/45" />
              <div className="relative mx-auto aspect-[9/16] max-h-[460px] w-full">
                {artist.artistVisualUrl ? (
                  <CoverArt
                    src={artist.artistVisualUrl}
                    alt={`${artist.name} visual`}
                    sizes="220px"
                    className="object-cover"
                  />
                ) : (
                  <CoverArt
                    src={artist.heroImage}
                    alt={`${artist.name} artwork`}
                    sizes="220px"
                    className="object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,22,0.04),rgba(5,8,22,0.46)_66%,rgba(5,8,22,0.88))]" />
                <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
                  <span className="rounded-full border border-white/12 bg-black/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                    9:16 story frame
                  </span>
                  {artist.isLiveInVisualizer ? (
                    <span className="rounded-full border border-emerald-300/25 bg-emerald-400/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.22)]">
                      Live now
                    </span>
                  ) : null}
                </div>
                <div className="absolute bottom-4 left-4 right-4 rounded-[1rem] border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
                    A day in the life
                  </p>
                  <p className="mt-2 text-sm text-white/80">
                    Artist greeting loops, session snippets, and short-form moments belong here.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-[1.6rem] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(0,229,255,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-200/80">
                  FlowSoundz Select
                </p>
                <h2 className="mt-4 text-[clamp(2rem,5vw,3.5rem)] font-semibold tracking-tight text-white">
                  {artist.name}
                </h2>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100">
                    {artist.rootsLabel}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {socialLinks.map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm font-semibold text-white/80 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-white"
                        title={link.label}
                        aria-label={link.label}
                      >
                        {link.glyph}
                      </a>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    In Their Own Words
                  </p>
                  <p className="mt-3 max-w-3xl text-base leading-8 text-slate-100">
                    “{artist.statement}”
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {artist.genres.slice(0, 4).map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/85 transition hover:border-cyan-300/24 hover:bg-cyan-300/[0.08]"
                    >
                      {genre}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMood("all")}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                      selectedMood === "all"
                        ? "border-cyan-300/24 bg-cyan-300/10 text-white"
                        : "border-white/10 bg-white/[0.03] text-slate-300 hover:text-white"
                    }`}
                  >
                    All moods
                  </button>
                  {artist.vibes.map((vibe) => (
                    <button
                      key={vibe}
                      type="button"
                      onClick={() => setSelectedMood(vibe)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                        selectedMood === vibe
                          ? "border-fuchsia-300/24 bg-fuchsia-500/10 text-white"
                          : "border-white/10 bg-white/[0.03] text-slate-300 hover:text-white"
                      }`}
                    >
                      {formatVibeLabel(vibe)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="glass-card rounded-[1.85rem] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
                Featured Track
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-white">
                {artist.featuredSong?.title ?? "Current spotlight"}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setFeaturedPlaying((value) => !value)}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_52%,#ff2da6_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_0_28px_rgba(0,229,255,0.22)] transition hover:shadow-[0_0_38px_rgba(0,229,255,0.34)]"
            >
              {featuredPlaying ? "Pause Featured Track" : "Play Featured Track"}
            </button>
          </div>

          <div className="mt-4 rounded-[1.4rem] border border-white/8 bg-black/20 px-4 py-4">
            <div className="flex items-center gap-1 overflow-hidden">
              {Array.from({ length: 84 }).map((_, index) => (
                <WaveformBar key={index} index={index} />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-300">
                {featuredPlaying
                  ? "Waveform active. Open Radio for full playback and queue context."
                  : "Inline waveform preview for artist discovery and featured track context."}
              </p>
              <Link
                href={artist.featuredSong ? `/radio?song=${artist.featuredSong.id}` : "/radio"}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.08]"
              >
                Open on radio
              </Link>
            </div>
          </div>

          <div className="mt-4 rounded-[1.4rem] border border-fuchsia-400/14 bg-fuchsia-500/[0.04] px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-fuchsia-200/80">
              Behind the Track
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-100">{featuredStory}</p>
          </div>
        </section>

        <section className="glass-card rounded-[1.85rem] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
                Rotation
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Tracks on station</h3>
            </div>
            <Link
              href="/songs"
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Full catalog
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {filteredEntries.map(({ song, milestone }) => {
              const progress = Math.max(
                8,
                Math.min(100, Math.round((milestone.current / milestone.goal) * 100)),
              );

              return (
                <article
                  key={song.id}
                  className="rounded-[1.45rem] border border-white/8 bg-white/[0.03] p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[1rem] bg-gradient-to-br from-cyan-400/20 to-fuchsia-500/20">
                      <CoverArt
                        src={getCoverUrl(song)}
                        alt={`${song.title} cover`}
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="truncate text-lg font-semibold text-white">{song.title}</h4>
                          <p className="mt-1 text-sm text-slate-300">
                            {song.genre ?? "Independent"} · {formatDuration(song.duration_sec ?? 0)}
                          </p>
                        </div>
                        <Link
                          href={`/radio?song=${song.id}`}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.08]"
                        >
                          Quick play
                        </Link>
                      </div>

                      <p className="mt-3 text-sm text-slate-300">
                        Help reach {milestone.goal} favorites to {milestone.rewardLabel.toLowerCase()}.
                      </p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#7c4dff_0%,#00e5ff_100%)]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <aside className="space-y-5">
        <section className="glass-card rounded-[1.8rem] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
            Live Activation
          </p>
          <div className="mt-4 rounded-[1.35rem] border border-white/8 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Visualizer Studio</h3>
                <p className="mt-1 text-sm text-slate-300">
                  {artist.isLiveInVisualizer
                    ? artist.liveSessionTitle ?? "Listening party active"
                    : `Open studio for ${artist.name}`}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                  artist.isLiveInVisualizer
                    ? "border border-emerald-300/20 bg-emerald-400/15 text-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.22)]"
                    : "border border-white/10 bg-white/[0.04] text-slate-300"
                }`}
              >
                {artist.isLiveInVisualizer ? "Live now" : "Studio ready"}
              </span>
            </div>
            <Link
              href={`/visualizer?artist=${encodeURIComponent(artist.name)}`}
              className={`mt-4 inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold text-white transition ${
                artist.isLiveInVisualizer
                  ? "bg-[linear-gradient(135deg,#34d399_0%,#00e5ff_100%)] shadow-[0_0_24px_rgba(52,211,153,0.24)]"
                  : "border border-white/12 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.08]"
              }`}
            >
              {artist.isLiveInVisualizer ? "Join listening party" : "Open visualizer studio"}
            </Link>
          </div>
        </section>

        <section className="glass-card rounded-[1.8rem] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
            Profile Summary
          </p>
          <div className="mt-4 grid gap-3">
            <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tracks</p>
              <p className="mt-2 text-3xl font-semibold text-white">{artist.songCount}</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Genres</p>
              <p className="mt-2 text-sm leading-7 text-white">
                {artist.genres.join(" / ") || "Independent"}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Featured Track</p>
              <p className="mt-2 text-xl font-semibold text-white">
                {artist.featuredSong?.title ?? "Coming soon"}
              </p>
            </div>
          </div>
        </section>

        <section className="glass-card rounded-[1.8rem] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
            Direct Support
          </p>
          <h3 className="mt-3 text-xl font-semibold text-white">{artist.supportLabel}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Back the next release, help unlock exclusive drops, or support the artist directly.
          </p>
          <Link
            href={artist.supportUrl ?? "/membership"}
            className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c4dff_0%,#ff2da6_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(124,77,255,0.24)] transition hover:shadow-[0_0_34px_rgba(124,77,255,0.34)]"
          >
            {artist.supportLabel}
          </Link>
        </section>

        <section className="glass-card rounded-[1.8rem] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
            Discovery Moods
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Explore other artists with the same energy profile.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {artist.vibes.map((vibe) => (
              <button
                key={vibe}
                type="button"
                onClick={() => setSelectedMood(vibe)}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-cyan-300/24 hover:bg-cyan-300/[0.08]"
              >
                {formatVibeLabel(vibe)}
              </button>
            ))}
          </div>
        </section>

        {isFallbackCatalog ? (
          <section className="glass-card rounded-[1.8rem] border border-fuchsia-400/14 bg-fuchsia-500/[0.04] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-fuchsia-200/75">
              Archive Mode
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              This profile is currently powered by the FlowSoundz curated archive while the live
              station reconnects, so discovery never drops to zero.
            </p>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
