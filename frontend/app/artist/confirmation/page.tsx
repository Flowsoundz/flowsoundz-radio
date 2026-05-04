"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import type { ArtistPromoOutput } from "@/lib/creatorHub/generators";

type StoredSubmission = {
  form: Record<string, unknown>;
  promo: ArtistPromoOutput;
  submittedAt: string;
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        });
      }}
      className="inline-flex min-h-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] px-4 py-1.5 text-xs font-semibold text-white transition hover:border-white/22 hover:bg-white/10"
    >
      {copied ? "✓ Copied" : `Copy ${label}`}
    </button>
  );
}

type EditableCardProps = {
  label: string;
  accent: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
  copyLabel: string;
};

function EditableCard({
  label,
  accent,
  value,
  onChange,
  rows = 4,
  hint,
  copyLabel,
}: EditableCardProps) {
  return (
    <div
      className="glass-card rounded-[1.8rem] p-5 sm:p-6"
      style={{ borderColor: `${accent}25` }}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: accent }}
        >
          {label}
        </p>
        <CopyButton text={value} label={copyLabel} />
      </div>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[0.9rem] border border-white/6 bg-white/[0.04] px-4 py-3 text-sm leading-7 text-slate-200 outline-none transition focus:border-[#00E5FF]/30 resize-none"
      />
      {hint ? (
        <p className="mt-2 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export default function ConfirmationPage() {
  const [submission, setSubmission] = useState<StoredSubmission | null>(null);
  const [promo, setPromo] = useState<ArtistPromoOutput | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("fsz-hub-submission");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as StoredSubmission;
        setSubmission(parsed);
        setPromo(parsed.promo);
      } catch {
        // ignore
      }
    }
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  if (!submission || !promo) {
    return (
      <AppShell eyebrow="Creator Hub" title="Submission Received">
        <div className="glass-card rounded-[1.8rem] p-8 text-center">
          <p className="text-sm text-slate-400">
            No submission found. Go back and complete the submission form.
          </p>
          <Link
            href="/artist/submit"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_22px_rgba(0,229,255,0.24)] transition"
          >
            Back to Submit
          </Link>
        </div>
      </AppShell>
    );
  }

  const artistName =
    typeof submission.form.artistName === "string"
      ? submission.form.artistName
      : "Artist";

  const songTitle =
    typeof submission.form.songTitle === "string"
      ? submission.form.songTitle
      : "Track";

  return (
    <AppShell eyebrow="Creator Hub" title="Submission Received">

      {/* ── Success banner ── */}
      <div className="relative mb-8 overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.08)_0%,rgba(0,229,255,0.06)_100%)] p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-0 h-32 w-32 rounded-full bg-emerald-400/8 blur-[60px]" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
          Submission received
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
          Here&apos;s your FlowSoundz promo preview.
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
          Your submission for{" "}
          <span className="font-semibold text-white">
            &ldquo;{songTitle}&rdquo;
          </span>{" "}
          by{" "}
          <span className="font-semibold text-white">{artistName}</span> has
          been received. Our team will review before it is added to FlowSoundz Radio.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#00e5ff]/20 bg-[#00e5ff]/8 px-4 py-1.5 text-xs font-semibold text-[#00e5ff]">
          ✦ AI promo assets generated below — edit freely
        </div>
      </div>

      {/* ── Vibe badge ── */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-400">Suggested vibe:</span>
        <span className="rounded-full border border-[#7c4dff]/40 bg-[#7c4dff]/15 px-4 py-1.5 text-sm font-bold text-[#7c4dff]">
          {promo.suggestedVibe}
        </span>
      </div>

      {/* ── Editable promo cards ── */}
      <div className="mb-10 grid gap-4">
        <EditableCard
          label="Artist Bio"
          accent="#00e5ff"
          value={promo.bio}
          onChange={(v) => setPromo((p) => p ? { ...p, bio: v } : p)}
          rows={5}
          hint="3-sentence bio for your artist profile and press releases."
          copyLabel="Bio"
        />
        <EditableCard
          label="Station Promo Blurb"
          accent="#7c4dff"
          value={promo.promoBlurb}
          onChange={(v) => setPromo((p) => p ? { ...p, promoBlurb: v } : p)}
          rows={3}
          hint="1–2 sentences used by FlowSoundz Radio to introduce your track."
          copyLabel="Promo Blurb"
        />
        <EditableCard
          label="Radio Intro Line"
          accent="#ff2da6"
          value={promo.radioIntro}
          onChange={(v) => setPromo((p) => p ? { ...p, radioIntro: v } : p)}
          rows={2}
          hint="The one-liner the DJ reads right before your track plays on air."
          copyLabel="Radio Intro"
        />
      </div>

      {/* ── Review message ── */}
      <div className="mb-8 rounded-[1.6rem] border border-white/8 bg-white/[0.025] px-6 py-5">
        <p className="text-sm leading-6 text-slate-400">
          <span className="font-semibold text-white">What happens next:</span>{" "}
          Our team will review your submission before it is added to FlowSoundz Radio rotation.
          This process is manual — approvals are not automatic or guaranteed.
          If approved, you will be contacted at the email you provided.
        </p>
      </div>

      {/* ── Actions ── */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/artist/dashboard"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_22px_rgba(0,229,255,0.24)] transition"
        >
          ← Back to Dashboard
        </Link>
        <Link
          href="/artist/submit"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/5"
        >
          Submit Another Track
        </Link>
        <Link
          href="/radio"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-6 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
        >
          Tune In Live
        </Link>
      </div>
    </AppShell>
  );
}
