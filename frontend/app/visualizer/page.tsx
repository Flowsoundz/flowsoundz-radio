import { SiteShell } from "@/components/site-shell";

export default function VisualizerPage() {
  return (
    <SiteShell
      title="Visualizer"
      description="Placeholder route for audio-reactive visuals."
    >
      <div className="rounded-3xl border border-white/10 bg-panel/80 p-8">
        <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/15 via-slate-900 to-slate-950 p-6">
            <div className="flex h-64 items-end gap-3">
              {[35, 55, 90, 60, 120, 80, 45, 110, 70, 95].map((height, index) => (
                <span
                  key={index}
                  className="w-full rounded-t-full bg-cyan-300/80"
                  style={{ height }}
                />
              ))}
            </div>
          </div>
          <aside className="rounded-3xl border border-white/10 bg-slate-950/80 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Status</p>
            <h2 className="mt-3 text-xl font-semibold text-white">Visualizer placeholder</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Replace this with waveform analysis, artwork, and live audio state when ready.
            </p>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}
