"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useGlobalAudio } from "@/components/GlobalAudioProvider";

export function MiniPlayer() {
  const pathname = usePathname();
  const {
    audioRef,
    currentTrack,
    isPlaying,
    togglePlaybackRef,
    skipTrackRef,
  } = useGlobalAudio();
  const [hasSource, setHasSource] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const syncSourceState = () => {
      const source = audio.currentSrc || audio.src;
      setHasSource(Boolean(source));
    };

    syncSourceState();
    audio.addEventListener("play", syncSourceState);
    audio.addEventListener("pause", syncSourceState);
    audio.addEventListener("loadedmetadata", syncSourceState);
    audio.addEventListener("emptied", syncSourceState);

    return () => {
      audio.removeEventListener("play", syncSourceState);
      audio.removeEventListener("pause", syncSourceState);
      audio.removeEventListener("loadedmetadata", syncSourceState);
      audio.removeEventListener("emptied", syncSourceState);
    };
  }, [audioRef, currentTrack]);

  if (pathname === "/radio") {
    return null;
  }

  if (!hasSource || !currentTrack) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-[90] md:inset-x-6 md:bottom-5">
      <div className="mx-auto flex max-w-4xl items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(4,8,18,0.92)] px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/70">
            FlowSoundz Radio
          </p>
          <p className="truncate text-sm font-semibold text-white md:text-base">
            {currentTrack.title}
          </p>
          <p className="truncate text-xs text-white/55 md:text-sm">
            {currentTrack.artist}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => togglePlaybackRef.current?.()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/6 text-sm font-semibold text-white transition hover:bg-white/10"
            aria-label={isPlaying ? "Pause playback" : "Play playback"}
          >
            {isPlaying ? "❚❚" : "▶"}
          </button>
          <button
            type="button"
            onClick={() => {
              void skipTrackRef.current?.();
            }}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/6 text-lg text-white transition hover:bg-white/10"
            aria-label="Skip track"
          >
            ↦
          </button>
        </div>
      </div>
    </div>
  );
}
