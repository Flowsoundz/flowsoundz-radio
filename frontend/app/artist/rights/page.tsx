"use client";

import { useState } from "react";
import Link from "next/link";
import { CreatorHubShell } from "@/components/creator-hub/CreatorHubShell";

type CheckItem = {
  id: string;
  label: string;
};

const OWNERSHIP_CHECKS: CheckItem[] = [
  { id: "own_lyrics", label: "I wrote the lyrics (or I have a license to use them)" },
  { id: "own_beat", label: "I made or licensed the beat/instrumental" },
  { id: "have_producer_permission", label: "I have permission from all producers involved" },
  { id: "have_feature_permission", label: "I have permission from all featured artists" },
  { id: "no_uncleared_samples", label: "I did not use uncleared samples" },
  { id: "no_unauthorized_vocals", label: "I did not use unauthorized vocals from other artists" },
  {
    id: "ai_commercial_terms",
    label:
      "If AI tools were used, I reviewed and followed the commercial-use terms of those tools",
  },
];

const SUBMISSION_CHECKS: CheckItem[] = [
  {
    id: "own_recording",
    label: "I own or control the submitted sound recording",
  },
  {
    id: "own_composition",
    label:
      "I own or control the lyrics/composition, or I have written permission from the rights holders",
  },
  {
    id: "all_permission",
    label: "I have permission from all producers, co-writers, and featured artists",
  },
  {
    id: "disclose_ai",
    label: "I have disclosed any AI-generated content in my submission",
  },
  {
    id: "grant_fsr",
    label:
      "I grant FlowSoundz Radio permission to review, stream, display, and promote the submitted materials if approved",
  },
];

const RIGHTS_SECTIONS = [
  {
    id: "publishing",
    title: "Publishing / Songwriter Royalties",
    accent: "#00e5ff",
    body: "Organizations like ASCAP, BMI, SESAC, and GMR are Performing Rights Organizations (PROs). They collect public performance royalties for the composition and songwriting side of your music — when your song is played on radio, TV, streaming, or live. If you are actively releasing music, registering with a PRO is one of the first steps toward collecting what you are owed.",
    links: [
      { label: "ASCAP", href: "https://www.ascap.com" },
      { label: "BMI", href: "https://www.bmi.com" },
      { label: "SESAC", href: "https://www.sesac.com" },
    ],
  },
  {
    id: "sound_recording",
    title: "Sound Recording Royalties",
    accent: "#7c4dff",
    body: "SoundExchange collects digital performance royalties for sound recordings — specifically for non-interactive digital radio-style streaming (like internet radio, Pandora, and similar services). If you own your master recording and your music is being played on those platforms, registering with SoundExchange ensures you collect those royalties.",
    links: [
      { label: "SoundExchange", href: "https://www.soundexchange.com" },
    ],
  },
  {
    id: "mechanical",
    title: "Mechanical / Publishing Administration",
    accent: "#ff2da6",
    body: "Mechanical royalties are generated when your composition is reproduced (streams, downloads, physical copies). The Mechanical Licensing Collective (The MLC) handles mechanical royalty collection in the US for on-demand streaming. Publishing administrators like Songtrust can register your songs internationally and collect royalties across multiple territories.",
    links: [
      { label: "The MLC", href: "https://themlc.com" },
      { label: "Songtrust", href: "https://songtrust.com" },
    ],
  },
];

export default function RightsPage() {
  const [ownershipChecks, setOwnershipChecks] = useState<
    Record<string, boolean>
  >({});
  const [submissionChecks, setSubmissionChecks] = useState<
    Record<string, boolean>
  >({});

  const ownershipDone = OWNERSHIP_CHECKS.every((c) => ownershipChecks[c.id]);
  const submissionDone = SUBMISSION_CHECKS.every((c) => submissionChecks[c.id]);
  const allDone = ownershipDone && submissionDone;

  return (
    <CreatorHubShell eyebrow="Creator Hub" title="Rights & Licensing">
      {/* ── Disclaimer ── */}
      <div className="mb-8 rounded-[1.6rem] border border-[#7c4dff]/25 bg-[#7c4dff]/8 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7c4dff]/90">
          Not Legal Advice
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          FlowSoundz can help organize your release information, but nothing on this page is legal
          advice. For serious releases, publishing deals, licensing, or disputes — speak with a
          music attorney or rights professional.
        </p>
      </div>

      {/* ── Ownership Checklist ── */}
      <div className="mb-10">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
          Step 3 — Who Owns the Song?
        </p>
        <div className="glass-card rounded-[1.8rem] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white">Ownership Checklist</h2>
          <p className="mt-2 text-sm text-slate-400">
            Check each item you can confirm. You should be able to check all of these before
            distributing or submitting.
          </p>
          <ul className="mt-5 space-y-3">
            {OWNERSHIP_CHECKS.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={ownershipChecks[item.id] ?? false}
                    onChange={(e) =>
                      setOwnershipChecks((prev) => ({
                        ...prev,
                        [item.id]: e.target.checked,
                      }))
                    }
                    className="mt-0.5 h-4.5 w-4.5 shrink-0 cursor-pointer accent-[#00e5ff]"
                  />
                  <span className="text-sm leading-6 text-slate-300">
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {ownershipDone && (
            <p className="mt-4 text-sm font-semibold text-[#00e5ff]">
              ✓ Ownership confirmed — you are good to move forward.
            </p>
          )}
        </div>
      </div>

      {/* ── Rights Education ── */}
      <div className="mb-10">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
          Understanding Your Rights
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {RIGHTS_SECTIONS.map((section) => (
            <div
              key={section.id}
              className="glass-card rounded-[1.6rem] p-5"
              style={{ borderColor: `${section.accent}20` }}
            >
              <h3
                className="text-sm font-semibold"
                style={{ color: section.accent }}
              >
                {section.title}
              </h3>
              <p className="mt-3 text-xs leading-5 text-slate-400">
                {section.body}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {section.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/70 transition hover:border-white/20 hover:text-white"
                  >
                    {link.label} ↗
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FlowSoundz Submission Confirmation ── */}
      <div className="mb-10">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
          FlowSoundz Submission Confirmation
        </p>
        <div
          className="glass-card rounded-[1.8rem] p-6 sm:p-8"
          style={{ borderColor: submissionDone ? "#00e5ff30" : undefined }}
        >
          <h2 className="text-xl font-semibold text-white">
            Confirm Before Submitting
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            These confirmations are required when you submit your track to FlowSoundz Radio.
            Review them now so you are prepared.
          </p>
          <ul className="mt-5 space-y-3">
            {SUBMISSION_CHECKS.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={submissionChecks[item.id] ?? false}
                    onChange={(e) =>
                      setSubmissionChecks((prev) => ({
                        ...prev,
                        [item.id]: e.target.checked,
                      }))
                    }
                    className="mt-0.5 h-4.5 w-4.5 shrink-0 cursor-pointer accent-[#00e5ff]"
                  />
                  <span className="text-sm leading-6 text-slate-300">
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {submissionDone && (
            <p className="mt-4 text-sm font-semibold text-[#00e5ff]">
              ✓ All submission confirmations checked.
            </p>
          )}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/artist/video"
          className={`inline-flex min-h-11 items-center justify-center rounded-full px-6 py-2.5 text-sm font-bold text-white transition ${
            allDone
              ? "bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] shadow-[0_0_22px_rgba(0,229,255,0.24)]"
              : "border border-white/15 hover:bg-white/5"
          }`}
        >
          Continue: Create Visuals →
        </Link>
        <Link
          href="/artist/submit"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-6 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
        >
          Skip to Submission
        </Link>
      </div>
    </CreatorHubShell>
  );
}
