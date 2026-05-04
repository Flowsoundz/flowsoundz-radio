export const VISUALIZER_MODES = [
  {
    id: "aurora",
    name: "Aurora Field",
    summary: "Fullscreen particle bloom and cosmic motion.",
  },
  {
    id: "liquid",
    name: "Liquid Mercury",
    summary: "Dense alloy ribbons with a brighter collision core.",
  },
] as const;

export type VisualizerModeId = (typeof VISUALIZER_MODES)[number]["id"];

export const VISUALIZER_MODE_STORAGE_KEY = "flowsoundz-visualizer-mode";

export function isVisualizerModeId(value: string): value is VisualizerModeId {
  return VISUALIZER_MODES.some((mode) => mode.id === value);
}

export function getStoredVisualizerMode(): VisualizerModeId {
  if (typeof window === "undefined") {
    return "aurora";
  }

  try {
    const storedMode = window.localStorage.getItem(VISUALIZER_MODE_STORAGE_KEY);
    return storedMode && isVisualizerModeId(storedMode) ? storedMode : "aurora";
  } catch {
    return "aurora";
  }
}

export function persistVisualizerMode(mode: VisualizerModeId) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(VISUALIZER_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage failures and keep the in-memory mode.
  }
}
