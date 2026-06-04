"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CreatorHubShell } from "@/components/creator-hub/CreatorHubShell";
import { track } from "@/lib/analytics";
import { generateArtistPromoAssets } from "@/lib/creatorHub/generators";
import type { ArtistPromoOutput } from "@/lib/creatorHub/generators";

type SubmitResponse = ArtistPromoOutput & {
  submission_id?: string;
};

type FormState = {
  artistName: string;
  contactName: string;
  email: string;
  songTitle: string;
  genre: string;
  vibe: "Chill" | "Hype" | "Late Night" | "Emotional" | "Unsure";
  artistType: string;
  description: string;
  songLink: string;
  versionType: "Explicit" | "Clean";
  producerCredit: string;
  streamingLink: string;
  coverArtLink: string;
  socialLink: string;
  aiUsed: "yes" | "no";
  aiTool: string;
  notes: string;
};

const INITIAL_FORM: FormState = {
  artistName: "",
  contactName: "",
  email: "",
  songTitle: "",
  genre: "",
  vibe: "Chill",
  artistType: "Independent Artist",
  description: "",
  songLink: "",
  versionType: "Clean",
  producerCredit: "",
  streamingLink: "",
  coverArtLink: "",
  socialLink: "",
  aiUsed: "no",
  aiTool: "",
  notes: "",
};

const VIBE_OPTIONS = ["Chill", "Hype", "Late Night", "Emotional", "Unsure"] as const;
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
      "I confirm that I own or control the rights to this recording.",
  },
  {
    id: "samples",
    label:
      "I confirm that this song does not contain uncleared samples, or I have permission for all samples used.",
  },
  {
    id: "grant_fsr",
    label:
      "I grant FlowSoundz Radio permission to stream, display, and promote this submitted track on the FlowSoundz Radio platform and social channels.",
  },
  {
    id: "removal",
    label:
      "I understand that approval is not guaranteed and I can request removal by contacting FlowSoundz Radio.",
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
  const startedRef = useRef(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [checks, setChecks] = useState<Record<CheckId, boolean>>({
    rights: false,
    samples: false,
    grant_fsr: false,
    removal: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    track("artist_submission_started", { source: "artist_submit_page" });
  }, []);

  const allChecked = REQUIRED_CHECKS.every((c) => checks[c.id]);
  const canSubmit =
    form.artistName.trim() &&
    form.contactName.trim() &&
    form.email.trim() &&
    form.songTitle.trim() &&
    form.genre.trim() &&
    form.description.trim() &&
    form.songLink.trim() &&
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
      let submissionId: string | null = null;

      // Submit to server: AI generation + email notification
      try {
        const res = await fetch("/api/artist/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            artistName: form.artistName,
            contactName: form.contactName,
            email: form.email,
            songTitle: form.songTitle,
            genre: form.genre,
            vibe: form.vibe,
            artistType: form.artistType,
            description: form.description,
            songLink: form.songLink,
            versionType: form.versionType,
            producerCredit: form.producerCredit,
            streamingLink: form.streamingLink,
            coverArtLink: form.coverArtLink,
            socialLink: form.socialLink,
            aiUsed: form.aiUsed === "yes",
            aiTool: form.aiTool,
            rightsConfirmed: checks.rights,
            samplesConfirmed: checks.samples,
            promotionPermissionConfirmed: checks.grant_fsr,
            removalPolicyConfirmed: checks.removal,
            notes: form.notes,
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as SubmitResponse;
          promo = {
            bio: data.bio,
            suggestedVibe: data.suggestedVibe,
            promoBlurb: data.promoBlurb,
            radioIntro: data.radioIntro,
            socialCaptions: data.socialCaptions,
          };
          submissionId = data.submission_id ?? null;
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
          submissionId,
          submittedAt: new Date().toISOString(),
        }),
      );

      track("artist_submission_completed", {
        source: "artist_submit_page",
        vibe: form.vibe,
        genre: form.genre,
        aiUsed: form.aiUsed === "yes",
      });

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
    <CreatorHubShell eyebrow="Creator Hub" title="Submit to FlowSoundz Radio">

      {/* ── Intro ── */}
      <div className="mb-8 glass-card rounded-[1.8rem] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
          Step 5
        </p>
        <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">
          Submit Your Track for Review
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
          Your song deserves more than a link. Submit here and FlowSoundz Radio will
          review your track for curated rotation — the kind of discovery moment that
          reaches listeners who are actively looking for what&apos;s next.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.2rem] border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/80">What you get</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-400">✓</span> Manual review by the FlowSoundz curation team</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-400">✓</span> AI-generated bio, vibe tag, promo blurb, and radio intro (all editable)</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-400">✓</span> If approved: rotation on FlowSoundz Radio + artist discovery listing</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-400">✓</span> Email notification if your track is accepted</li>
            </ul>
          </div>
          <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.025] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">What&apos;s not guaranteed</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2"><span className="mt-0.5 text-white/30">—</span> Approval is not automatic — every track is reviewed</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-white/30">—</span> No specific play count, stream guarantee, or chart placement</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-white/30">—</span> AI assets are a starting point — review and edit before use</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-[0.9rem] border border-[#7c4dff]/20 bg-[#7c4dff]/[0.07] px-4 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a78bfa]">AI Disclosure</span>
          <span className="text-xs text-slate-400">After submission, AI-assisted promo assets are generated for your track. These are suggestions only — you review and edit them before they go anywhere.</span>
        </div>
      </div>

      {/* ── Form ── */}
      <div className="mb-10 glass-card rounded-[1.8rem] p-6 sm:p-8">
        <div className="grid gap-5">

          {/* Row 1: Artist + Contact */}
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
                Legal name or contact name <span className="text-[#ff2da6]">*</span>
              </span>
              <input
                type="text"
                value={form.contactName}
                onChange={(e) => update("contactName", e.target.value)}
                placeholder="Who we should contact about this submission"
                className={INPUT_CLASS}
              />
            </label>
          </div>

          {/* Row 2: Email + Song */}
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          {/* Row 3: Genre + version */}
          <div className="grid gap-4 sm:grid-cols-2">
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
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">
                Track version <span className="text-[#ff2da6]">*</span>
              </span>
              <select
                value={form.versionType}
                onChange={(e) =>
                  update("versionType", e.target.value as FormState["versionType"])
                }
                className={SELECT_CLASS}
              >
                <option value="Clean">Clean</option>
                <option value="Explicit">Explicit</option>
              </select>
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

          <label className="grid gap-2">
            <span className="text-sm font-medium text-white/80">
              Producer credit{" "}
              <span className="font-normal text-white/40">(optional)</span>
            </span>
            <input
              type="text"
              value={form.producerCredit}
              onChange={(e) => update("producerCredit", e.target.value)}
              placeholder="Producer, co-producer, or beat credit"
              className={INPUT_CLASS}
            />
          </label>

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

          {/* Song + Platform Links */}
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
                Spotify / Apple / YouTube / SoundCloud{" "}
                <span className="font-normal text-white/40">(optional)</span>
              </span>
              <input
                type="url"
                value={form.streamingLink}
                onChange={(e) => update("streamingLink", e.target.value)}
                placeholder="Public platform link if already released"
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
          Please review these carefully. They make the submission process clear without promising placement.
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
    </CreatorHubShell>
  );
}
