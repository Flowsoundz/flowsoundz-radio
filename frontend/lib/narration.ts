import type { TransitionPlan } from "./transitionPlanner";
import { NARRATION_FILE_MANIFEST } from "./generated/narrationManifest";

export type NarrationVoice = "main_host" | "late_host" | "energy_host";
export type NarrationVibe = "hype" | "chill" | "late_night" | "emotional" | "all";

export type NarrationClip = {
  id: string;
  vibe: NarrationVibe;
  label: string;
  clipSrc: string;
  voice: NarrationVoice;
  tags: string[];
};

export type NarrationEvent = NarrationClip & {
  transitionType?: TransitionPlan["transitionType"];
  usedFallback: boolean;
};

type ResolvedNarrationVibe = Exclude<NarrationVibe, "all">;
const AVAILABLE_NARRATION_FILES: Record<NarrationVibe, string[]> = {
  hype: [...NARRATION_FILE_MANIFEST.hype],
  chill: [...NARRATION_FILE_MANIFEST.chill],
  late_night: [...NARRATION_FILE_MANIFEST.late_night],
  emotional: [...NARRATION_FILE_MANIFEST.emotional],
  all: [...NARRATION_FILE_MANIFEST.all],
};

function getNarrationVoice(vibe: NarrationVibe): NarrationVoice {
  if (vibe === "hype") {
    return "energy_host";
  }

  if (vibe === "late_night" || vibe === "emotional") {
    return "late_host";
  }

  return "main_host";
}

function normalizeNarrationVibe(vibe: string): NarrationVibe {
  if (vibe === "hype") return "hype";
  if (vibe === "chill") return "chill";
  if (vibe === "late_night") return "late_night";
  if (vibe === "emotional") return "emotional";
  return "all";
}

function pickRandomNarrationClip(clips: NarrationClip[]): NarrationClip | null {
  if (clips.length === 0) {
    return null;
  }

  return clips[Math.floor(Math.random() * clips.length)];
}

function getNarrationLabel(vibe: ResolvedNarrationVibe, index: number) {
  const titles = {
    hype: "Hype host teaser",
    chill: "Chill host bed",
    late_night: "Late-night whisper",
    emotional: "Emotional host reset",
  } satisfies Record<ResolvedNarrationVibe, string>;

  return `${titles[vibe]} ${index + 1}`;
}

function buildNarrationClip(
  vibe: NarrationVibe,
  fileName: string,
  index: number,
): NarrationClip {
  const clipVibe = vibe === "all" ? "chill" : vibe;

  return {
    id: `narration-${vibe}-${index + 1}`,
    vibe,
    label: getNarrationLabel(clipVibe, index),
    clipSrc: `/audio/narration/${vibe}/${fileName}`,
    voice: getNarrationVoice(clipVibe),
    tags: ["static", vibe, `clip_${index + 1}`],
  };
}

export function getNarrationClipsForVibe(vibe: string): NarrationClip[] {
  const normalizedVibe = normalizeNarrationVibe(vibe);
  const requestedFiles = AVAILABLE_NARRATION_FILES[normalizedVibe];
  const fallbackVibe =
    normalizedVibe !== "chill" && AVAILABLE_NARRATION_FILES.chill.length > 0
      ? "chill"
      : null;

  if (requestedFiles.length === 0 && fallbackVibe) {
    console.log(`[Radio] No narration for "${normalizedVibe}", falling back to "chill"`);
  }

  const sourceVibe = requestedFiles.length > 0 ? normalizedVibe : fallbackVibe;
  const exactClips = sourceVibe
    ? AVAILABLE_NARRATION_FILES[sourceVibe].map((fileName, index) =>
        buildNarrationClip(sourceVibe, fileName, index),
      )
    : [];
  const fallbackClips = AVAILABLE_NARRATION_FILES.all.map((fileName, index) =>
    buildNarrationClip("all", fileName, index),
  );

  return [...exactClips, ...fallbackClips];
}

export function getNarrationEventForVibe(
  vibe: string,
  plan?: TransitionPlan | null,
): NarrationEvent {
  const normalizedVibe = normalizeNarrationVibe(vibe || "all");
  const narrationClip = pickRandomNarrationClip(getNarrationClipsForVibe(normalizedVibe));

  if (!narrationClip) {
    return {
      id: `narration-${normalizedVibe}-unavailable`,
      vibe: normalizedVibe,
      label: "Narration unavailable",
      clipSrc: "",
      voice: getNarrationVoice(normalizedVibe === "all" ? "chill" : normalizedVibe),
      tags: ["missing_audio"],
      transitionType: plan?.transitionType,
      usedFallback: normalizedVibe !== "all",
    };
  }

  return {
    ...narrationClip,
    voice: narrationClip.voice ?? getNarrationVoice(normalizedVibe),
    transitionType: plan?.transitionType,
    usedFallback: narrationClip.vibe !== normalizedVibe,
  };
}
