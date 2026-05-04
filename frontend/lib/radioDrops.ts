import type { TransitionPlan, TransitionVoice } from "./transitionPlanner";

export type DropVibe = "hype" | "chill" | "late_night" | "emotional" | "all";
type VoiceRole = "main_host" | "late_host" | "energy_host";

type DjDrop = {
  id: string;
  label: string;
  vibe: DropVibe;
  filePath: string;
  voices: TransitionVoice[];
  fallbackSrc: string;
  role: VoiceRole;
};

type DropPlaybackSettings = {
  volume: number;
  playbackRate: number;
};

type PlannedDrop = {
  drop: DjDrop | null;
  settings: DropPlaybackSettings;
};

export type DropSelection = {
  drop: DjDrop | null;
  usedFallback: boolean;
};

const FORCED_DROP_NO_REPEAT_WINDOW = 3;
const SAMPLE_RATE = 22050;
const DROP_DURATION_MS = 900;

function encodeBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function buildToneDropDataUrl(frequencies: number[]): string {
  const totalSamples = Math.floor((SAMPLE_RATE * DROP_DURATION_MS) / 1000);
  const pcm = new Int16Array(totalSamples);

  for (let index = 0; index < totalSamples; index += 1) {
    const time = index / SAMPLE_RATE;
    const attack = Math.min(index / (SAMPLE_RATE * 0.05), 1);
    const release = Math.min((totalSamples - index) / (SAMPLE_RATE * 0.12), 1);
    const envelope = Math.min(attack, release);
    const signal = frequencies.reduce((sum, frequency, frequencyIndex) => {
      return sum + Math.sin(2 * Math.PI * frequency * time + frequencyIndex * 0.35);
    }, 0);

    pcm[index] = (signal / frequencies.length) * envelope * 0.38 * 0x7fff;
  }

  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, pcm.length * 2, true);

  pcm.forEach((sample, index) => {
    view.setInt16(44 + index * 2, sample, true);
  });

  return `data:audio/wav;base64,${encodeBase64(bytes)}`;
}

export const DJ_DROPS: DjDrop[] = [
  {
    id: "drop-hype-01",
    label: "FlowSoundz hype drop",
    vibe: "hype",
    filePath: "/drops/hype-01.mp3",
    voices: ["club_host", "velvet_fm"],
    fallbackSrc: buildToneDropDataUrl([294, 440, 659]),
    role: "energy_host",
  },
  {
    id: "drop-late-night-01",
    label: "After-hours stinger",
    vibe: "late_night",
    filePath: "/drops/late-night-01.mp3",
    voices: ["after_hours", "velvet_fm"],
    fallbackSrc: buildToneDropDataUrl([330, 494, 740]),
    role: "late_host",
  },
  {
    id: "drop-emotional-01",
    label: "Neon night sweep",
    vibe: "emotional",
    filePath: "/drops/emotional-01.mp3",
    voices: ["warm_echo", "after_hours"],
    fallbackSrc: buildToneDropDataUrl([262, 392, 587]),
    role: "late_host",
  },
  {
    id: "drop-chill-01",
    label: "FlowSoundz chill bed",
    vibe: "chill",
    filePath: "/drops/chill-01.mp3",
    voices: ["velvet_fm", "warm_echo"],
    fallbackSrc: buildToneDropDataUrl([247, 370, 554]),
    role: "main_host",
  },
  {
    id: "drop-all-01",
    label: "FlowSoundz station sweep",
    vibe: "all",
    filePath: "/drops/station-01.mp3",
    voices: ["velvet_fm", "club_host", "after_hours", "warm_echo"],
    fallbackSrc: buildToneDropDataUrl([277, 415, 622]),
    role: "main_host",
  },
  {
    id: "drop-hype-02",
    label: "Weekend ignition",
    vibe: "hype",
    filePath: "/drops/generated/weekend_004.mp3",
    voices: ["club_host", "velvet_fm"],
    fallbackSrc: buildToneDropDataUrl([330, 523, 659]),
    role: "energy_host",
  },
  {
    id: "drop-hype-03",
    label: "Next up energy hit",
    vibe: "hype",
    filePath: "/drops/generated/hype_001.mp3",
    voices: ["club_host", "velvet_fm"],
    fallbackSrc: buildToneDropDataUrl([311, 466, 698]),
    role: "energy_host",
  },
  {
    id: "drop-late-night-02",
    label: "Midnight runway",
    vibe: "late_night",
    filePath: "/drops/generated/late_night_002.mp3",
    voices: ["after_hours", "velvet_fm"],
    fallbackSrc: buildToneDropDataUrl([220, 330, 494]),
    role: "late_host",
  },
  {
    id: "drop-all-02",
    label: "Station next-up sweep",
    vibe: "all",
    filePath: "/drops/generated/next_up_005.mp3",
    voices: ["velvet_fm", "club_host", "after_hours"],
    fallbackSrc: buildToneDropDataUrl([277, 349, 554]),
    role: "main_host",
  },
  {
    id: "drop-all-03",
    label: "Station ID burst",
    vibe: "all",
    filePath: "/drops/generated/station_id_003.mp3",
    voices: ["velvet_fm", "club_host", "after_hours", "warm_echo"],
    fallbackSrc: buildToneDropDataUrl([294, 440, 587]),
    role: "main_host",
  },
];

export function getRandomDropInterval(): number {
  return Math.floor(Math.random() * 3) + 2;
}

function normalizeDropVibe(vibe: string): DropVibe {
  if (vibe === "hype") return "hype";
  if (vibe === "chill") return "chill";
  if (vibe === "late_night") return "late_night";
  if (vibe === "emotional") return "emotional";
  return "all";
}

function pickRandomDrop(drops: DjDrop[]): DjDrop | null {
  if (drops.length === 0) {
    return null;
  }

  return drops[Math.floor(Math.random() * drops.length)];
}

function buildDropPlaybackSettings(
  plan?: TransitionPlan | null,
): DropPlaybackSettings {
  const fxDefaults = {
    low: { volume: 0.76, playbackRate: 0.97 },
    medium: { volume: 0.84, playbackRate: 1 },
    high: { volume: 0.92, playbackRate: 1.04 },
  };

  const voiceTuning: Record<TransitionVoice, { volume: number; playbackRate: number }> = {
    velvet_fm: { volume: -0.02, playbackRate: -0.01 },
    club_host: { volume: 0.03, playbackRate: 0.03 },
    after_hours: { volume: -0.04, playbackRate: -0.03 },
    warm_echo: { volume: -0.01, playbackRate: -0.02 },
  };

  if (!plan) {
    return { volume: 0.82, playbackRate: 1 };
  }

  const base = fxDefaults[plan.fxLevel];
  const tuning = voiceTuning[plan.voice];

  return {
    volume: Math.min(Math.max(base.volume + tuning.volume, 0.5), 1),
    playbackRate: Math.min(Math.max(base.playbackRate + tuning.playbackRate, 0.88), 1.12),
  };
}

function getPreferredRole(vibe: string): VoiceRole {
  if (vibe === "hype") return "energy_host";
  if (vibe === "late_night" || vibe === "emotional") return "late_host";
  return "main_host";
}

function getMatchingVibeDrops(vibe: string): DjDrop[] {
  const preferredRole = getPreferredRole(vibe);

  const exactMatches = DJ_DROPS.filter(
    (drop) =>
      (drop.vibe === vibe || drop.vibe === "all") &&
      drop.role === preferredRole,
  );

  if (exactMatches.length > 0) {
    return exactMatches;
  }

  const fallback = DJ_DROPS.filter(
    (drop) => drop.vibe === vibe || drop.vibe === "all",
  );

  if (fallback.length > 0) {
    return fallback;
  }

  return DJ_DROPS;
}

function filterRecentDrops(drops: DjDrop[], recentDropIds: string[]): DjDrop[] {
  return drops.filter((drop) => !recentDropIds.includes(drop.id));
}

export function getDropPlaybackSrc(drop: DjDrop): string {
  return drop.filePath || drop.fallbackSrc;
}

export function getRandomDrop(vibe: string, recentDropIds: string[] = []): DjDrop | null {
  const matchingDrops = getMatchingVibeDrops(vibe);
  const nonRecentMatchingDrops = filterRecentDrops(matchingDrops, recentDropIds);
  const nonRecentDrops = filterRecentDrops(DJ_DROPS, recentDropIds);

  return (
    pickRandomDrop(nonRecentMatchingDrops) ??
    pickRandomDrop(matchingDrops) ??
    pickRandomDrop(nonRecentDrops) ??
    pickRandomDrop(DJ_DROPS)
  );
}

export function getForcedTestDropCandidate(
  vibe: string,
  recentDropIds: string[] = [],
): DropSelection {
  const normalizedVibe = normalizeDropVibe(vibe);
  const exactPool =
    normalizedVibe === "all"
      ? DJ_DROPS
      : DJ_DROPS.filter((drop) => drop.vibe === normalizedVibe);
  const fallbackPool =
    normalizedVibe === "all"
      ? []
      : DJ_DROPS.filter((drop) => drop.vibe === "all");
  const candidatePool =
    exactPool.length > 0
      ? [...exactPool, ...fallbackPool]
      : fallbackPool.length > 0
        ? fallbackPool
        : DJ_DROPS;
  const nonRepeatedPool = filterRecentDrops(
    candidatePool,
    recentDropIds.slice(0, FORCED_DROP_NO_REPEAT_WINDOW),
  );
  const drop =
    pickRandomDrop(nonRepeatedPool) ??
    pickRandomDrop(candidatePool) ??
    pickRandomDrop(DJ_DROPS);

  return {
    drop,
    usedFallback: Boolean(drop && normalizedVibe !== "all" && drop.vibe !== normalizedVibe),
  };
}

export function getPlannedDrop(
  vibe: string,
  recentDropIds: string[] = [],
  plan?: TransitionPlan | null,
): PlannedDrop {
  const matchingDrops = getMatchingVibeDrops(vibe);

  const voiceMatches = plan
    ? matchingDrops.filter((drop) => drop.voices.includes(plan.voice))
    : matchingDrops;

  const nonRecentVoiceMatches = filterRecentDrops(voiceMatches, recentDropIds);
  const nonRecentMatchingDrops = filterRecentDrops(matchingDrops, recentDropIds);

  return {
    drop:
      pickRandomDrop(nonRecentVoiceMatches) ??
      pickRandomDrop(voiceMatches) ??
      pickRandomDrop(nonRecentMatchingDrops) ??
      getRandomDrop(vibe, recentDropIds),
    settings: buildDropPlaybackSettings(plan),
  };
}
