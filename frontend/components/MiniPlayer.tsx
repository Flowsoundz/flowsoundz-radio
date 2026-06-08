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
    isReady,
    hasStartedPlayback,
    togglePlaybackRef,
    skipTrackRef,
  } = useGlobalAudio();
  const [hasSource, setHasSource] = useState(false);
  const [progress, setProgress] = useState(0);

  // isReady is added so this effect re-runs once GlobalAudioProvider has created the
  // audio element — audioRef.current is null on the very first render (children effects
  // run before parents), so depending only on audioRef (stable object) was a no-op.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const syncSourceState = () => {
      const source = audio.currentSrc || audio.src;
      setHasSource(Boolean(source));
    };

    const updateProgress = () => {
      if (audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    syncSourceState();
    audio.addEventListener("play", syncSourceState);
    audio.addEventListener("pause", syncSourceState);
    audio.addEventListener("loadedmetadata", syncSourceState);
    audio.addEventListener("emptied", syncSourceState);
    audio.addEventListener("timeupdate", updateProgress);

    return () => {
      audio.removeEventListener("play", syncSourceState);
      audio.removeEventListener("pause", syncSourceState);
      audio.removeEventListener("loadedmetadata", syncSourceState);
      audio.removeEventListener("emptied", syncSourceState);
      audio.removeEventListener("timeupdate", updateProgress);
    };
  }, [audioRef, isReady]);

  if (pathname === "/radio") {
    return null;
  }

  if (!hasStartedPlayback || !hasSource || !currentTrack) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-[90] md:inset-x-auto md:bottom-6 md:right-6 md:w-[390px]">
      <div className="relative mx-auto flex min-h-[78px] w-full items-center gap-3 overflow-hidden rounded-2xl border border-cyan-300/12 bg-[linear-gradient(135deg,rgba(4,8,18,0.94)_0%,rgba(8,13,28,0.96)_60%,rgba(11,8,24,0.94)_100%)] px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.42),0_0_28px_rgba(0,229,255,0.12),0_0_42px_rgba(124,77,255,0.12),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.06]">
          <div
            className="h-full bg-[linear-gradient(90deg,#00e5ff,#7c4dff)] transition-[width] duration-500 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
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

