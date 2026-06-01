import type { MutableRefObject } from "react";

type PlaybackTrack = {
  id: string;
  src: string;
};

type PlaybackAttemptResult = {
  ok: boolean;
  error?: unknown;
  reason?: "no-audio" | "busy" | "play-failed";
};

let currentTrackId: string | null = null;
let currentAudioElement: HTMLAudioElement | null = null;
let isStarting = false;

export async function playTrack(
  audioRef: MutableRefObject<HTMLAudioElement | null>,
  track: PlaybackTrack,
  audioContextRef?: MutableRefObject<AudioContext | null>,
): Promise<PlaybackAttemptResult> {
  const audio = audioRef?.current;
  if (!audio) {
    return {
      ok: false,
      error: new Error("No audio element available."),
      reason: "no-audio",
    };
  }

  const sameAudio = currentAudioElement === audio;
  const sameTrack = currentTrackId === track.id;
  if (sameAudio && sameTrack && !audio.paused && !audio.ended) {
    return { ok: true };
  }

  if (isStarting) {
    if (process.env.NODE_ENV === "development") {
      console.log("[RadioPlayer] skipping duplicate play start", {
        trackId: track.id,
        currentTrackId,
      });
    }
    return {
      ok: false,
      error: new Error("Playback start already in progress."),
      reason: "busy",
    };
  }

  isStarting = true;
  currentTrackId = track.id;
  currentAudioElement = audio;

  if (track.src && audio.src !== track.src) {
    audio.src = track.src;
  }

  audio.muted = false;
  if (audio.volume <= 0) {
    audio.volume = 1;
  }

  try {
    if (audioContextRef?.current?.state === "suspended") {
      await audioContextRef.current.resume();
    }

    console.log("[RadioPlayer] attempting play", {
      trackId: track.id,
      src: track.src,
      currentSrc: audio.currentSrc,
      paused: audio.paused,
      readyState: audio.readyState,
      networkState: audio.networkState,
      volume: audio.volume,
      muted: audio.muted,
      audioContextState: audioContextRef?.current?.state ?? null,
    });
    await audio.play();
    console.log("[RadioPlayer] play success", {
      trackId: track.id,
      paused: audio.paused,
      currentSrc: audio.currentSrc,
      currentTime: audio.currentTime,
      readyState: audio.readyState,
      networkState: audio.networkState,
      volume: audio.volume,
      muted: audio.muted,
    });
    return { ok: true };
  } catch (error) {
    console.error("[RadioPlayer] play failed", {
      trackId: track.id,
      src: track.src,
      currentSrc: audio.currentSrc,
      readyState: audio.readyState,
      networkState: audio.networkState,
      volume: audio.volume,
      muted: audio.muted,
      error,
    });
    return { ok: false, error, reason: "play-failed" };
  } finally {
    window.setTimeout(() => {
      isStarting = false;
    }, 300);
  }
}

export function resetPlaybackController(trackId?: string | null) {
  if (trackId == null || currentTrackId === trackId) {
    currentTrackId = null;
  }

  if (currentAudioElement?.ended || trackId == null) {
    currentAudioElement = null;
  }

  isStarting = false;
}
