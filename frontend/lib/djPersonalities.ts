export type RadioVibe = "hype" | "chill" | "late_night" | "emotional";

export type DJHostId = "male_hype" | "female_late_night" | "neutral_chill" | "soft_emotional";

export type DJPersonalityProfile = {
  vibe: RadioVibe;
  hostId: DJHostId;
  displayName: string;
  tone: string;
  energy: number;
  flirtLevel: number;
  narrationStyle: string;
  preferredDropCategory: string;
  fallbackDropUrl: string;
  sampleLines: string[];
};

export const DJ_PERSONALITIES: Record<RadioVibe, DJPersonalityProfile> = {
  hype: {
    vibe: "hype",
    hostId: "male_hype",
    displayName: "Rico Flame",
    tone: "energetic, punchy, confident, live-radio, high momentum",
    energy: 10,
    flirtLevel: 2,
    narrationStyle: "short hype bursts, punch-ins, momentum-driving transitions",
    preferredDropCategory: "hype",
    fallbackDropUrl: "/drops/hype-01.mp3",
    sampleLines: [
      "FlowSoundz Radio, keep it locked.",
      "You already know the energy.",
      "Big vibe, big motion, next one coming in hot."
    ]
  },

  chill: {
    vibe: "chill",
    hostId: "neutral_chill",
    displayName: "Nova Calm",
    tone: "cool, smooth, minimal, relaxed, premium",
    energy: 4,
    flirtLevel: 1,
    narrationStyle: "light touch, spacious transitions, minimal interruptions",
    preferredDropCategory: "chill",
    fallbackDropUrl: "/drops/chill-01.mp3",
    sampleLines: [
      "You’re locked into FlowSoundz Radio.",
      "Let it breathe. Let it ride.",
      "Smooth transition, smooth night."
    ]
  },

  late_night: {
    vibe: "late_night",
    hostId: "female_late_night",
    displayName: "Velvet Rose",
    tone: "sensual, intimate, flirty, soft, confident, premium late-night radio",
    energy: 5,
    flirtLevel: 9,
    narrationStyle: "slow intimate phrasing, seductive transitions, warm presence",
    preferredDropCategory: "late_night",
    fallbackDropUrl: "/drops/late-night-01.mp3",
    sampleLines: [
      "Mmm... you’re with me tonight on FlowSoundz Radio.",
      "Stay close, I got the next one for you.",
      "Late nights sound better like this."
    ]
  },

  emotional: {
    vibe: "emotional",
    hostId: "soft_emotional",
    displayName: "Luna Echo",
    tone: "soft, reflective, emotional, warm, intimate",
    energy: 3,
    flirtLevel: 3,
    narrationStyle: "gentle narration, reflective bridges, emotionally aware transitions",
    preferredDropCategory: "emotional",
    fallbackDropUrl: "/drops/emotional-01.mp3",
    sampleLines: [
      "Some songs say what words can’t.",
      "Take a breath. Stay in the moment.",
      "This is FlowSoundz Radio after dark."
    ]
  }
};

export function getDJPersonality(vibe: string): DJPersonalityProfile {
  if (vibe === "hype") return DJ_PERSONALITIES.hype;
  if (vibe === "chill") return DJ_PERSONALITIES.chill;
  if (vibe === "late_night") return DJ_PERSONALITIES.late_night;
  if (vibe === "emotional") return DJ_PERSONALITIES.emotional;

  return DJ_PERSONALITIES.chill;
}