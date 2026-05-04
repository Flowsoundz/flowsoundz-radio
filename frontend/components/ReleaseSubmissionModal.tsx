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
  releaseDate: string;
  email: string;
  notes: string;
  audioFile: File | null;
  coverArt: File | null;
};

const INITIAL_FORM: ReleaseFormState = {
  artistName: "",
  trackTitle: "",
  genre: "",
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
  const [form, setForm] = useState(INITIAL_FORM);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReference, setSuccessReference] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
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
      default:
        return "Submission sent";
    }
  }, [step]);

  function updateField<Key extends keyof ReleaseFormState>(
    field: Key,
    value: ReleaseFormState[Key],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function validateCurrentStep() {
    if (step === 1) {
      if (
        !form.artistName.trim() ||
        !form.trackTitle.trim() ||
        !form.genre.trim() ||
        !form.releaseDate
      ) {
        setErrorMessage("Complete all release details before continuing.");
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
      setErrorMessage("Add a contact email before submitting.");
      return false;
    }

    setErrorMessage("");
    return true;
  }

  function goNext() {
    if (!validateCurrentStep()) {
      return;
    }
    setStep((current) => current + 1);
  }

  function goBack() {
    setErrorMessage("");
    setStep((current) => Math.max(1, current - 1));
  }

  async function handleSubmit() {
    if (!validateCurrentStep()) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = new FormData();
      payload.set("artist_name", form.artistName);
      payload.set("track_title", form.trackTitle);
      payload.set("genre", form.genre);
      payload.set("release_date", form.releaseDate);
      payload.set("email", form.email);
      payload.set("notes", form.notes);

      if (form.audioFile) {
        payload.set("audio_file", form.audioFile);
      }

      if (form.coverArt) {
        payload.set("cover_art", form.coverArt);
      }

      const response = await submitReleaseSubmission(payload);
      setSuccessReference(response.submission.submission_id);
      setStep(4);
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

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Submit your release"
    >
      <div className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0B1020] shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
        <div className="absolute -left-10 top-8 h-36 w-36 rounded-full bg-[#00E5FF]/10 blur-3xl" />
        <div className="absolute right-0 top-10 h-40 w-40 rounded-full bg-[#8B5CF6]/14 blur-3xl" />

        <div className="relative p-6 md:p-8">
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
              aria-label="Close release submission modal"
            >
              ×
            </button>
          </div>

          {step < 4 ? (
            <div className="mt-6 flex items-center gap-2">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className={`h-1.5 flex-1 rounded-full ${
                    item <= step
                      ? "bg-[linear-gradient(90deg,#00e5ff_0%,#7c4dff_100%)]"
                      : "bg-white/10"
                  }`}
                />
              ))}
            </div>
          ) : null}

          <div className="mt-6">
            {step === 1 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-white">
                    Artist name
                  </span>
                  <input
                    type="text"
                    value={form.artistName}
                    onChange={(event) =>
                      updateField("artistName", event.target.value)
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
                    onChange={(event) =>
                      updateField("trackTitle", event.target.value)
                    }
                    className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#00E5FF]/35"
                    placeholder="Track name"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-white">Genre</span>
                  <input
                    type="text"
                    value={form.genre}
                    onChange={(event) => updateField("genre", event.target.value)}
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
                    onChange={(event) =>
                      updateField("releaseDate", event.target.value)
                    }
                    className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-white outline-none transition focus:border-[#00E5FF]/35"
                  />
                </label>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 rounded-[1.4rem] border border-dashed border-white/12 bg-white/[0.03] p-4">
                  <span className="text-sm font-medium text-white">
                    Audio file
                  </span>
                  <input
                    type="file"
                    accept=".mp3,.wav,audio/mpeg,audio/wav"
                    onChange={(event) =>
                      updateField("audioFile", event.target.files?.[0] ?? null)
                    }
                    className="text-sm text-white/70 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                  <p className="text-xs text-white/45">
                    Upload MP3 or WAV.
                  </p>
                  {form.audioFile ? (
                    <p className="text-sm text-cyan-200">{form.audioFile.name}</p>
                  ) : null}
                </label>
                <label className="grid gap-2 rounded-[1.4rem] border border-dashed border-white/12 bg-white/[0.03] p-4">
                  <span className="text-sm font-medium text-white">
                    Cover art
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) =>
                      updateField("coverArt", event.target.files?.[0] ?? null)
                    }
                    className="text-sm text-white/70 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                  <p className="text-xs text-white/45">
                    Upload PNG, JPG, or WEBP.
                  </p>
                  {form.coverArt ? (
                    <p className="text-sm text-cyan-200">{form.coverArt.name}</p>
                  ) : null}
                </label>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-white">
                    Contact email
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#00E5FF]/35"
                    placeholder="artist@email.com"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-white">Notes</span>
                  <textarea
                    rows={5}
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    className="rounded-[1rem] border border-white/8 bg-[#111827] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#00E5FF]/35"
                    placeholder="Release context, rollout plans, collaborators, references, and anything the FlowSoundz team should know."
                  />
                </label>
              </div>
            ) : null}

            {step === 4 ? (
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
                    Reference: {successReference}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-[1.1rem] border border-[#FF2DA6]/18 bg-[#FF2DA6]/10 px-4 py-3 text-sm text-white">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/45">
              Step {Math.min(step, 3)} of 3
            </p>

            {step < 4 ? (
              <div className="flex flex-wrap gap-3">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
                  >
                    Back
                  </button>
                ) : null}
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_22px_rgba(0,229,255,0.24)] transition hover:shadow-[0_0_28px_rgba(124,77,255,0.26)]"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleSubmit()}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_22px_rgba(0,229,255,0.24)] transition hover:shadow-[0_0_28px_rgba(124,77,255,0.26)] disabled:opacity-60"
                  >
                    {isSubmitting ? "Submitting..." : "Submit release"}
                  </button>
                )}
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
