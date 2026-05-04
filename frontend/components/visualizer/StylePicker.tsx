"use client";

import {
  VISUALIZER_PRESETS,
  type VisualizerPresetId,
} from "@/lib/visualizerPresets";

type StylePickerProps = {
  value: VisualizerPresetId;
  onChange: (value: VisualizerPresetId) => void;
};

export function StylePicker({ value, onChange }: StylePickerProps) {
  return (
    <div className="glass-card rounded-[1.75rem] border border-white/10 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
        Visual Style
      </p>
      <h2 className="mt-2 text-lg font-semibold text-white">Mercury preset bank</h2>
      <div className="mt-4 grid gap-3">
        {VISUALIZER_PRESETS.map((preset) => {
          const active = preset.id === value;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(preset.id)}
              className={`rounded-[1.4rem] border p-4 text-left transition ${
                active
                  ? "border-cyan-300/30 bg-[linear-gradient(135deg,rgba(0,229,255,0.13),rgba(124,77,255,0.12),rgba(255,159,28,0.1))] shadow-[0_0_32px_rgba(0,229,255,0.09)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/18 hover:bg-white/[0.05]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{preset.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                    {preset.hudLabel}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-300">
                    {preset.summary}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {[preset.accentA, preset.accentB, preset.accentC, preset.accentD].map((color) => (
                    <span
                      key={color}
                      className="h-3 w-3 rounded-full border border-white/18"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
