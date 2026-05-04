export const VISUALIZER_PRESET_IDS = [
  "mercury-core",
  "alloy-bloom",
  "violet-surge",
  "solar-tide",
] as const;

export type VisualizerPresetId = (typeof VISUALIZER_PRESET_IDS)[number];

export type VisualizerPreset = {
  id: VisualizerPresetId;
  name: string;
  hudLabel: string;
  summary: string;
  accentA: string;
  accentB: string;
  accentC: string;
  accentD: string;
  energy: string;
  glowCore: string;
  glowOuter: string;
  ring: string;
  waveSpeed: number;
  motion: number;
  particleDensity: number;
};

export const VISUALIZER_PRESETS: VisualizerPreset[] = [
  {
    id: "mercury-core",
    name: "Mercury Core",
    hudLabel: "Cinematic Alloy",
    summary:
      "Cyan and electric blue liquid ribbons crash into a bright central core with premium chrome-like bloom.",
    accentA: "#00e5ff",
    accentB: "#0099ff",
    accentC: "#7c4dff",
    accentD: "#ff3df2",
    energy: "#ff9f1c",
    glowCore: "#00e5ff",
    glowOuter: "#7c4dff",
    ring: "#8fdcff",
    waveSpeed: 1,
    motion: 1,
    particleDensity: 1,
  },
  {
    id: "alloy-bloom",
    name: "Alloy Bloom",
    hudLabel: "Mirror Bloom",
    summary:
      "A smoother reflective field with denser silver-like bloom and slower ripples for luxury playback moments.",
    accentA: "#00e5ff",
    accentB: "#7c4dff",
    accentC: "#ff3df2",
    accentD: "#ff9f1c",
    energy: "#ffffff",
    glowCore: "#ffffff",
    glowOuter: "#0099ff",
    ring: "#b8c7ff",
    waveSpeed: 0.82,
    motion: 0.82,
    particleDensity: 0.8,
  },
  {
    id: "violet-surge",
    name: "Violet Surge",
    hudLabel: "Neon Collision",
    summary:
      "Purple and pink energy pushes harder through the center for more club-like, high-voltage motion.",
    accentA: "#7c4dff",
    accentB: "#ff3df2",
    accentC: "#00e5ff",
    accentD: "#0099ff",
    energy: "#ff9f1c",
    glowCore: "#ff3df2",
    glowOuter: "#7c4dff",
    ring: "#f4b1ff",
    waveSpeed: 1.2,
    motion: 1.1,
    particleDensity: 1.18,
  },
  {
    id: "solar-tide",
    name: "Solar Tide",
    hudLabel: "Amber Pressure",
    summary:
      "Orange highlights melt into cyan and blue waves for a hotter premium contrast without losing the dark cinematic base.",
    accentA: "#0099ff",
    accentB: "#00e5ff",
    accentC: "#ff9f1c",
    accentD: "#ff3df2",
    energy: "#ff9f1c",
    glowCore: "#ff9f1c",
    glowOuter: "#00e5ff",
    ring: "#ffd2a1",
    waveSpeed: 1.06,
    motion: 0.96,
    particleDensity: 0.94,
  },
];

export function getVisualizerPreset(id: VisualizerPresetId): VisualizerPreset {
  return VISUALIZER_PRESETS.find((preset) => preset.id === id) ?? VISUALIZER_PRESETS[0]!;
}
