import type { Metadata } from "next";
import Link from "next/link";
import { CreatorHubShell } from "@/components/creator-hub/CreatorHubShell";
import { ToolCard } from "@/components/creator-hub/ToolCard";

export const metadata: Metadata = {
  title: "Distribution Options — FlowSoundz Creator Hub",
};

const DISTRIBUTORS = [
  {
    name: "DistroKid",
    bestFor: "Fast, unlimited uploads with streaming + TikTok sync for a yearly fee",
    href: "https://distrokid.com",
    tag: "Popular",
    tagColor: "#00e5ff",
    notes: "Great for high-volume indie artists. Keeps most royalties.",
  },
  {
    name: "TuneCore",
    bestFor: "Per-release pricing with full royalty collection and publishing admin",
    href: "https://www.tunecore.com",
    tag: "Publishing",
    tagColor: "#7c4dff",
    notes: "Strong publishing administration services included.",
  },
  {
    name: "CD Baby",
    bestFor: "Physical + digital distribution with one-time fee per release",
    href: "https://cdbaby.com",
    tag: "Physical",
    tagColor: "#ff2da6",
    notes: "Good for artists who also want physical CD/vinyl distribution.",
  },
  {
    name: "UnitedMasters",
    bestFor: "Independent artists who want brand sync deals and playlist placement",
    href: "https://unitedmasters.com",
    tag: "Sync",
    tagColor: "#00e5ff",
    notes: "Strong brand partnerships and Select membership options.",
  },
  {
    name: "LANDR",
    bestFor: "All-in-one: AI mastering + distribution + sample packs",
    href: "https://www.landr.com",
    tag: "AI",
    tagColor: "#7c4dff",
    notes: "Useful if you also need mastering before distribution.",
  },
  {
    name: "Too Lost",
    bestFor: "Label-style distribution for high-volume independent labels and collectives",
    href: "https://toolost.com",
    tag: "Label",
    tagColor: "#ff2da6",
    notes: "Designed for imprints and collectives managing multiple artists.",
  },
  {
    name: "SoundCloud for Artists",
    bestFor: "Direct fan engagement with built-in monetization and discovery",
    href: "https://artists.soundcloud.com",
    tag: "Free Tier",
    tagColor: "#00e5ff",
    notes: "Great for early-stage artists building an audience.",
  },
];

const PRE_DISTRO_CHECKLIST = [
  "Final WAV or high-quality audio file (16-bit/44.1kHz minimum)",
  "Cover art — 3000×3000px, JPG or PNG, no blurry or misaligned text",
  "Artist name (exactly as it should appear on stores)",
  "Song title and any featured artist names",
  "Explicit or Clean version decision",
  "Songwriter and producer credits",
  "Release date (usually 1–3 weeks ahead for store review)",
  "Lyrics (optional but recommended for platform sync)",
  "Ownership confirmation — you own or control the recording",
];

export default function DistributionPage() {
  return (
    <CreatorHubShell eyebrow="Creator Hub" title="Distribution Options">
      {/* ── Intro ── */}
      <div className="mb-10 glass-card rounded-[1.8rem] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
          Step 2
        </p>
        <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">
          Where Should Your Music Live?
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
          FlowSoundz Radio helps with discovery and promotion. To release your music on Spotify,
          Apple Music, Tidal, and other major platforms, you will also need a music distributor.
          Below are the most popular options — compare and choose what fits your release strategy.
        </p>
        <p className="mt-3 text-xs text-slate-400">
          FlowSoundz does not replace DistroKid, TuneCore, CD Baby, or any other distribution
          service. We point you to them and help you get radio-ready before you submit.
        </p>
      </div>

      {/* ── Distributors ── */}
      <div className="mb-12">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
          Distribution Partners
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DISTRIBUTORS.map((d) => (
            <ToolCard
              key={d.name}
              name={d.name}
              bestFor={d.bestFor}
              href={d.href}
              tag={d.tag}
              tagColor={d.tagColor}
              notes={d.notes}
            />
          ))}
        </div>
      </div>

      {/* ── Checklist ── */}
      <div className="mb-10">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
          Before You Distribute
        </p>
        <div className="glass-card rounded-[1.8rem] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white">
            Release Prep Checklist
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Make sure you have these ready before submitting to any distributor.
          </p>
          <ul className="mt-5 space-y-3">
            {PRE_DISTRO_CHECKLIST.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#00e5ff]/30 bg-[#00e5ff]/10 text-[10px] text-[#00e5ff]">
                  ✓
                </span>
                <span className="text-sm leading-6 text-slate-300">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Warning ── */}
      <div className="mb-10 rounded-[1.6rem] border border-[#ff2da6]/20 bg-[#ff2da6]/8 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ff2da6]/80">
          Important — Rights Warning
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Do not distribute music that uses uncleared samples, unauthorized vocals, stolen beats,
          or AI-generated voices that imitate real artists without permission. Distributors can and
          do remove releases that violate copyright. Repeat violations can get your account banned.
        </p>
        <Link
          href="/artist/rights"
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#ff2da6] transition hover:opacity-80"
        >
          Review the rights checklist →
        </Link>
      </div>

      {/* ── Next step ── */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/artist/rights"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_22px_rgba(0,229,255,0.24)] transition"
        >
          Continue: Rights Checklist →
        </Link>
        <Link
          href="/artist/submit"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/5"
        >
          Skip to Submission
        </Link>
      </div>
    </CreatorHubShell>
  );
}
