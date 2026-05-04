export type AudioMetrics = {
  bass: number;
  mids: number;
  highs: number;
  volume: number;
  presence: number;
};

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

function averageRange(data: Uint8Array, from: number, to: number) {
  const start = Math.max(0, Math.floor(from));
  const end = Math.min(data.length, Math.ceil(to));

  if (end <= start) {
    return 0;
  }

  let total = 0;
  for (let index = start; index < end; index += 1) {
    total += data[index] ?? 0;
  }

  return total / (end - start) / 255;
}

function getBinRangeForFrequency(
  dataLength: number,
  sampleRate: number,
  fftSize: number,
  minHz: number,
  maxHz: number,
) {
  const nyquist = sampleRate / 2;
  const minIndex = (minHz / nyquist) * dataLength;
  const maxIndex = (maxHz / nyquist) * dataLength;

  return {
    from: clamp01(minIndex / dataLength) * dataLength,
    to: clamp01(maxIndex / dataLength) * dataLength,
  };
}

export function analyzeFrequencyData(
  data: Uint8Array,
  sampleRate = 48_000,
  fftSize = data.length * 2,
): AudioMetrics {
  if (data.length === 0) {
    return {
      bass: 0,
      mids: 0,
      highs: 0,
      volume: 0,
      presence: 0,
    };
  }

  const bassRange = getBinRangeForFrequency(data.length, sampleRate, fftSize, 20, 180);
  const midsRange = getBinRangeForFrequency(data.length, sampleRate, fftSize, 180, 2200);
  const highsRange = getBinRangeForFrequency(data.length, sampleRate, fftSize, 2200, 10_000);
  const presenceRange = getBinRangeForFrequency(data.length, sampleRate, fftSize, 1200, 5200);

  const bass = averageRange(data, bassRange.from, bassRange.to);
  const mids = averageRange(data, midsRange.from, midsRange.to);
  const highs = averageRange(data, highsRange.from, highsRange.to);
  const volume = averageRange(data, 0, data.length);
  const presence = averageRange(data, presenceRange.from, presenceRange.to);

  return {
    bass,
    mids,
    highs,
    volume,
    presence,
  };
}

export function createIdleAudioMetrics(time: number, motion = 1): AudioMetrics {
  const bass = 0.18 + Math.sin(time * 1.2 * motion) * 0.08;
  const mids = 0.22 + Math.cos(time * 0.9 * motion) * 0.06;
  const highs = 0.17 + Math.sin(time * 1.8 * motion + 0.9) * 0.05;
  const volume = 0.2 + Math.cos(time * 0.7 * motion + 0.4) * 0.04;
  const presence = 0.2 + Math.sin(time * 1.4 * motion + 0.2) * 0.04;

  return {
    bass: clamp01(bass),
    mids: clamp01(mids),
    highs: clamp01(highs),
    volume: clamp01(volume),
    presence: clamp01(presence),
  };
}

export function mixAudioMetrics(
  current: AudioMetrics,
  target: AudioMetrics,
  smoothing: number,
): AudioMetrics {
  const amount = clamp01(smoothing);

  return {
    bass: current.bass + (target.bass - current.bass) * amount,
    mids: current.mids + (target.mids - current.mids) * amount,
    highs: current.highs + (target.highs - current.highs) * amount,
    volume: current.volume + (target.volume - current.volume) * amount,
    presence: current.presence + (target.presence - current.presence) * amount,
  };
}
