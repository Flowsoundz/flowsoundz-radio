import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CoverArt } from "@/components/CoverArt";
import { getCoverUrl, getSongs } from "@/lib/api";
import { getArtistProfileBySlug } from "@/lib/artists";
import { formatDuration, formatVibeLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ArtistProfilePage(
  props: PageProps<"/artists/[slug]">,
) {
  const { slug } = await props.params;
  const songs = await getSongs();
  const artist = getArtistProfileBySlug(songs, slug);

  if (!artist) {
    notFound();
  }

  return (
    <AppShell
      eyebrow="Artist Profile"
      title={artist.name}
      subtitle={artist.bio}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="space-y-5">
          <section className="glass-card overflow-hidden rounded-[2rem]">
            <div className="relative aspect-[2.1/1] bg-gradient-to-br from-cyan-400/20 to-fuchsia-500/20">
              <CoverArt
                src={artist.heroImage}
                alt={`${artist.name} artwork`}
                sizes="(max-width: 1280px) 100vw, 66vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,22,0.05)_0%,rgba(5,8,22,0.8)_100%)]" />
              <div className="absolute inset-x-6 bottom-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
                  Heard On FlowSoundz
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-white md:text-5xl">
                  {artist.name}
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {artist.genres.slice(0, 3).map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full border border-white/12 bg-black/20 px-3 py-1 text-xs font-medium text-white/85"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="glass-card rounded-[1.8rem] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
                  Rotation
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  Tracks on station
                </h3>
              </div>
              <Link
                href="/songs"
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/18 hover:bg-white/[0.06]"
              >
                Full catalog
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {artist.songs.map((song) => (
                <article
                  key={song.id}
                  className="flex items-center gap-4 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-3"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[1rem] bg-gradient-to-br from-cyan-400/20 to-fuchsia-500/20">
                    <CoverArt
                      src={getCoverUrl(song)}
                      alt={`${song.title} cover`}
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-lg font-semibold text-white">
                      {song.title}
                    </h4>
                    <p className="mt-1 truncate text-sm text-slate-300">
                      {song.album ?? "Unknown album"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-cyan-300/12 px-3 py-1 text-xs font-medium text-cyan-100">
                        {formatVibeLabel(song.vibe ?? "all")}
                      </span>
                      <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-slate-200">
                        {song.genre ?? "Unknown genre"}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="text-sm text-slate-400">
                      {formatDuration(song.duration_sec ?? 0)}
                    </span>
                    <Link
                      href={`/radio?song=${song.id}`}
                      className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold text-white/55 transition hover:border-[#00E5FF]/30 hover:bg-[#00E5FF]/8 hover:text-[#00E5FF]"
                    >
                      <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                      Play
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="glass-card rounded-[1.8rem] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
              Profile Summary
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Tracks
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {artist.songCount}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Genres
                </p>
                <p className="mt-2 text-sm leading-6 text-white">
                  {artist.genres.join(" / ") || "Independent"}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Visualizer
                </p>
                <Link
                  href={`/visualizer?artist=${encodeURIComponent(artist.name)}`}
                  className="mt-2 inline-flex text-sm font-medium text-cyan-200 transition hover:text-white"
                >
                  Open studio for {artist.name}
                </Link>
              </div>
            </div>
          </section>

          {artist.featuredSong ? (
            <section className="glass-card rounded-[1.8rem] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
                Featured Track
              </p>
              <h3 className="mt-3 text-xl font-semibold text-white">
                {artist.featuredSong.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {artist.featuredSong.behind_the_mix_text ??
                  "Featured from the current FlowSoundz rotation."}
              </p>
            </section>
          ) : null}

          {artist.youtubeUrl ? (
            <section className="glass-card rounded-[1.8rem] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
                External
              </p>
              <a
                href={artist.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex rounded-full border border-[#FF0000]/25 bg-[#FF0000]/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#FF0000]/18"
              >
                Watch on YouTube
              </a>
            </section>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
