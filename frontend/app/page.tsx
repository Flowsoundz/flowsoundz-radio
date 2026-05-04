import { SiteShell } from "@/components/site-shell";

export default function HomePage() {
  const cards = [
    ["Live Radio", "Frontend shell is ready for player and stream integration."],
    ["Visualizer", "Audio-reactive visual space is stubbed and route-ready."],
    ["Backend Ready", "FastAPI backend is preserved separately at repo root."],
  ];

  return (
    <SiteShell
      title="FlowSoundz Radio MVP"
      description="Cleaned repo baseline prepared for GitHub and local development."
    >
      <section className="grid gap-6 md:grid-cols-3">
        {cards.map(([heading, copy]) => (
          <article
            key={heading}
            className="rounded-3xl border border-white/10 bg-panel/80 p-6 shadow-lg shadow-black/20"
          >
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
              {heading}
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-300">{copy}</p>
          </article>
        ))}
      </section>
    </SiteShell>
  );
}
