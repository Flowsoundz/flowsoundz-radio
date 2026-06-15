import Link from "next/link";

const STEPS = [
  {
    n: 1,
    title: "Upload your track",
    body: "One song, your cover art, and the rights confirmation. Takes about two minutes.",
  },
  {
    n: 2,
    title: "We curate & master it",
    body: "Our team reviews every submission by hand and masters approved tracks to broadcast loudness — no algorithm-only gatekeeping.",
  },
  {
    n: 3,
    title: "Go on the air",
    body: "Approved tracks enter the live rotation. You get a shareable artist page and weekly stats on plays, fires, and air times.",
  },
] as const;

// The first-run view for artists who haven't submitted yet. One clear path —
// "submit your first track" — instead of the full toolbox. Returning artists
// see the Command Center + full hero instead (this renders null for them).
export function CreatorOnboarding() {
  return (
    <section className="mb-10">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,#0c1328_0%,#07111f_55%,#050816_100%)] px-6 py-12 sm:px-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-0 h-64 w-64 rounded-full bg-[#00e5ff]/8 blur-[90px]" />
          <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-[#7c4dff]/10 blur-[90px]" />
        </div>
        <div className="relative z-10">
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/80">
            Welcome to the Creator Hub
          </span>
          <h2 className="mt-5 max-w-2xl text-[clamp(1.5rem,4vw,2.4rem)] font-semibold leading-tight text-white">
            Get your first track on FlowSoundz Radio.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
            FlowSoundz is a human-curated radio station — real people pick what airs. Submit a
            track and you could be in the next rotation.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] text-sm font-bold text-white">
                  {s.n}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-white">{s.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-6 text-slate-400">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/artist/submit"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-7 py-3 text-sm font-bold text-white shadow-[0_0_22px_rgba(0,229,255,0.3)] transition hover:shadow-[0_0_36px_rgba(0,229,255,0.5)]"
            >
              Submit your first track →
            </Link>
            <Link
              href="/artist/create"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/5"
            >
              Make one with AI first
            </Link>
            <Link
              href="/radio"
              className="inline-flex min-h-12 items-center justify-center rounded-full px-4 py-3 text-sm font-medium text-slate-400 transition hover:text-white"
            >
              Hear the station ▸
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
