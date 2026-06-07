import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "For Artists — FlowSoundz Radio",
  description:
    "Your song deserves more than a link. Submit for free or choose a paid promo lane — FlowSoundz turns unknown songs into curated discovery moments.",
};

const FREE_INCLUDES = [
  "Manual review by the FlowSoundz curation team",
  "Submit your track link, release date, and genre — takes under 3 minutes",
  "If approved: rotation on FlowSoundz Radio + artist discovery listing",
  "We reply to your email with next steps",
];

const PAID_INCLUDES = [
  "Everything in free submission",
  "Priority queue — reviewed within 48–72 hours",
  "Direct feedback on your submission",
  "Higher tiers open the door for featured placement and boosted rotation",
];

const TRUTH_ITEMS = [
  {
    q: "Is approval guaranteed?",
    a: "No. Every submission is reviewed against clear curation standards — energy, fit, audio quality, rights clearance. Not every track will make it. You can always resubmit with a stronger release.",
  },
  {
    q: "What does 'featured placement' mean exactly?",
    a: "Featured tiers open the door for consideration — boosted rotation, artist card on the station, early-window exposure to members. It is still subject to curation review. We do not sell guaranteed plays.",
  },
  {
    q: "Can AI-assisted or virtual artists submit?",
    a: "Yes. All AI use must be disclosed on the submission form. AI-generated promo assets are clearly labeled as suggestions and require your review before use.",
  },
  {
    q: "What rights do I grant FlowSoundz?",
    a: "You grant FlowSoundz Radio permission to stream, display, and promote your submitted track on the platform and social channels. You retain all rights to your music. You can request removal at any time.",
  },
];

export default function ForArtistsPage() {
  return (
    <AppShell eyebrow="For Artists" title="Your Song Deserves More Than a Link.">

      {/* ── Positioning strip ── */}
      <div className="mb-10 grid gap-3 sm:grid-cols-3">
        {[
          { accent: "#00e5ff", text: "FlowSoundz turns unknown songs into curated discovery moments." },
          { accent: "#7c4dff", text: "SoundCloud hosts the underground. FlowSoundz introduces it." },
          { accent: "#ff2da6", text: "Listeners tune in looking for what's next — your track is the answer." },
        ].map((item) => (
          <div
            key={item.text}
            className="glass-card rounded-[1.4rem] px-5 py-4"
            style={{ borderColor: `${item.accent}22` }}
          >
            <p className="text-sm leading-6 text-slate-300"
              style={{ borderLeft: `2px solid ${item.accent}`, paddingLeft: "12px" }}>
              {item.text}
            </p>
          </div>
        ))}
      </div>

      {/* ── Two paths ── */}
      <div className="mb-10 grid gap-5 lg:grid-cols-2">

        {/* Free path */}
        <div className="flex flex-col rounded-[2rem] border border-emerald-400/20 bg-[linear-gradient(145deg,rgba(16,185,129,0.05),rgba(0,229,255,0.04))] p-7">
          <div className="mb-5">
            <span className="inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Free
            </span>
            <h2 className="mt-4 text-2xl font-semibold text-white">Submit for Review</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              No payment required. Fill out the submission form and let our curation team decide.
            </p>
          </div>

          <ul className="mb-8 flex-1 space-y-3">
            {FREE_INCLUDES.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                <span className="mt-0.5 shrink-0 text-emerald-400">✓</span>
                {item}
              </li>
            ))}
          </ul>

          <div className="space-y-3">
            <Link
              href="/artist/release-submit"
              className="inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff,#7c4dff)] py-3 text-sm font-bold text-white shadow-[0_0_22px_rgba(0,229,255,0.25)] transition hover:shadow-[0_0_36px_rgba(0,229,255,0.45)]"
            >
              Submit a Track — Free
            </Link>
            <Link
              href="/artist/dashboard"
              className="inline-flex w-full items-center justify-center rounded-full border border-white/12 py-2.5 text-xs font-semibold text-white/60 transition hover:border-white/22 hover:text-white"
            >
              Full Creator Hub (AI promo assets)
            </Link>
          </div>
        </div>

        {/* Paid path */}
        <div className="flex flex-col rounded-[2rem] border border-[#7c4dff]/22 bg-[linear-gradient(145deg,rgba(124,77,255,0.07),rgba(255,45,166,0.04))] p-7">
          <div className="mb-5">
            <span className="inline-flex items-center rounded-full border border-[#7c4dff]/30 bg-[#7c4dff]/[0.10] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a78bfa]">
              Paid Promo Lane
            </span>
            <h2 className="mt-4 text-2xl font-semibold text-white">Priority + Featured Consideration</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Skip the queue, get direct feedback, and open the door for featured placement. From $15.
            </p>
          </div>

          <ul className="mb-8 flex-1 space-y-3">
            {PAID_INCLUDES.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                <span className="mt-0.5 shrink-0 text-[#a78bfa]">✓</span>
                {item}
              </li>
            ))}
          </ul>

          <div className="space-y-3">
            <Link
              href="/promo"
              className="inline-flex w-full items-center justify-center rounded-full border border-[#7c4dff]/40 bg-[#7c4dff]/15 py-3 text-sm font-bold text-[#c4b5fd] transition hover:bg-[#7c4dff]/22 hover:text-white"
            >
              See Promo Packages
            </Link>
            <p className="text-center text-[11px] text-white/30">
              Approval is not guaranteed on any tier. Curation standards still apply.
            </p>
          </div>
        </div>
      </div>

      {/* ── Honest Q&A ── */}
      <div className="mb-10">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
          Straight answers
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {TRUTH_ITEMS.map((item) => (
            <div key={item.q} className="glass-card rounded-[1.5rem] p-5">
              <p className="text-sm font-semibold text-white">{item.q}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div
        className="rounded-[1.9rem] p-px"
        style={{ background: "linear-gradient(135deg, #00e5ff 0%, #7c4dff 100%)" }}
      >
        <div className="flex flex-col items-center gap-5 rounded-[calc(1.9rem-1px)] bg-[#07111f] px-8 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-300/80">
              Ready to submit?
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              Start with the free form. It takes 3 minutes.
            </h2>
            <p className="mt-1.5 text-sm text-slate-300">
              No payment. No account. Just your track and the FlowSoundz team.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-center gap-3 sm:justify-end">
            <Link
              href="/artist/release-submit"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(0,229,255,0.35)] transition hover:shadow-[0_0_28px_rgba(0,229,255,0.55)]"
            >
              Submit for Free
            </Link>
            <Link
              href="/promo"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/5"
            >
              Paid Promo Lane
            </Link>
          </div>
        </div>
      </div>

    </AppShell>
  );
}
