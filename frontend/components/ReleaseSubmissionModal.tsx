"use client";

import { useEffect, useMemo, useState } from "react";
import { submitReleaseSubmission } from "@/lib/api";

type ReleaseSubmissionModalProps = {
  open: boolean;
  onClose: () => void;
};

type ReleaseFormState = {
  artistName: string;
  trackTitle: string;
  genre: string;
  description: string;
  releaseDate: string;
  email: string;
  notes: string;
  audioFile: File | null;
  coverArt: File | null;
};

type AiProfile = {
  bio: string;
  vibe: "Chill" | "Hype" | "Late Night" | "Emotional";
  promoBlurb: string;
};

const VIBE_OPTIONS: AiProfile["vibe"][] = [
  "Chill",
  "Hype",
  "Late Night",
  "Emotional",
];

const INITIAL_FORM: ReleaseFormState = {
  artistName: "",
  trackTitle: "",
  genre: "",
  description: "",
  releaseDate: "",
  email: "",
  notes: "",
  audioFile: null,
  coverArt: null,
};

export function ReleaseSubmissionModal({
  open,
  onClose,
}: ReleaseSubmissionModalProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ReleaseFormState>(INITIAL_FORM);
  const [aiProfile, setAiProfile] = useState<AiProfile | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReference, setSuccessReference] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  // Reset when modal re-opens (render-time update, no extra effect needed)
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setStep(1);
      setForm(INITIAL_FORM);
      setAiProfile(null);
      setErrorMessage("");
      setSuccessReference("");
    }
  }

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const stepTitle = useMemo(() => {
    switch (step) {
      case 1:
        return "Release details";
      case 2:
        return "Upload assets";
      case 3:
        return "Contact + notes";
      case 4:
        return "AI artist profile";
      default:
        return "Submission sent";
    }
  }, [step]);

  function updateField<Key extends keyof ReleaseFormState>(
    field: Key,
    value: ReleaseFormState[Key],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateAiProfile<Key extends keyof AiProfile>(
    field: Key,
    value: AiProfile[Key],
  ) {
    setAiProfile((current) => (current ? { ...current, [field]: value } : current));
  }

  function validateCurrentStep(): boolean {
    if (step === 1) {
      if (
        !form.artistName.trim() ||
        !form.trackTitle.trim() ||
        !form.genre.trim() ||
        !form.releaseDate
      ) {
        setErrorMessage(
          "Fill in artist name, track title, genre, and release date before continuing.",
        );
        return false;
      }
    }

    if (step === 2) {
      if (!form.audioFile || !form.coverArt) {
        setErrorMessage("Upload both an audio file and cover art.");
        return false;
      }
    }

    if (step === 3 && !form.email.trim()) {
      setErrorMessage("Add a contact email before continuing.");
      return false;
    }

    setErrorMessage("");
    return true;
  }

  async function generateAiProfile() {
    setIsGenerating(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/ai-onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistName: form.artistName,
          trackTitle: form.trackTitle,
          genre: form.genre,
          description: form.description,
        }),
      });

      const data = (await res.json()) as AiProfile & { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "AI generation failed.");
      }

      setAiProfile(data);
      setStep(4);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to generate AI profile.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function goNext() {
    if (!validateCurrentStep()) return;

    if (step === 3) {
      await generateAiProfile();
      return;
    }

    setStep((current) => current + 1);
  }

  function goBack() {
    setErrorMessage("");
    if (step === 4) {
      setStep(3);
    } else {
      setStep((current) => Math.max(1, current - 1));
    }
  }

  async function handleSubmit() {
    if (!aiProfile) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = new FormData();
      payload.set("artist_name", form.artistName);
      payload.set("track_title", form.trackTitle);
      payload.set("genre", form.genre);
      payload.set("description", form.description);
      payload.set("release_date", form.releaseDate);
      payload.set("email", form.email);
      payload.set("notes", form.notes);
      payload.set("ai_bio", aiProfile.bio);
      payload.set("ai_vibe", aiProfile.vibe);
      payload.set("ai_promo_blurb", aiProfile.promoBlurb);

      if (form.audioFile) payload.set("audio_file", form.audioFile);
      if (form.coverArt) payload.set("cover_art", form.coverArt);

      const response = await submitReleaseSubmission(payload);
      setSuccessReference(response.submission.submission_id);
      setStep(5);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit your release right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!open) return null;

  const isSuccess = step === 5;
  const progressStep = Math.min(step, 4);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Submit your release"
    >
      <div className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0B1020] shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute -left-10 top-8 h-36 w-36 rounded-full bg-[#00E5FF]/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-10 h-40 w-40 rounded-full bg-[#8B5CF6]/14 blur-3xl" />

        <div className="relative p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/70">
                Submit your release
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-white md:text-3xl">
                {stepTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-white/20 hover:text-white"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Progress bar — 4 steps */}
          {!isSuccess ? (
            <div className="mt-6 flex items-center gap-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    item <= progressStep
                      ? "bg-[linear-gradient(90deg,#00e5ff_0%,#7c4dff_100%)]"
                      : "bg-white/10"
                  }`}
                />
              ))}
            </div>
          ) : null}

          {/* Step content */}
          <div className="mt-6">
            {/* ── Step 1: Release details ── */}
            {step === 1 ? (
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-white">
                      Artist name
                    </span>
                    <input
                      type="text"
                      value={form.artistName}
                      onChange={(e) =>
                        updateField("artistName", e.target.value)
                      }
                      className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#00E5FF]/35"
                      placeholder="Your artist or group name"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-white">
                      Track title
                    </span>
                    <input
                      type="text"
                      value={form.trackTitle}
                      onChange={(e) =>
                        updateField("trackTitle", e.target.value)
                      }
                      className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#00E5FF]/35"
                      placeholder="Track name"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-white">
                      Genre
                    </span>
                    <input
                      type="text"
                      value={form.genre}
                      onChange={(e) => updateField("genre", e.target.value)}
                      className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#00E5FF]/35"
                      placeholder="Afrobeats, alt-R&B, late night..."
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-white">
                      Release date
                    </span>
                    <input
                      type="date"
                      value={form.releaseDate}
                      onChange={(e) =>
                        updateField("releaseDate", e.target.value)
                      }
                      className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-white outline-none transition focus:border-[#00E5FF]/35"
                    />
                  </label>
                </div>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-white">
                    Track description{" "}
                    <span className="font-normal text-white/40">
                      (optional — used to generate your AI profile)
                    </span>
                  </span>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      updateField("description", e.target.value)
                    }
                    className="rounded-[1rem] border border-white/8 bg-[#111827] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#00E5FF]/35"
                    placeholder="What's the vibe, the story, the feeling behind this track? The more you share, the better your AI profile."
                  />
                </label>
              </div>
            ) : null}

            {/* ── Step 2: Upload assets ── */}
            {step === 2 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 rounded-[1.4rem] border border-dashed border-white/12 bg-white/[0.03] p-4">
                  <span className="text-sm font-medium text-white">
                    Audio file
                  </span>
                  <input
                    type="file"
                    accept=".mp3,.wav,audio/mpeg,audio/wav"
                    onChange={(e) =>
                      updateField("audioFile", e.target.files?.[0] ?? null)
                    }
                    className="text-sm text-white/70 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                  <p className="text-xs text-white/45">MP3 or WAV</p>
                  {form.audioFile ? (
                    <p className="text-sm text-cyan-200">
                      {form.audioFile.name}
                    </p>
                  ) : null}
                </label>
                <label className="grid gap-2 rounded-[1.4rem] border border-dashed border-white/12 bg-white/[0.03] p-4">
                  <span className="text-sm font-medium text-white">
                    Cover art
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) =>
                      updateField("coverArt", e.target.files?.[0] ?? null)
                    }
                    className="text-sm text-white/70 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                  <p className="text-xs text-white/45">PNG, JPG, or WEBP</p>
                  {form.coverArt ? (
                    <p className="text-sm text-cyan-200">
                      {form.coverArt.name}
                    </p>
                  ) : null}
                </label>
              </div>
            ) : null}

            {/* ── Step 3: Contact + notes ── */}
            {step === 3 ? (
              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-white">
                    Contact email
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#00E5FF]/35"
                    placeholder="artist@email.com"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-white">
                    Internal notes{" "}
                    <span className="font-normal text-white/40">(optional)</span>
                  </span>
                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    className="rounded-[1rem] border border-white/8 bg-[#111827] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#00E5FF]/35"
                    placeholder="Rollout plans, collaborators, references, or anything the FlowSoundz team should know."
                  />
                </label>
                <p className="flex items-center gap-2 text-xs text-white/40">
                  <span className="inline-block h-4 w-4 rounded-full bg-violet-500/25 text-center text-[10px] leading-4 text-violet-300">
                    ✦
                  </span>
                  Continuing will generate your AI artist profile with Claude.
                </p>
              </div>
            ) : null}

            {/* ── Step 4: AI profile review ── */}
            {step === 4 && aiProfile ? (
              <div className="grid gap-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300">
                    ✦ AI generated
                  </span>
                  <span className="text-xs text-white/45">
                    Review and edit freely before finalizing.
                  </span>
                </div>

                {/* Bio */}
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-white">
                    Artist bio
                  </span>
                  <span className="text-xs text-white/40">
                    3-sentence bio — shown on your artist page
                  </span>
                  <textarea
                    rows={4}
                    value={aiProfile.bio}
                    onChange={(e) => updateAiProfile("bio", e.target.value)}
                    className="rounded-[1rem] border border-violet-500/20 bg-[#111827] px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-[#00E5FF]/35"
                  />
                </label>

                {/* Vibe */}
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-white">
                    Vibe tag
                  </span>
                  <span className="text-xs text-white/40">
                    How the station filters and plays your track
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {VIBE_OPTIONS.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => updateAiProfile("vibe", v)}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          aiProfile.vibe === v
                            ? "border-[#00e5ff]/50 bg-[#00e5ff]/15 text-[#00e5ff]"
                            : "border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </label>

                {/* Promo blurb */}
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-white">
                    Station promo blurb
                  </span>
                  <span className="text-xs text-white/40">
                    The DJ intro read before your track plays on air
                  </span>
                  <textarea
                    rows={3}
                    value={aiProfile.promoBlurb}
                    onChange={(e) =>
                      updateAiProfile("promoBlurb", e.target.value)
                    }
                    className="rounded-[1rem] border border-violet-500/20 bg-[#111827] px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-[#00E5FF]/35"
                  />
                </label>
              </div>
            ) : null}

            {/* ── Step 5: Success ── */}
            {step === 5 ? (
              <div className="rounded-[1.6rem] border border-emerald-400/20 bg-emerald-400/10 p-6 text-emerald-50">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-200/80">
                  Submission received
                </p>
                <h3 className="mt-3 font-display text-2xl font-semibold text-white">
                  Your release is in the queue.
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-7 text-emerald-100/90">
                  Thanks for sending it through. The FlowSoundz team will review
                  the submission and follow up by email.
                </p>
                {successReference ? (
                  <p className="mt-4 text-sm text-emerald-100">
                    Reference:{" "}
                    <span className="font-mono">{successReference}</span>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Error message */}
          {errorMessage ? (
            <div className="mt-5 rounded-[1.1rem] border border-[#FF2DA6]/18 bg-[#FF2DA6]/10 px-4 py-3 text-sm text-white">
              {errorMessage}
            </div>
          ) : null}

          {/* Footer controls */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/45">
              {isSuccess ? "Done" : `Step ${progressStep} of 4`}
            </p>

            {!isSuccess ? (
              <div className="flex flex-wrap gap-3">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={isGenerating || isSubmitting}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 disabled:opacity-40"
                  >
                    Back
                  </button>
                ) : null}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={() => void goNext()}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_22px_rgba(0,229,255,0.24)] transition hover:shadow-[0_0_28px_rgba(124,77,255,0.26)]"
                  >
                    Continue
                  </button>
                ) : step === 3 ? (
                  <button
                    type="button"
                    onClick={() => void goNext()}
                    disabled={isGenerating}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_22px_rgba(0,229,255,0.24)] transition hover:shadow-[0_0_28px_rgba(124,77,255,0.26)] disabled:opacity-60"
                  >
                    {isGenerating ? (
                      <>
                        <svg
                          className="h-4 w-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeDasharray="40"
                            strokeDashoffset="15"
                          />
                        </svg>
                        Generating AI profile…
                      </>
                    ) : (
                      <>✦ Generate AI Profile</>
                    )}
                  </button>
                ) : step === 4 ? (
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={isSubmitting}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_22px_rgba(0,229,255,0.24)] transition hover:shadow-[0_0_28px_rgba(124,77,255,0.26)] disabled:opacity-60"
                  >
                    {isSubmitting ? "Submitting…" : "Finalize Submission"}
                  </button>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
