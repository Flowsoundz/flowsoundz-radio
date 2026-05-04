import { SiteShell } from "@/components/site-shell";

export default function ArtistsPage() {
  return (
    <SiteShell
      title="Artists"
      description="Placeholder route for artist discovery and profiles."
    >
      <div className="rounded-3xl border border-white/10 bg-panel/80 p-8">
        <h2 className="text-2xl font-semibold text-white">Artist hub placeholder</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
          Use this route for artist cards, profile links, and feature highlights.
        </p>
      </div>
    </SiteShell>
  );
}
