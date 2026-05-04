import { SiteShell } from "@/components/site-shell";

export default function RadioPage() {
  return (
    <SiteShell
      title="Radio"
      description="Placeholder route for the listening experience."
    >
      <div className="rounded-3xl border border-white/10 bg-panel/80 p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">On Air</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Stream UI placeholder</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
          This route is ready for player controls, current track metadata, and backend integration.
        </p>
      </div>
    </SiteShell>
  );
}
