import type { VibeOption } from "@/lib/types";

type VibeChipsProps = {
  options: VibeOption[];
  value: string;
  onChange: (value: string) => void;
};

export function VibeChips({ options, value, onChange }: VibeChipsProps) {
  return (
    <div className="glass-card rounded-[2rem] p-4">
      <p className="mb-4 text-xs font-medium uppercase tracking-[0.28em] text-cyan-200/80">
        Vibe filter
      </p>
      <div className="flex flex-wrap gap-3">
        {options.map((option) => {
          const active = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`min-h-12 rounded-full px-5 text-sm font-medium transition-colors ${
                active
                  ? "bg-gradient-to-r from-cyan-300 to-fuchsia-500 text-slate-950"
                  : "bg-white/8 text-slate-200 hover:bg-white/12"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
