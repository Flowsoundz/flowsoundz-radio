import Link from "next/link";
import { AppShell } from "@/components/AppShell";

const placements = [
  {
    name: "Station Mention",
    tag: "Listener reach",
    tagColor: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200/80",
    accent: "border-cyan-300/18",
    text: "Your artist name, label, or release spoken in the station rotation — direct, personal, and heard by the most engaged listeners in the lane.",
  },
  {
    name: "Featured Rotation",
    tag: "Priority slot",
    tagColor: "border-[#8B5CF6]/20 bg-[#8B5CF6]/12 text-violet-200/80",
    accent: "border-[#8B5CF6]/22",
    text: "A defined window of priority placement across the curated station feed — positioned ahead of the public discovery lane and ahead of standard rotation.",
  },
  {
    name: "Midnight Drop Sponsorship",
    tag: "Premium moment",
    tagColor: "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200/80",
    accent: "border-fuchsia-400/22",
    text: "Attach your release to a Midnight Drop event — the highest-attention, most culturally charged moment on the station. Limited availability.",
  },
];

const steps = [
  "Submit your release through the Promo Portal with your preferred placement goals.",
  "The FlowSoundz team reviews fit, timing, and placement availability.",
  "Sponsored placement is confirmed and scheduled in the station rotation.",
];

export default function SponsoredPage() {
  return (
    <AppShell
      eyebrow="Sponsored"
      title="Get into the premium lane"
      subtitle="Sponsored placement puts your music in front of FlowSoundz listeners during curated rotation, Midnight Drops, and member moments — not algorithmic noise."
    >
      <section className="grid gap-4 lg:grid-cols-3">
        {placements.map((placement) => (
          <article
            key={placement.name}
            className={`glass-card flex flex-col rounded-[1.8rem] border bg-white/[0.03] p-6 ${placement.accent}`}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-xl font-semibold text-white">
                {placement.name}
              </h2>
              <span
                className={`mt-0.5 shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${placement.tagColor}`}
              >
                {placement.tag}
              </span>
            </div>
            <p className="mt-4 flex-1 text-sm leading-6 text-slate-300">
              {placement.text}
            </p>
            <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-xs font-medium text-white/40">
              By application — limited slots per window
            </div>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(0,229,255,0.07)_0%,rgba(139,92,246,0.07)_52%,rgba(255,45,166,0.07)_100%)] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
          How It Works
        </p>
        <h2 className="mt-3 font-display text-2xl font-semibold text-white">
          Three steps to placement
        </h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step}
              className="rounded-[1.6rem] border border-white/8 bg-[#050816]/55 p-5"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00E5FF_0%,#8B5CF6_60%,#FF2DA6_100%)] text-xs font-semibold text-[#050816]">
                {index + 1}
              </span>
              <p className="mt-3 text-sm leading-6 text-slate-300">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 flex flex-col items-start gap-4 rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">
            Ready to get your release in front of FlowSoundz listeners?
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Start with a promo submission — the team will confirm placement
            options from there.
          </p>
        </div>
        <Link
          href="/promo"
          className="inline-flex shrink-0 min-h-11 items-center justify-center rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-5 py-2.5 text-sm font-semibold text-fuchsia-50 transition hover:border-fuchsia-400/40 hover:bg-fuchsia-400/16"
        >
          Submit your release
        </Link>
      </section>
    </AppShell>
  );
}
