"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CreatorHubNav } from "@/components/creator-hub/CreatorHubNav";
import { generateArtistPromoAssets } from "@/lib/creatorHub/generators";
import type { ArtistPromoOutput } from "@/lib/creatorHub/generators";

type FormState = {
  artistName: string;
  email: string;
  songTitle: string;
  genre: string;
  vibe: "Chill" | "Hype" | "Late Night" | "Emotional";
  artistType: string;
  description: string;
  songLink: string;
  streamingLink: string;
  coverArtLink: string;
  socialLink: string;
  aiUsed: "yes" | "no";
  aiTool: string;
  ownsRights: "yes" | "no" | "";
  notes: string;
};

const INITIAL_FORM: FormState = {
  artistName: "",
  email: "",
  songTitle: "",
  genre: "",
  vibe: "Chill",
  artistType: "Independent Artist",
  description: "",
  songLink: "",
  streamingLink: "",
  coverArtLink: "",
  socialLink: "",
  aiUsed: "no",
  aiTool: "",
  ownsRights: "",
  notes: "",
};

const VIBE_OPTIONS = ["Chill", "Hype", "Late Night", "Emotional"] as const;
const ARTIST_TYPES = [
  "Independent Artist",
  "AI-Assisted Artist",
  "Virtual Artist",
  "Producer / Sound Designer",
] as const;

const REQUIRED_CHECKS = [
  {
    id: "rights",
    label:
      "I confirm I own or control the rights to this submission.",
  },
  {
    id: "permissions",
    label:
      "I confirm I have permission from all producers, writers, and featured artists.",
  },
  {
    id: "ai_terms",
    label:
      "I confirm any AI-generated content follows the tool's commercial-use terms.",
  },
  {
    id: "grant_fsr",
    label:
      "I grant FlowSoundz permission to review, stream, display, and promote this submission if approved.",
  },
] as const;

type CheckId = (typeof REQUIRED_CHECKS)[number]["id"];

const INPUT_CLASS =
  "min-h-12 w-full rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#00E5FF]/35";

const TEXTAREA_CLASS =
  "w-full rounded-[1rem] border border-white/8 bg-[#111827] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#00E5FF]/35";

const SELECT_CLASS =
  "min-h-12 w-full rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-white outline-none transition focus:border-[#00E5FF]/35";

export default function SubmitPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [checks, setChecks] = useState<Record<CheckId, boolean>>({
    rights: false,
    permissions: false,
    ai_terms: false,
    grant_fsr: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const allChecked = REQUIRED_CHECKS.every((c) => checks[c.id]);
  const canSubmit =
    form.artistName.trim() &&
    form.email.trim() &&
    form.songTitle.trim() &&
    form.genre.trim() &&
    form.description.trim() &&
    form.songLink.trim() &&
    form.ownsRights === "yes" &&
    allChecked;

  async function handleSubmit() {
    if (!canSubmit) {
      setError(
        "Please fill in all required fields and confirm all checkboxes.",
      );
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      let promo: ArtistPromoOutput;

      // Try server-side AI first
      try {
        const res = await fetch("/api/artist/generate-promo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            artistName: form.artistName,
            songTitle: form.songTitle,
            genre: form.genre,
            vibe: form.vibe,
            artistType: form.artistType,
            description: form.description,
            aiUsed: form.aiUsed === "yes",
            aiTool: form.aiTool,
          }),
        });

        if (res.ok) {
          promo = (await res.json()) as ArtistPromoOutput;
        } else {
          throw new Error("Server fallback");
        }
      } catch {
        // Fall back to client-side generator
        promo = generateArtistPromoAssets({
          artistName: form.artistName,
          songTitle: form.songTitle,
          genre: form.genre,
          vibe: form.vibe,
          artistType: form.artistType,
          description: form.description,
          aiUsed: form.aiUsed === "yes",
          aiTool: form.aiTool,
        });
      }

      // Store in sessionStorage for the confirmation page
      sessionStorage.setItem(
        "fsz-hub-submission",
        JSON.stringify({
          form,
          promo,
          submittedAt: new Date().toISOString(),
        }),
      );

      router.push("/artist/confirmation");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell eyebrow="Creator Hub" title="Submit to FlowSoundz Radio">
      <CreatorHubNav />

      {/* ── Intro ── */}
      <div className="mb-8 glass-card rounded-[1.8rem] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
          Step 5
        </p>
        <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">
          Submit Your Track for Review
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
          Submit your track for curation. If approved, your song may be added to FlowSoundz Radio
          rotation and promoted through artist discovery content. Submissions are reviewed
          manually — approval is not guaranteed.
        </p>
      </div>

      {/* ── Form ── */}
      <div className="mb-10 glass-card rounded-[1.8rem] p-6 sm:p-8">
        <div className="grid gap-5">

          {/* Row 1: Artist + Email */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">
                Artist name <span className="text-[#ff2da6]">*</span>
              </span>
              <input
                type="text"
                value={form.artistName}
                onChange={(e) => update("artistName", e.target.value)}
                placeholder="Your artist or group name"
                className={INPUT_CLASS}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">
                Email <span className="text-[#ff2da6]">*</span>
              </span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="artist@email.com"
                className={INPUT_CLASS}
              />
            </label>
          </div>

          {/* Row 2: Song + Genre */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">
                Song title <span className="text-[#ff2da6]">*</span>
              </span>
              <input
                type="text"
                value={form.songTitle}
                onChange={(e) => update("songTitle", e.target.value)}
                placeholder="Track name"
                className={INPUT_CLASS}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">
                Genre <span className="text-[#ff2da6]">*</span>
              </span>
              <input
                type="text"
                value={form.genre}
                onChange={(e) => update("genre", e.target.value)}
                placeholder="Afrobeats, Alt-R&B, Electronic…"
                className={INPUT_CLASS}
              />
            </label>
          </div>

          {/* Vibe */}
          <div className="grid gap-2">
            <span className="text-sm font-medium text-white">Station vibe</span>
            <div className="flex flex-wrap gap-2">
              {VIBE_OPTIONS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => update("vibe", v)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    form.vibe === v
                      ? "border-[#00e5ff]/50 bg-[#00e5ff]/15 text-[#00e5ff]"
                      : "border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Artist Type */}
          <label className="grid gap-2">
            <span className="text-sm font-medium text-white">Artist type</span>
            <select
              value={form.artistType}
              onChange={(e) => update("artistType", e.target.value)}
              className={SELECT_CLASS}
            >
              {ARTIST_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          {/* Description */}
          <label className="grid gap-2">
            <span className="text-sm font-medium text-white">
              Short artist description <span className="text-[#ff2da6]">*</span>
            </span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Who are you, what is this track about, what makes your sound different?"
              className={TEXTAREA_CLASS}
            />
          </label>

          {/* Song + Streaming Links */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">
                Song link <span className="text-[#ff2da6]">*</span>
              </span>
              <input
                type="url"
                value={form.songLink}
                onChange={(e) => update("songLink", e.target.value)}
                placeholder="SoundCloud, Dropbox, Google Drive, etc."
                className={INPUT_CLASS}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white text-white/80">
                Streaming link{" "}
                <span className="font-normal text-white/40">(optional)</span>
              </span>
              <input
                type="url"
                value={form.streamingLink}
                onChange={(e) => update("streamingLink", e.target.value)}
                placeholder="Spotify, Apple Music, etc."
                className={INPUT_CLASS}
              />
            </label>
          </div>

          {/* Cover + Social */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white/80">
                Cover art link{" "}
                <span className="font-normal text-white/40">(optional)</span>
              </span>
              <input
                type="url"
                value={form.coverArtLink}
                onChange={(e) => update("coverArtLink", e.target.value)}
                placeholder="Image URL or file share link"
                className={INPUT_CLASS}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white/80">
                Social media{" "}
                <span className="font-normal text-white/40">(optional)</span>
              </span>
              <input
                type="url"
                value={form.socialLink}
                onChange={(e) => update("socialLink", e.target.value)}
                placeholder="Instagram, TikTok, Twitter…"
                className={INPUT_CLASS}
              />
            </label>
          </div>

          {/* AI Use */}
          <div className="grid gap-3">
            <span className="text-sm font-medium text-white">
              Was AI used in the creation of this track?
            </span>
            <div className="flex gap-3">
              {(["yes", "no"] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => update("aiUsed", val)}
                  className={`rounded-full border px-5 py-2 text-sm font-semibold capitalize transition ${
                    form.aiUsed === val
                      ? "border-[#7c4dff]/50 bg-[#7c4dff]/15 text-[#7c4dff]"
                      : "border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
            {form.aiUsed === "yes" && (
              <label className="grid gap-2">
                <span className="text-sm font-medium text-white/80">
                  Which AI tool was used?
                </span>
                <input
                  type="text"
                  value={form.aiTool}
                  onChange={(e) => update("aiTool", e.target.value)}
                  placeholder="Suno, Udio, ChatGPT for lyrics, etc."
                  className={INPUT_CLASS}
                />
              </label>
            )}
          </div>

          {/* Owns Rights */}
          <div className="grid gap-3">
            <span className="text-sm font-medium text-white">
              Do you own or control the rights to this submission?{" "}
              <span className="text-[#ff2da6]">*</span>
            </span>
            <div className="flex gap-3">
              {(["yes", "no"] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => update("ownsRights", val)}
                  className={`rounded-full border px-5 py-2 text-sm font-semibold capitalize transition ${
                    form.ownsRights === val
                      ? val === "yes"
                        ? "border-[#00e5ff]/50 bg-[#00e5ff]/15 text-[#00e5ff]"
                        : "border-[#ff2da6]/50 bg-[#ff2da6]/15 text-[#ff2da6]"
                      : "border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
            {form.ownsRights === "no" && (
              <p className="text-xs text-[#ff2da6]">
                You cannot submit music you do not own or control. Please review
                the{" "}
                <a
                  href="/artist/rights"
                  className="underline hover:opacity-80"
                >
                  rights checklist
                </a>{" "}
                before submitting.
              </p>
            )}
          </div>

          {/* Notes */}
          <label className="grid gap-2">
            <span className="text-sm font-medium text-white/80">
              Additional notes{" "}
              <span className="font-normal text-white/40">(optional)</span>
            </span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Rollout plans, collaborators, context, or anything the FlowSoundz team should know."
              className={TEXTAREA_CLASS}
            />
          </label>
        </div>
      </div>

      {/* ── Required Checkboxes ── */}
      <div className="mb-8 glass-card rounded-[1.8rem] p-6 sm:p-8">
        <h2 className="text-base font-semibold text-white">
          Required Confirmations
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          You must check all four before submitting.
        </p>
        <ul className="mt-4 space-y-4">
          {REQUIRED_CHECKS.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={checks[item.id]}
                  onChange={(e) =>
                    setChecks((prev) => ({
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
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mb-6 rounded-[1.1rem] border border-[#FF2DA6]/20 bg-[#FF2DA6]/10 px-4 py-3 text-sm text-white">
          {error}
        </div>
      )}

      {/* ── Submit ── */}
      <div className="mb-10 flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={isSubmitting || !canSubmit}
          onClick={() => void handleSubmit()}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-8 py-3 text-sm font-bold text-white shadow-[0_0_22px_rgba(0,229,255,0.24)] transition hover:shadow-[0_0_36px_rgba(0,229,255,0.44)] disabled:opacity-40"
        >
          {isSubmitting ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="3"
                  strokeDasharray="40" strokeDashoffset="15"
                />
              </svg>
              Generating AI assets…
            </>
          ) : (
            "✦ Submit & Generate Promo Assets"
          )}
        </button>
        <p className="text-xs text-slate-500">
          Fields marked <span className="text-[#ff2da6]">*</span> are required.
        </p>
      </div>
    </AppShell>
  );
}
