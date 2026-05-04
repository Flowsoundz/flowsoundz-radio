"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateAiOnboarding } from "@/lib/api";
import {
  PROMO_PREVIEW_DRAFT_STORAGE_KEY,
  type PromoPreviewDraft,
} from "@/lib/promoOnboarding";
import type { PromoTier } from "@/lib/stripe";

type PromoSubmissionFormProps = {
  amountPaid: number;
  packageTier: PromoTier;
  stripeSessionId: string;
};

const INITIAL_FORM = {
  artist_name: "",
  song_title: "",
  email: "",
  vibe: "",
  message: "",
};

function packageTierLabel(tier: PromoTier): string {
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

export function PromoSubmissionForm({
  amountPaid,
  packageTier,
  stripeSessionId,
}: PromoSubmissionFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function updateField(field: keyof typeof INITIAL_FORM, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const aiProfile = await generateAiOnboarding({
        trackTitle: form.song_title,
        artistName: form.artist_name,
        genre: form.vibe,
        description: form.message,
      });

      const draft: PromoPreviewDraft = {
        amountPaid,
        packageTier,
        stripeSessionId,
        form,
        aiProfile,
      };

      window.sessionStorage.setItem(
        PROMO_PREVIEW_DRAFT_STORAGE_KEY,
        JSON.stringify(draft),
      );
      router.push("/promo/preview");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit right now. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="glass-card rounded-[2rem] border border-white/8 bg-[#0B1020]/86 p-6 md:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#CBD5E1]/60">
              Submission
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC] md:text-3xl">
              Artist intake form
            </h2>
          </div>
          <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-medium text-[#CBD5E1]">
            {packageTierLabel(packageTier)}
          </span>
        </div>

        <div className="mt-6 rounded-[1.4rem] border border-emerald-400/20 bg-emerald-400/10 px-4 py-4 text-sm text-emerald-50">
          <p className="font-semibold">Payment confirmed — complete your submission below.</p>
          <p className="mt-2 text-emerald-100/85">
            {packageTierLabel(packageTier)} · {formatAmountPaid(amountPaid)} paid
          </p>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[#F8FAFC]">
                Artist name
              </span>
              <input
                type="text"
                value={form.artist_name}
                onChange={(event) => updateField("artist_name", event.target.value)}
                placeholder="Your artist or group name"
                className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/45 focus:border-[#00E5FF]/35"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[#F8FAFC]">
                Song title
              </span>
              <input
                type="text"
                value={form.song_title}
                onChange={(event) => updateField("song_title", event.target.value)}
                placeholder="Track name"
                className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/45 focus:border-[#00E5FF]/35"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[#F8FAFC]">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="artist@email.com"
                className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/45 focus:border-[#00E5FF]/35"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[#F8FAFC]">
                Vibe / genre
              </span>
              <input
                type="text"
                value={form.vibe}
                onChange={(event) => updateField("vibe", event.target.value)}
                placeholder="late night, emotional, alt-R&B..."
                className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/45 focus:border-[#00E5FF]/35"
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#F8FAFC]">Message</span>
            <textarea
              rows={5}
              value={form.message}
              onChange={(event) => updateField("message", event.target.value)}
              placeholder="Tell us about the release, rollout plans, reference vibe, and what placement you want to be considered for."
              className="rounded-[1rem] border border-white/8 bg-[#111827] px-4 py-3 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/45 focus:border-[#00E5FF]/35"
            />
          </label>

          <div className="rounded-[1.3rem] border border-dashed border-white/12 bg-[linear-gradient(135deg,rgba(0,229,255,0.08),rgba(139,92,246,0.08),rgba(255,45,166,0.05))] p-5">
            <p className="text-sm font-medium text-[#F8FAFC]">Upload placeholder</p>
            <p className="mt-2 text-sm leading-6 text-[#CBD5E1]">
              Audio upload and campaign assets are coming next. For now, complete
              your release details and the FlowSoundz team reviews each submission
              manually.
            </p>
          </div>

          {errorMessage ? (
            <div className="rounded-[1.2rem] border border-[#FF2DA6]/18 bg-[#FF2DA6]/10 px-4 py-3 text-sm text-[#F8FAFC]">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#CBD5E1]">
              Your card is charged only once. Submissions are reviewed within 72 hours.
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-cyan-100/70 bg-[linear-gradient(135deg,#67E8F9_0%,#22D3EE_45%,#06B6D4_100%)] px-6 text-sm font-bold text-slate-950 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_12px_30px_rgba(34,211,238,0.35)] transition hover:-translate-y-0.5 disabled:border-white/8 disabled:bg-white/10 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0"
            >
              {isSubmitting ? "Generating preview..." : "Continue to preview"}
            </button>
          </div>
        </form>
      </div>

      <div className="glass-card rounded-[2rem] border border-white/8 bg-[#0B1020]/72 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#CBD5E1]/55">
          What happens next
        </p>
        <div className="mt-5 space-y-3">
          {[
            "Payment confirmed and lane reserved.",
            "Complete the submission form with release details.",
            "FlowSoundz reviews and follows up by email within 72 hours.",
          ].map((item, index) => (
            <div
              key={item}
              className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-[#CBD5E1]"
            >
              <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/8 bg-white/6 text-xs font-semibold text-[#F8FAFC]">
                {index + 1}
              </span>
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
