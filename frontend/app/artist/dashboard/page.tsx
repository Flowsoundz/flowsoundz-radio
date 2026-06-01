import Link from "next/link";
import type { Metadata } from "next";
import { CreatorHubShell } from "@/components/creator-hub/CreatorHubShell";
import { CreatorHubDashboardFlow } from "@/components/creator-hub/CreatorHubDashboardFlow";

export const metadata: Metadata = {
  title: "Creator Hub — FlowSoundz Radio",
  description:
    "From song idea to radio rotation. Build your release, understand your rights, create promo assets, and submit to FlowSoundz Radio.",
};

export default function ArtistDashboardPage() {
  return (
    <CreatorHubShell
      eyebrow="Creator Hub"
      title="FlowSoundz Creator Hub"
      subtitle="From song idea to radio rotation."
    >
      {/* ── Hero ── */}
      <div className="relative mb-10 overflow-hidden rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,#0c1328_0%,#07111f_55%,#050816_100%)] px-6 py-12 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-0 h-64 w-64 rounded-full bg-[#00e5ff]/7 blur-[90px]" />
          <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-[#7c4dff]/9 blur-[90px]" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-6">
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/80">
            Creator Hub · MVP
          </span>
          <div>
            <h2 className="text-[clamp(1.4rem,3.5vw,2.2rem)] font-semibold text-white">
              Create it. Clear it. Release it. Get heard.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              Start your release journey. Build your song, check your rights, create visuals,
              and submit for FlowSoundz Radio review.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/artist/create"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_22px_rgba(0,229,255,0.3)] transition hover:shadow-[0_0_36px_rgba(0,229,255,0.5)]"
            >
              Create Release
            </Link>
            <Link
              href="/artist/submit"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/5"
            >
              Submit Track
            </Link>
            <Link
              href="/artist/rights"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-6 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              Check Rights
            </Link>
          </div>
        </div>
      </div>

      <CreatorHubDashboardFlow />

      {/* ── Bottom CTA ── */}
      <div
        className="rounded-[1.9rem] p-px"
        style={{
          background: "linear-gradient(135deg, #00e5ff 0%, #7c4dff 100%)",
        }}
      >
        <div className="flex flex-col items-center gap-5 rounded-[calc(1.9rem-1px)] bg-[#07111f] px-8 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-300/80">
              Ready to submit?
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              Start the release flow.
            </h2>
            <p className="mt-1.5 text-sm text-slate-300">
              Complete the steps above, then submit your track for review.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-center gap-3">
            <Link
              href="/artist/create"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(0,229,255,0.35)] transition hover:shadow-[0_0_28px_rgba(0,229,255,0.55)]"
            >
              Start Creating
            </Link>
            <Link
              href="/radio"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/5"
            >
              Tune In
            </Link>
          </div>
        </div>
      </div>
    </CreatorHubShell>
  );
}
