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
    hasStartedPlayback,
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
  }, [audioRef]);

  if (pathname === "/radio") {
    return null;
  }

  if (!hasStartedPlayback || !hasSource || !currentTrack) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-[90] md:inset-x-auto md:bottom-6 md:right-6 md:w-[390px]">
      <div className="mx-auto flex min-h-[78px] w-full items-center gap-3 rounded-2xl border border-cyan-300/12 bg-[linear-gradient(135deg,rgba(4,8,18,0.94)_0%,rgba(8,13,28,0.96)_60%,rgba(11,8,24,0.94)_100%)] px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.42),0_0_28px_rgba(0,229,255,0.12),0_0_42px_rgba(124,77,255,0.12),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/12 bg-white/6 text-sm font-semibold text-white transition hover:bg-white/10"
            aria-label={isPlaying ? "Pause playback" : "Play playback"}
          >
            {isPlaying ? "❚❚" : "▶"}
          </button>
          <button
            type="button"
            onClick={() => {
              void skipTrackRef.current?.();
            }}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/12 bg-white/6 text-lg text-white transition hover:bg-white/10"
            aria-label="Skip track"
          >
            ↦
          </button>
        </div>
      </div>
    </div>
  );
}
