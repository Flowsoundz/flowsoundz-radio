export function fadeAudioIn(
  audio: HTMLAudioElement,
  {
    durationMs = 220,
    targetVolume = 1,
    steps = 6,
  }: {
    durationMs?: number;
    targetVolume?: number;
    steps?: number;
  } = {},
) {
  audio.volume = 0;

  return new Promise<void>((resolve) => {
    const stepDelay = Math.max(durationMs / steps, 16);
    let step = 0;

    const timer = window.setInterval(() => {
      step += 1;
      audio.volume = Math.min((targetVolume * step) / steps, targetVolume);

      if (step >= steps) {
        window.clearInterval(timer);
        audio.volume = targetVolume;
        resolve();
      }
    }, stepDelay);
  });
}

export function fadeAudioOut(
  audio: HTMLAudioElement,
  {
    durationMs = 220,
    steps = 6,
  }: {
    durationMs?: number;
    steps?: number;
  } = {},
) {
  if (audio.paused || audio.volume <= 0) {
    audio.pause();
    audio.volume = 1;
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const startingVolume = audio.volume;
    const stepDelay = Math.max(durationMs / steps, 16);
    let step = 0;

    const timer = window.setInterval(() => {
      step += 1;
      audio.volume = Math.max(startingVolume * (1 - step / steps), 0);

      if (step >= steps) {
        window.clearInterval(timer);
        audio.pause();
        audio.volume = 1;
        resolve();
      }
    }, stepDelay);
  });
}

export function resetAudioFade(audio: HTMLAudioElement) {
  audio.volume = 1;
}
