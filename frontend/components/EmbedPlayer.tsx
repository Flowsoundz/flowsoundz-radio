"use client";

import { useEffect, useRef, useState } from "react";

const VIBE_GRADIENT: Record<string, string> = {
  CHILL: "from-cyan-900/80 to-slate-900",
  HYPE: "from-fuchsia-900/80 to-slate-900",
  LATE_NIGHT: "from-violet-900/80 to-slate-900",
  EMOTIONAL: "from-amber-900/80 to-slate-900",
  UNSURE: "from-slate-800 to-slate-900",
};

const VIBE_DOT: Record<string, string> = {
  CHILL: "bg-cyan-400",
  HYPE: "bg-fuchsia-400",
  LATE_NIGHT: "bg-violet-400",
  EMOTIONAL: "bg-amber-400",
  UNSURE: "bg-slate-400",
};

type Props = {
  songId: string;
  title: string;
  artist: string;
  artistSlug: string;
  audioUrl: string;
  coverUrl: string | null;
  vibe: string;
  siteUrl: string;
};

export function EmbedPlayer({ title, artist, artistSlug, audioUrl, coverUrl, vibe, siteUrl }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const vibeKey = vibe.toUpperCase().replace(" ", "_");

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audio.preload = "metadata";
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (audio.duration > 0) setProgress((audio.currentTime / audio.duration) * 100);
    };
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.pause();
    };
  }, [audioUrl]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      void audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }

  const stationUrl = `${siteUrl}/radio`;
  const artistUrl = `${siteUrl}/artists/${artistSlug}`;

  return (
    <div
      className={`flex h-20 w-full items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r ${VIBE_GRADIENT[vibeKey] ?? VIBE_GRADIENT.UNSURE} px-4 font-sans`}
      style={{ fontFamily: "system-ui, sans-serif" }}
    >
      {/* Cover art */}
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={title}
          className="h-12 w-12 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
          <span className="text-xl">🎵</span>
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-tight text-white">{title}</p>
        <a
          href={artistUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-[11px] text-white/60 hover:text-white/90"
        >
          {artist}
        </a>
        {/* Progress bar */}
        <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white/50 transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Play button */}
      <button
        type="button"
        onClick={togglePlay}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 active:scale-95"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Vibe dot + FSR link */}
      <div className="flex shrink-0 flex-col items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${VIBE_DOT[vibeKey] ?? "bg-slate-400"}`} />
        <a
          href={stationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] font-bold uppercase tracking-wider text-white/40 hover:text-white/70"
        >
          FSR
        </a>
      </div>
    </div>
  );
}
