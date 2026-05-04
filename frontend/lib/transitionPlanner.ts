import type { Song } from "./types";

export type TransitionType =
  | "late_night_fade"
  | "hype_cut"
  | "emotional_echo"
  | "smooth_crossfade";

export type TransitionVoice = "velvet_fm" | "club_host" | "after_hours" | "warm_echo";

export type TransitionPlan = {
  transitionType: TransitionType;
  djLine: string;
  djLineSource?: "static" | "ai";
  voice: TransitionVoice;
  fxLevel: "low" | "medium" | "high";
  durationMs: number;
  useDrop: boolean;
  dropReason: "energy_shift" | "station_reset" | "hold_mood";
};

type TransitionPlannerInput = {
  currentVibe: string;
  nextVibe: string;
  currentSong?: Song | null;
  nextSong?: Song | null;
  previousTransitionType?: TransitionType | null;
};

const TRANSITION_LINES: Record<TransitionType, string[]> = {
  late_night_fade: [
    "Bajale a la luz...",
    "La noche cae mejor asi.",
    "Seguimos suave por aqui.",
  ],
  hype_cut: [
    "Sube eso, que esto cambio.",
    "Ahora si se puso bueno.",
    "Esto viene con mas fuego.",
  ],
  emotional_echo: [
    "Se siente mas profundo ahora.",
    "Deja que esto te pegue.",
    "Esto entra con sentimiento.",
  ],
  smooth_crossfade: [
    "Seguimos sin romper el mood.",
    "Todo fluye desde aqui.",
    "La vibra sigue en movimiento.",
  ],
};

const TRANSITION_CONFIG: Record<
  TransitionType,
  { voice: TransitionVoice; fxLevel: "low" | "medium" | "high"; durationMs: number }
> = {
  late_night_fade: {
    voice: "after_hours",
    fxLevel: "low",
    durationMs: 420,
  },
  hype_cut: {
    voice: "club_host",
    fxLevel: "high",
    durationMs: 140,
  },
  emotional_echo: {
    voice: "warm_echo",
    fxLevel: "medium",
    durationMs: 320,
  },
  smooth_crossfade: {
    voice: "velvet_fm",
    fxLevel: "low",
    durationMs: 260,
  },
};

function normalizeVibe(vibe?: string | null): string {
  return (vibe ?? "").trim().toLowerCase() || "all";
}

function pickLine(type: TransitionType, seed: string): string {
  const lines = TRANSITION_LINES[type];
  const hash = Array.from(seed).reduce((total, character) => {
    return total + character.charCodeAt(0);
  }, 0);

  return lines[hash % lines.length];
}

export function getFallbackTransitionLine(type: TransitionType, seed: string) {
  return pickLine(type, seed);
}

function chooseTransitionType({
  currentVibe,
  nextVibe,
  previousTransitionType,
}: {
  currentVibe: string;
  nextVibe: string;
  previousTransitionType?: TransitionType | null;
}): TransitionType {
  let preferredType: TransitionType;

  if (nextVibe === "late_night") {
    preferredType = "late_night_fade";
  } else if (nextVibe === "hype") {
    preferredType = "hype_cut";
  } else if (nextVibe === "emotional" || nextVibe === "chill") {
    preferredType = "emotional_echo";
  } else if (currentVibe === nextVibe) {
    preferredType = "smooth_crossfade";
  } else {
    preferredType = "smooth_crossfade";
  }

  if (preferredType !== previousTransitionType) {
    return preferredType;
  }

  const fallbackTypes: TransitionType[] = [
    "smooth_crossfade",
    "late_night_fade",
    "emotional_echo",
    "hype_cut",
  ];

  return (
    fallbackTypes.find((type) => type !== previousTransitionType) ?? "smooth_crossfade"
  );
}

export function getTransitionPlan({
  currentVibe,
  nextVibe,
  currentSong,
  nextSong,
  previousTransitionType,
}: TransitionPlannerInput): TransitionPlan {
  const normalizedCurrentVibe = normalizeVibe(currentVibe || currentSong?.vibe);
  const normalizedNextVibe = normalizeVibe(nextVibe || nextSong?.vibe);
  const transitionType = chooseTransitionType({
    currentVibe: normalizedCurrentVibe,
    nextVibe: normalizedNextVibe,
    previousTransitionType,
  });
  const config = TRANSITION_CONFIG[transitionType];
  const seed = [
    normalizedCurrentVibe,
    normalizedNextVibe,
    currentSong?.id ?? "current",
    nextSong?.id ?? "next",
    transitionType,
  ].join(":");
  const useDrop =
    transitionType === "hype_cut" ||
    transitionType === "emotional_echo" ||
    (transitionType === "late_night_fade" && normalizedCurrentVibe !== normalizedNextVibe);

  return {
    transitionType,
    djLine: pickLine(transitionType, seed),
    djLineSource: "static",
    voice: config.voice,
    fxLevel: config.fxLevel,
    durationMs: config.durationMs,
    useDrop,
    dropReason: useDrop ? "energy_shift" : "hold_mood",
  };
}
