import { CoverArt } from "@/components/CoverArt";
import { getCoverUrl } from "@/lib/api";
import { formatDuration, formatVibeLabel } from "@/lib/format";
import type { Song } from "@/lib/types";

type NowPlayingCardProps = {
  song: Song | null;
  isPlaying: boolean;
  songCount: number;
};

export function NowPlayingCard({
  song,
  isPlaying,
  songCount,
}: NowPlayingCardProps) {
  return (
    <section className="glass-card overflow-hidden rounded-[2rem] p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-fuchsia-200/80">
            Now playing
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Current slot</h2>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isPlaying
              ? "bg-emerald-400/18 text-emerald-200"
              : "bg-white/8 text-slate-300"
          }`}
        >
          {isPlaying ? "Live" : "Paused"}
        </span>
      </div>

      {song ? (
        <div className="grid gap-5 md:grid-cols-[170px_1fr]">
          <div className="relative aspect-square overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-cyan-400/20 to-fuchsia-500/20">
            <CoverArt
              src={getCoverUrl(song)}
              alt={`${song.title} cover`}
              sizes="(max-width: 768px) 100vw, 170px"
              className="object-cover"
            />
          </div>

          <div>
            <p className="text-sm text-slate-300">{song.artist}</p>
            <h3 className="mt-1 font-display text-3xl font-semibold text-white">
              {song.title}
            </h3>
            <p className="mt-2 text-base text-slate-300">
              {song.album ?? "Unknown album"}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-slate-200">
                {song.genre ?? "Unknown genre"}
              </span>
              <span className="rounded-full bg-cyan-400/12 px-3 py-1 text-xs font-medium text-cyan-100">
                {formatVibeLabel(song.vibe ?? "all")}
              </span>
              <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-slate-200">
                {formatDuration(song.duration_sec ?? 0)}
              </span>
            </div>

            <p className="mt-6 text-sm leading-6 text-slate-400">
              {songCount} songs currently visible to the frontend from the local
              backend catalog.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-6 text-slate-300">
          No track is loaded yet. Make sure the backend is running and your
          queue can be generated from `catalog.json`.
        </p>
      )}
    </section>
  );
}
