import type { MutableRefObject } from "react";

type PlaybackTrack = {
  id: string;
  src: string;
};

let currentTrackId: string | null = null;
let currentAudioElement: HTMLAudioElement | null = null;
let isStarting = false;

export async function playTrack(
  audioRef: MutableRefObject<HTMLAudioElement | null>,
  track: PlaybackTrack,
) {
  const audio = audioRef?.current;
  if (!audio) {
    return;
  }

  const sameAudio = currentAudioElement === audio;
  const sameTrack = currentTrackId === track.id;
  if (sameAudio && sameTrack && !audio.paused && !audio.ended) {
    return;
  }

  if (isStarting) {
    return;
  }

  isStarting = true;
  currentTrackId = track.id;
  currentAudioElement = audio;

  if (track.src && audio.src !== track.src) {
    audio.src = track.src;
  }

  try {
    await audio.play();
  } catch {
    // Playback can still be blocked by the browser.
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
