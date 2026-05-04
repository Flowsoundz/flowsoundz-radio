import { BED_FILE_MANIFEST } from "./generated/bedManifest";

export type TransitionBedVibe = "hype" | "chill" | "late_night" | "emotional" | "all";

export type TransitionBed = {
  id: string;
  vibe: TransitionBedVibe;
  label: string;
  src: string;
  usedFallback: boolean;
};

const AVAILABLE_BEDS: Record<TransitionBedVibe, string[]> = {
  hype: [...BED_FILE_MANIFEST.hype],
  chill: [...BED_FILE_MANIFEST.chill],
  late_night: [...BED_FILE_MANIFEST.late_night],
  emotional: [...BED_FILE_MANIFEST.emotional],
  all: [...BED_FILE_MANIFEST.all],
};

const AVAILABLE_BED_SRCS = new Set(
  Object.entries(AVAILABLE_BEDS).flatMap(([vibe, files]) =>
    files.map((fileName) => `/audio/beds/${vibe}/${fileName}`),
  ),
);
const BED_FALLBACKS: Record<TransitionBedVibe, TransitionBedVibe[]> = {
  hype: ["hype", "all"],
  chill: ["chill", "late_night", "all"],
  late_night: ["late_night", "chill", "all"],
  emotional: ["emotional", "late_night", "all"],
  all: ["all"],
};

function normalizeBedVibe(vibe: string): TransitionBedVibe {
  if (vibe === "hype") return "hype";
  if (vibe === "chill") return "chill";
  if (vibe === "late_night") return "late_night";
  if (vibe === "emotional") return "emotional";
  return "all";
}

function toBed(vibe: TransitionBedVibe, fileName: string, index: number): TransitionBed {
  return {
    id: `bed-${vibe}-${index + 1}`,
    vibe,
    label: `${vibe.replace("_", " ")} transition bed ${index + 1}`,
    src: `/audio/beds/${vibe}/${fileName}`,
    usedFallback: false,
  };
}

function filterRecentBeds(beds: TransitionBed[], recentBedIds: string[]) {
  return beds.filter((bed) => !recentBedIds.includes(bed.id));
}

function pickRandomBed(beds: TransitionBed[]) {
  if (beds.length === 0) {
    return null;
  }

  return beds[Math.floor(Math.random() * beds.length)];
}

function scoreBed(bed: TransitionBed, requestedVibe: TransitionBedVibe) {
  const vibeScore = bed.vibe === requestedVibe ? 10 : bed.vibe === "all" ? 2 : 6;
  return vibeScore + Math.random();
}

export function getTransitionBedForVibe(
  vibe: string,
  recentBedIds: string[] = [],
): TransitionBed | null {
  const normalizedVibe = normalizeBedVibe(vibe);
  const fallbackChain = BED_FALLBACKS[normalizedVibe];
  const pool = fallbackChain.flatMap((candidateVibe) =>
    AVAILABLE_BEDS[candidateVibe].map((fileName, index) => ({
      ...toBed(candidateVibe, fileName, index),
      usedFallback: candidateVibe !== normalizedVibe,
    })),
  );

  console.log("[BED LOAD]", {
    requestedVibe: normalizedVibe,
    fallbackChain,
    recentBedIds,
    availableCount: pool.length,
  });

  if (pool.length === 0) {
    console.log("[BED SELECT]", {
      requestedVibe: normalizedVibe,
      bed: null,
      reason: "no_beds_available",
    });
    return null;
  }

  const nonRecentPool = filterRecentBeds(pool, recentBedIds.slice(0, 3));
  const rankedPool = (nonRecentPool.length > 0 ? nonRecentPool : pool)
    .map((bed) => ({
      bed,
      score: scoreBed(bed, normalizedVibe),
    }))
    .sort((left, right) => right.score - left.score);
  const selectedBed = rankedPool[0]?.bed ?? pickRandomBed(pool);

  console.log("[BED SELECTED]", selectedBed);
  console.log("[BED SELECT]", {
    requestedVibe: normalizedVibe,
    bedId: selectedBed?.id ?? null,
    bedSrc: selectedBed?.src ?? null,
    usedFallback: selectedBed?.usedFallback ?? false,
  });

  return selectedBed;
}

export function isTransitionBedSrc(src: string): boolean {
  return AVAILABLE_BED_SRCS.has(src);
}
