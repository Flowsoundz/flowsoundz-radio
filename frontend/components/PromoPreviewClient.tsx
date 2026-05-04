"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { submitPromoSubmission } from "@/lib/api";
import {
  PROMO_PREVIEW_DRAFT_STORAGE_KEY,
  VIBE_TAG_OPTIONS,
  type PromoPreviewDraft,
  type VibeTag,
} from "@/lib/promoOnboarding";

type EditablePreviewState = {
  artist_bio: string;
  vibe_tag: VibeTag;
  promo_blurb: string;
};

function packageTierLabel(tier: PromoPreviewDraft["packageTier"]): string {
  switch (tier) {
    case "featured":
      return "Featured Consideration";
    case "sponsored":
      return "Sponsored Rotation";
    case "basic":
    default:
      return "Basic Submission";
  }
}

function formatAmountPaid(amountPaid: number): string {
  return `$${(amountPaid / 100).toFixed(2)}`;
}

export function PromoPreviewClient() {
  const router = useRouter();
  const [draft, setDraft] = useState<PromoPreviewDraft | null>(null);
  const [preview, setPreview] = useState<EditablePreviewState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submissionReference, setSubmissionReference] = useState("");

  useEffect(() => {
    let timer: number | null = null;

    try {
      const raw = window.sessionStorage.getItem(
        PROMO_PREVIEW_DRAFT_STORAGE_KEY,
      );

      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as PromoPreviewDraft;
      timer = window.setTimeout(() => {
        setDraft(parsed);
        setPreview(parsed.aiProfile);
      }, 0);
    } catch {
      timer = window.setTimeout(() => {
        setErrorMessage("We couldn't load your preview draft. Start again below.");
      }, 0);
    }

    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  const finalMessage = useMemo(() => {
    if (!draft || !preview) {
      return "";
    }

    const sections = [
      draft.form.message.trim(),
      `AI artist bio:\n${preview.artist_bio}`,
      `AI vibe tag: ${preview.vibe_tag}`,
      `AI promo blurb:\n${preview.promo_blurb}`,
    ].filter(Boolean);

    return sections.join("\n\n");
  }, [draft, preview]);

  function updatePreview<Key extends keyof EditablePreviewState>(
    field: Key,
    value: EditablePreviewState[Key],
  ) {
    setPreview((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current,
    );
  }

  async function handleFinalize() {
    if (!draft || !preview) {
      setErrorMessage("Your preview draft is missing. Return to the submission form.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await submitPromoSubmission({
        ...draft.form,
        vibe: preview.vibe_tag,
        message: finalMessage,
        package_tier: draft.packageTier,
        stripe_session_id: draft.stripeSessionId,
      });

      window.sessionStorage.removeItem(PROMO_PREVIEW_DRAFT_STORAGE_KEY);
      setSuccessMessage(response.message);
      setSubmissionReference(response.submission.submission_id);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to finalize the submission right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!draft || !preview) {
    return (
      <section className="glass-card rounded-[2rem] border border-white/8 bg-[#0B1020]/86 p-6 md:p-8">
        <h2 className="font-display text-2xl font-semibold text-[#F8FAFC]">
          No preview draft found
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#CBD5E1]">
          Start from the promo submission form so we can generate the artist bio,
          vibe tag, and radio blurb before finalizing.
        </p>
        <div className="mt-6">
          <Link
            href="/promo"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
          >
            Back to promo portal
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="glass-card rounded-[2rem] border border-white/8 bg-[#0B1020]/86 p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#CBD5E1]/60">
              AI preview
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC] md:text-3xl">
              Review artist onboarding copy
            </h2>
          </div>
          <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-medium text-[#CBD5E1]">
            {packageTierLabel(draft.packageTier)}
          </span>
        </div>

        <div className="mt-6 rounded-[1.4rem] border border-emerald-400/20 bg-emerald-400/10 px-4 py-4 text-sm text-emerald-50">
          <p className="font-semibold">
            {draft.form.artist_name} · {draft.form.song_title}
          </p>
          <p className="mt-2 text-emerald-100/85">
            {formatAmountPaid(draft.amountPaid)} paid · edit the AI copy before saving
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#F8FAFC]">Artist bio</span>
            <textarea
              rows={6}
              value={preview.artist_bio}
              onChange={(event) =>
                updatePreview("artist_bio", event.target.value)
              }
              className="rounded-[1rem] border border-white/8 bg-[#111827] px-4 py-3 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/45 focus:border-[#00E5FF]/35"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#F8FAFC]">Vibe tag</span>
            <select
              value={preview.vibe_tag}
              onChange={(event) =>
                updatePreview("vibe_tag", event.target.value as VibeTag)
              }
              className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-[#F8FAFC] outline-none transition focus:border-[#00E5FF]/35"
            >
              {VIBE_TAG_OPTIONS.map((vibeTag) => (
                <option key={vibeTag} value={vibeTag}>
                  {vibeTag}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#F8FAFC]">Promo blurb</span>
            <textarea
              rows={4}
              value={preview.promo_blurb}
              onChange={(event) =>
                updatePreview("promo_blurb", event.target.value)
              }
              className="rounded-[1rem] border border-white/8 bg-[#111827] px-4 py-3 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/45 focus:border-[#00E5FF]/35"
            />
          </label>

          {successMessage ? (
            <div className="rounded-[1.2rem] border border-[#00E5FF]/18 bg-[#00E5FF]/10 px-4 py-3 text-sm text-[#F8FAFC]">
              <p>{successMessage}</p>
              {submissionReference ? (
                <p className="mt-2 text-[#CBD5E1]">Reference: {submissionReference}</p>
              ) : null}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-[1.2rem] border border-[#FF2DA6]/18 bg-[#FF2DA6]/10 px-4 py-3 text-sm text-[#F8FAFC]">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => router.push(`/promo/success?session_id=${encodeURIComponent(draft.stripeSessionId)}`)}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
            >
              Back to form
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void handleFinalize()}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-cyan-100/70 bg-[linear-gradient(135deg,#67E8F9_0%,#22D3EE_45%,#06B6D4_100%)] px-6 text-sm font-bold text-slate-950 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_12px_30px_rgba(34,211,238,0.35)] transition hover:-translate-y-0.5 disabled:border-white/8 disabled:bg-white/10 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0"
            >
              {isSubmitting ? "Finalizing..." : "Finalize Submission"}
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-[2rem] border border-white/8 bg-[#0B1020]/72 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#CBD5E1]/55">
          Submission payload
        </p>
        <div className="mt-5 space-y-3 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4 text-sm text-[#CBD5E1]">
          <p>
            <span className="font-semibold text-white">Artist:</span>{" "}
            {draft.form.artist_name}
          </p>
          <p>
            <span className="font-semibold text-white">Track:</span>{" "}
            {draft.form.song_title}
          </p>
          <p>
            <span className="font-semibold text-white">Email:</span>{" "}
            {draft.form.email}
          </p>
          <p>
            <span className="font-semibold text-white">Original notes:</span>{" "}
            {draft.form.message || "None provided"}
          </p>
        </div>
      </div>
    </section>
  );
}
