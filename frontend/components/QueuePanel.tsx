import { formatDuration, formatVibeLabel } from "@/lib/format";
import type { Song } from "@/lib/types";

type QueuePanelProps = {
  songs: Song[];
  selectedVibe: string;
  isLoading: boolean;
};

export function QueuePanel({
  songs,
  selectedVibe,
  isLoading,
}: QueuePanelProps) {
  return (
    <aside className="glass-card rounded-[2rem] p-5 md:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-cyan-200/80">
            Queue preview
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Up next</h2>
        </div>
        <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-slate-300">
          {selectedVibe === "all" ? "Mixed" : formatVibeLabel(selectedVibe)}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-[1.3rem] bg-white/8"
            />
          ))}
        </div>
      ) : songs.length > 0 ? (
        <div className="space-y-3">
          {songs.map((song, index) => (
            <div
              key={song.id}
              className="flex items-center gap-4 rounded-[1.4rem] border border-white/10 bg-white/6 p-3"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-[1rem] bg-gradient-to-br from-cyan-300/25 to-fuchsia-400/25 text-sm font-semibold text-white">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">{song.title}</p>
                <p className="truncate text-sm text-slate-300">
                  {song.album ?? "Unknown album"} · {formatVibeLabel(song.vibe ?? "all")}
                </p>
              </div>
              <span className="text-xs text-slate-400">
                {formatDuration(song.duration_sec ?? 0)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm leading-6 text-slate-300">
          The queue is empty right now. Add catalog entries and matching media
          files to keep the radio moving.
        </p>
      )}
    </aside>
  );
}
