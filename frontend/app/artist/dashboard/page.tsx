import Link from "next/link";
import type { Metadata } from "next";
import { CreatorHubShell } from "@/components/creator-hub/CreatorHubShell";
import { CreatorHubDashboardFlow } from "@/components/creator-hub/CreatorHubDashboardFlow";
import { CreatorCommandCenter } from "@/components/creator-hub/CreatorCommandCenter";
import { readCatalogSnapshotFromStore } from "@/lib/catalogSnapshotStore";

export const metadata: Metadata = {
  title: "Creator Hub — FlowSoundz Radio",
  description:
    "FlowSoundz turns unknown songs into curated discovery moments. Build your release, confirm your rights, create AI promo assets, and submit for radio curation review.",
};

export default async function ArtistDashboardPage() {
  const snapshot = await readCatalogSnapshotFromStore();
  const featuredArtist = snapshot.artists[0] ?? null;
  const featuredRelease = featuredArtist?.featuredRelease ?? featuredArtist?.latestRelease ?? null;
  const stationModeCopy =
    snapshot.stationMode === "live"
      ? "live rotation"
      : snapshot.stationMode === "playable_archive"
        ? "playable archive rotation"
        : "radio rotation";

  return (
    <CreatorHubShell
      eyebrow="Creator Hub"
      title="FlowSoundz Creator Hub"
      subtitle={`From song idea to ${stationModeCopy}.`}
    >
      {/* ── Personalized command center (returning artists) — renders null for
            new/anonymous visitors, who then see the onboarding view below. ── */}
      <CreatorCommandCenter />

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
              FlowSoundz turns unknown songs into curated discovery moments.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              Build your release, confirm your rights, generate promo assets with AI, and submit
              your track for FlowSoundz Radio curation review.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                {snapshot.stationMode === "live"
                  ? "Live station context"
                  : snapshot.stationMode === "playable_archive"
                    ? "Playable archive context"
                    : "Maintenance context"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-slate-200">
                {snapshot.artists.length} artist{snapshot.artists.length === 1 ? "" : "s"} in catalog
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-slate-200">
                {snapshot.releases.length} release{snapshot.releases.length === 1 ? "" : "s"} tracked
              </span>
              {featuredRelease ? (
                <span className="rounded-full border border-fuchsia-400/18 bg-fuchsia-400/10 px-3 py-1 text-[11px] font-medium text-fuchsia-100">
                  Spotlight: {featuredRelease.artistName} — {featuredRelease.title}
                </span>
              ) : null}
            </div>
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
            <Link
              href="/artist/submissions"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-6 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              My Submissions
            </Link>
            <Link
              href="/artist/my-stats"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-6 py-2.5 text-sm font-medium text-cyan-300 transition hover:border-cyan-400/35 hover:text-cyan-200"
            >
              My Stats
            </Link>
            <Link
              href="/artist/earnings"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-6 py-2.5 text-sm font-medium text-emerald-300 transition hover:border-emerald-400/35 hover:text-emerald-200"
            >
              My Earnings
            </Link>
            <Link
              href="/artist/drops"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-fuchsia-400/20 bg-fuchsia-400/[0.06] px-6 py-2.5 text-sm font-medium text-fuchsia-300 transition hover:border-fuchsia-400/35 hover:text-fuchsia-200"
            >
              Schedule Drops
            </Link>
            <Link
              href="/artist/posts"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-violet-400/20 bg-violet-400/[0.06] px-6 py-2.5 text-sm font-medium text-violet-300 transition hover:border-violet-400/35 hover:text-violet-200"
            >
              Post Update
            </Link>
          </div>
        </div>
      </div>

      <CreatorHubDashboardFlow
        catalogSummary={{
          stationMode: snapshot.stationMode,
          isFallbackCatalog: snapshot.isFallbackCatalog,
          artistCount: snapshot.artists.length,
          releaseCount: snapshot.releases.length,
          featuredArtistName: featuredArtist?.name ?? null,
          featuredTrackTitle: featuredRelease?.title ?? null,
        }}
      />

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
              href="/artist/submit"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-400/25 px-6 py-2.5 text-sm font-semibold text-cyan-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
            >
              Submit for Review
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
